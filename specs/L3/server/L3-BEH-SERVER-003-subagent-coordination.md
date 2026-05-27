---
artifact_id: L3-BEH-SERVER-003
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-SERVER-003 — Subagent Spawn, Lifecycle, and Coordination

## Purpose

Define the concrete behavior for spawning subagents as child sessions, managing the agent tree, handling inter-agent communication via mailboxes, tracking agent status, and persisting spawn relationships.

## Source Design

L2-DES-AGENT-003 (Subagent Architecture), L2-DES-AGENT-001 (Execution Engine), L2-DES-TOOL-001 (Built-In Tool System)

## Behavior Specification

### B1. Spawn Agent Lifecycle

- **Trigger**: Model calls the `spawn_agent` tool.
- **Preconditions**: `multi_agent` feature is enabled. The parent session has capacity (under `agent_max_sub_agents`).
- **Algorithm / Flow**:
  1. Validate: check concurrent agent limit. If at capacity → error `AgentLimitReached`.
  2. Validate: check spawn depth (`agent_max_depth`). If exceeding → error `MaxDepthReached`.
  3. Validate `task_name`: lowercase, digits, underscores only. Must be unique within the parent's subtree. If path exists → error.
  4. Reserve a slot in the `AgentRegistry` (increment active count).
  5. Compute child `AgentPath` = `<parent_path>/<task_name>`. Assign nickname from the role's pool.
  6. Build child config: inherit parent's effective config (permission profile, approval policy, shell env, exec policy, cwd). Apply role config layer. Apply depth-dependent overrides (disable `multi_agent` at max depth).
  7. Create child session: `SessionSource::SubAgent { parent_session_id, depth, agent_path, agent_nickname, agent_role }`. Fork history if `fork_turns` is not `"none"`.
  8. Deliver initial task message to child's mailbox with `trigger_turn: true`.
  9. Persist spawn edge: `(parent_session_id, child_session_id, status: Open)`.
  10. Spawn detached completion watcher task.
  11. Commit the reservation. Return agent path and nickname.
- **Postconditions**: Child session exists. Child receives initial task and starts a turn. Parent's environment context includes the child.

### B2. Agent Registry and Tree

- **Trigger**: Server starts, subagent spawns, subagent completes.
- **Preconditions**: The `AgentRegistry` is initialized per root session.
- **Algorithm / Flow**:
  1. The registry stores: `HashMap<SessionId, AgentMetadata>` (session_id → path, nickname, role, status, last_task_message).
  2. The tree is reconstructed from persisted spawn edges on session load.
  3. `list_agents` tool: traverse registry, filter by `path_prefix`, return `{ agent_path, agent_nickname, status, last_task_message }` for each.
  4. Resolve relative agent paths: `..` = parent, `.` = self, `name` = direct child, `name/sub` = descendant.
- **Postconditions**: The agent tree is navigable. Agents can address each other by path.

### B3. Inter-Agent Mailbox

- **Trigger**: Agent sends `send_message` or `followup_task`, or a completion watcher delivers a notification.
- **Preconditions**: The target agent exists and has a mailbox.
- **Algorithm / Flow**:
  1. Resolve target `AgentPath` to `SessionId` via registry.
  2. Construct `InterAgentCommunication`: `author` (sender path), `recipient` (target path), `other_recipients`, `content`, `trigger_turn`.
  3. Push to the target's mailbox `tx` (unbounded channel — non-blocking send).
  4. Increment the target's `next_seq` (AtomicU64). Send the new sequence number through the `seq_tx` watch channel.
  5. If `trigger_turn` is true and the target agent is idle: submit a new turn on the target session with the message as input.
- **Postconditions**: The message is in the target's mailbox. If trigger_turn, a new turn starts on the target.

### B4. Wait Agent

- **Trigger**: Model calls `wait_agent` tool.
- **Preconditions**: The agent has a mailbox receiver.
- **Algorithm / Flow**:
  1. Check `pending_mails` (VecDeque). If non-empty: drain and return immediately with "Wait completed" + messages.
  2. If empty: subscribe to `seq_tx` watch channel. Wait with a deadline (timeout_ms, clamped to `[min_wait_timeout_ms, max_wait_timeout_ms]`, default 30000ms).
  3. If `seq_tx` changes before deadline: drain new messages, return "Wait completed".
  4. If deadline passes with no change: return "Wait timed out", `timed_out: true`.
- **Postconditions**: The model is informed whether new mail arrived. Timed-out waits do not error the turn.

### B5. Agent Status Lifecycle

- **Trigger**: Child session turn starts, completes, fails, is interrupted, or the session is closed.
- **Preconditions**: The agent is registered.
- **Algorithm / Flow**:
  1. Status transitions:
     - Session created → `PendingInit`
     - First turn starts → `Running`
     - Turn interrupted → `Interrupted` (may return to `Running` on new input)
     - Turn completed, session idle → `Running` (still alive, may receive more tasks)
     - Session ends naturally → `Completed(Option<String>)`
     - Fatal error → `Errored(String)`
     - `close_agent` called → `Shutdown`
  2. Update registry status on each transition. Emit via the status watch channel.
  3. Completion watcher detects terminal status (`Completed`, `Errored`, `Shutdown`) and delivers notification to parent (see B6).

### B6. Completion Notification

- **Trigger**: Child agent reaches terminal status.
- **Preconditions**: A completion watcher task is monitoring the child.
- **Algorithm / Flow**:
  1. Watcher subscribes to child's `AgentStatus` watch channel.
  2. On terminal status or channel close:
     a. Format notification: `<subagent_notification>\n{"agent_path": "<path>", "status": "<completed|errored|shutdown>"}\n</subagent_notification>`
     b. Deliver as `InterAgentCommunication` to parent's mailbox with `trigger_turn: false`.
     c. Inject the notification into parent's conversation transcript as a structured marker.
  3. The watcher task exits.
- **Postconditions**: Parent is informed of child completion. The notification is visible in the parent's transcript.

### B7. Close Agent

- **Trigger**: Model calls `close_agent` tool, or parent session ends.
- **Preconditions**: The target agent exists.
- **Algorithm / Flow**:
  1. Resolve target to `SessionId` via registry.
  2. Persist spawn edge status as `Closed`.
  3. Recursively find all live descendants in the spawn tree.
  4. For each descendant (bottom-up): shut down its session, mark its spawn edge `Closed`.
  5. Shut down the target session.
  6. Remove agents from the registry. Decrement active count.
- **Postconditions**: Target and all its descendants are shut down. Spawn edges are marked closed. Slot capacity is freed.

### B8. Session Resumption with Subagents

- **Trigger**: Root session is loaded after server restart.
- **Preconditions**: Spawn edges are persisted. Child sessions exist in storage.
- **Algorithm / Flow**:
  1. Load root session.
  2. Query all spawn edges where `parent_session_id` is in the tree and `status` is `Open`.
  3. For each open edge: load the child session. Register it in the `AgentRegistry`.
  4. Rebuild the agent tree from paths. Re-establish mailboxes.
  5. For children with status `Running` or `PendingInit`: re-attach completion watchers.
  6. Resume is recursive: child's descendants are also discovered and loaded.
- **Postconditions**: The agent tree is fully reconstructed. Active subagents resume where they left off.

### B9. Durable Spawn and Mailbox Records

- **Trigger**: Subagent spawn, mailbox delivery, status change, completion notification, close, or resume.
- **Preconditions**: The root session store and agent graph projection are available.
- **Algorithm / Flow**:
  1. Persist every spawn relationship as an append-only `subagent_spawned` record before the child turn is triggered.
  2. Persist every explicit close as `subagent_closed` before terminating child sessions.
  3. Persist every inter-agent message as `subagent_mail_recorded` before it can trigger a child turn.
  4. Persist status changes that affect user-visible state as `subagent_status_changed`.
  5. Persist completion notifications as `subagent_notification_recorded` before injecting the notification marker into the parent transcript.
  6. Apply records to the in-memory `AgentRegistry` only after the record has been accepted by the durable store.
- **Postconditions**: Replay can reconstruct the agent tree, queued mailbox messages, status, and completion notifications without relying on detached runtime tasks.

Durable record schemas:

| Record | Required Fields | Purpose |
|---|---|---|
| `subagent_spawned` | `schema_version`, `root_session_id`, `parent_session_id`, `child_session_id`, `agent_path`, `agent_nickname`, `agent_role`, `task_name`, `initial_message_digest`, `fork_mode`, `depth`, `created_at` | Creates an open parent-child edge and durable identity. |
| `subagent_closed` | `schema_version`, `root_session_id`, `child_session_id`, `agent_path`, `closed_by_session_id`, `reason`, `closed_at` | Marks an edge closed and records shutdown provenance. |
| `subagent_mail_recorded` | `schema_version`, `root_session_id`, `message_id`, `author_path`, `recipient_path`, `other_recipients`, `content`, `trigger_turn`, `sequence`, `created_at` | Rebuilds mailbox ordering and pending messages. |
| `subagent_status_changed` | `schema_version`, `root_session_id`, `child_session_id`, `agent_path`, `previous_status`, `new_status`, `reason`, `changed_at` | Rebuilds visible agent status. |
| `subagent_notification_recorded` | `schema_version`, `root_session_id`, `parent_session_id`, `child_session_id`, `agent_path`, `status`, `summary`, `created_at` | Records the completion notification delivered to the parent. |

The implementation may maintain a SQLite agent graph projection for indexed lookup, but the projection must be rebuildable from durable records and child session metadata.

### B10. Client Events

- **Trigger**: A durable subagent record is appended or a runtime subagent state changes.
- **Preconditions**: One or more clients are subscribed to the root session or child session.
- **Algorithm / Flow**:
  1. Emit `subagent.spawned` after `subagent_spawned` is durable.
  2. Emit `subagent.statusChanged` after user-visible status changes.
  3. Emit `subagent.mailRecorded` only as a safe summary: message id, author, recipient, trigger flag, and digest. Do not broadcast full message content unless the recipient session is visible to the client and content is safe for transcript display.
  4. Emit `subagent.notification` after completion notification is durable and before or alongside the parent transcript marker event.
  5. Emit `subagent.closed` after close records are durable.
  6. Include `event_sequence`, `root_session_id`, and affected `session_id` in every event so reconnecting clients can catch up in order.
- **Postconditions**: Clients can render delegated work, status, final results, and failures consistently across live and replayed sessions.

Representative event payload fields:

| Event | Payload Fields |
|---|---|
| `subagent.spawned` | `root_session_id`, `parent_session_id`, `child_session_id`, `agent_path`, `agent_nickname`, `agent_role`, `task_name`, `depth`, `status` |
| `subagent.statusChanged` | `root_session_id`, `child_session_id`, `agent_path`, `previous_status`, `new_status`, `reason` |
| `subagent.notification` | `root_session_id`, `parent_session_id`, `child_session_id`, `agent_path`, `status`, `summary` |
| `subagent.closed` | `root_session_id`, `child_session_id`, `agent_path`, `reason` |

### B11. Replay Rules

- **Trigger**: Root session or child session is opened after restart.
- **Preconditions**: Durable session records and child session files are readable.
- **Algorithm / Flow**:
  1. Replay root session records in sequence.
  2. Apply `subagent_spawned` records to create open edges and metadata.
  3. Apply `subagent_closed` records to mark edges closed.
  4. Apply `subagent_mail_recorded` records to rebuild mailbox queues by recipient and sequence.
  5. Apply `subagent_status_changed` records to rebuild status.
  6. Load every child session referenced by an open edge. If the child session file is missing, keep the edge but mark status `Errored("child session missing")` and emit a diagnostic.
  7. Reattach completion watchers only after replay has rebuilt the registry and only for open children that are not terminal.
  8. Do not re-deliver already-recorded completion notifications.
- **Postconditions**: Resuming a root session reconstructs the same agent tree projection that existed before shutdown, subject to explicit missing-child diagnostics.

### B12. Required Tests

- Spawn writes `subagent_spawned` before triggering the child turn.
- Spawn reservation is released if child session creation fails after capacity is reserved.
- Two concurrent spawns with the same path produce one success and one path conflict.
- `send_message` persists `subagent_mail_recorded` without triggering a turn.
- `followup_task` persists `subagent_mail_recorded` before triggering the child turn.
- Completion watcher writes `subagent_notification_recorded` exactly once.
- Closing an agent recursively closes descendants and preserves child transcripts.
- Replay reconstructs open and closed spawn edges, mailbox ordering, and latest status.
- Replay handles a missing child session by preserving the parent projection and surfacing an error status.
- Client events are ordered by durable event sequence and do not expose unsafe message content.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-AGENT-003 | specified-by |
| L2-DES-AGENT-001 | specified-by |
| L2-DES-TOOL-001 | specified-by |
| L2-DES-CONV-001 | specified-by |
| L2-DES-APP-003 | specified-by |

## Implementation Notes

- The `AgentRegistry` is per root session, stored behind `Arc<RwLock<>>`.
- Mailbox channels use `tokio::sync::watch` for sequence notification and `tokio::sync::mpsc::unbounded_channel` for messages.
- Completion watchers are `tokio::task::spawn`ed detached tasks that hold a weak reference to the registry to avoid leaks.
- Spawn edges may be projected into an agent graph store such as SQLite for lookup, but durable record replay must be sufficient to rebuild that projection.

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-25 | Assistant | Initial | Initial subagent spawn, lifecycle, mailbox, and resumption behavior. |
| 2 | 2026-05-27 | Assistant | Correction | Added durable subagent records, client events, replay rules, and required tests. |
