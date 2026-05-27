---
artifact_id: L3-BEH-CORE-007
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-CORE-007 — Persistent Memory Extraction and Consolidation

## Purpose

Define the concrete behavior for the server-owned persistent memory subsystem: startup-time candidate selection, Phase 1 session extraction, Phase 2 filesystem consolidation, job leases, read-path injection, ad-hoc memory notes, safety controls, and recovery.

## Source Design

L2-DES-MEM-001 (Persistent Memory Architecture), L2-DES-CONV-001 (Session JSONL Data Model), L2-DES-APP-002 (Configuration Precedence), L2-DES-LLM-003 (Model Usage Observability), L2-DES-SAFETY-001 (Permission System), L2-DES-SAFETY-002 (Approval Mechanism), L2-DES-AGENT-003 (Subagent Architecture)

## Design Corrections From Earlier Drafts

Persistent memory is not a client-managed database and is not a direct raw-file append pipeline.

- The client-server protocol does not expose memory list, edit, delete, export, or entry-change subscription methods.
- Phase 1 extraction writes structured rows to the local state database, not per-session raw JSON files.
- Phase 2 syncs selected Phase 1 rows into a git-backed memory workspace (`raw_memories.md`, `rollout_summaries/`, and related files) before running the consolidation agent.
- Ad-hoc memory requests write small note files under `extensions/ad_hoc/notes/`; the assistant must not directly edit `MEMORY.md`, `memory_summary.md`, or consolidated skill files in response to a normal user chat request.
- SQLite or another local state database is operational state and query projection; the memory filesystem remains the model-readable output, and session JSONL remains the source transcript input.

## Persistent Stores

### Memory Workspace

The memory workspace root is `~/.devo/memories/` unless configuration changes the user data directory.

Required paths:

| Path | Producer | Consumer | Notes |
|---|---|---|---|
| `memory_summary.md` | Phase 2 consolidation agent | Read path | Embedded in developer instructions when memory is used. |
| `MEMORY.md` | Phase 2 consolidation agent | Agent memory search/read flow | Searchable registry and routing layer. |
| `raw_memories.md` | Phase 2 sync step | Phase 2 consolidation agent | Materialized input from selected `stage1_outputs`. |
| `phase2_workspace_diff.md` | Phase 2 sync step | Phase 2 consolidation agent | Temporary diff evidence for incremental consolidation. |
| `rollout_summaries/<stem>.md` | Phase 2 sync step | Phase 2 consolidation agent and future agents | One summary file per selected session. |
| `skills/<name>/SKILL.md` | Phase 2 consolidation agent | Agent read path | Optional reusable procedures. |
| `extensions/ad_hoc/notes/<timestamp>-<slug>.md` | Explicit user memory request | Phase 2 consolidation agent | User-requested memory changes waiting for consolidation. |

The workspace is git-initialized by Phase 2. Git history is an audit and rollback aid for memory files; it is not the source of truth for session transcripts.

### Local State Database

The local state database stores job coordination and Phase 1 outputs.

`stage1_outputs` conceptual schema:

| Column | Type | Required | Purpose |
|---|---|---|---|
| `session_id` | SessionId | yes | Source session. |
| `source_rollout_path` | String | yes | Durable session JSONL path used for extraction. |
| `source_updated_at` | Timestamp | yes | Last source session timestamp considered. |
| `raw_memory` | String | yes | Detailed markdown extract. Empty means no memory output. |
| `rollout_summary` | String | yes | Compact one-line summary. Empty means no memory output. |
| `rollout_slug` | String? | no | Filename-safe slug. |
| `redaction_state` | String | yes | `clean`, `redacted`, or `blocked`. |
| `usage_count` | u64 | yes | Number of read-path usages. |
| `last_usage_at` | Timestamp? | no | Last time memory was routed into a session. |
| `created_at` | Timestamp | yes | Extraction completion time. |
| `expires_after` | Timestamp? | no | Optional retention cutoff. |

`jobs` conceptual schema:

| Column | Type | Required | Purpose |
|---|---|---|---|
| `kind` | String | yes | `memory_stage1` or `memory_consolidate_global`. |
| `job_key` | String | yes | Session id for Phase 1, `global` for Phase 2. |
| `status` | String | yes | `pending`, `running`, `done`, or `error`. |
| `ownership_token` | String | yes when running | Lease owner. |
| `started_at` | Timestamp? | no | Claim time. |
| `lease_until` | Timestamp? | no | Claim expiration. |
| `retry_at` | Timestamp? | no | Earliest retry after failure. |
| `retry_remaining` | u32 | yes | Remaining attempts. |
| `last_error` | String? | no | Most recent failure summary. |
| `input_watermark` | String? | no | Selected input set marker. |
| `last_success_watermark` | String? | no | Last successful processed marker. |

The implementation may use SQLite for these tables. If the state database is deleted, Phase 1 and Phase 2 can be rebuilt from session JSONL and memory workspace files, though usage counters may reset.

## Behavior Specification

### B1. Startup Memory Coordinator

- **Trigger**: A new root user-facing session starts, or the server performs a configured startup maintenance pass.
- **Preconditions**: The memory feature is enabled. The current session is not ephemeral and is not a subagent or internal maintenance session.
- **Algorithm / Flow**:
  1. Resolve memory configuration from effective config:
     - `features.memories`
     - `memories.generate_memories`
     - `memories.use_memories`
     - candidate age, idle-time, retry, rate-limit, and consolidation limits.
  2. If `features.memories` is false: do nothing.
  3. If `generate_memories` is true: run Phase 1 candidate claim and extraction (B2-B4), subject to rate-limit guard.
  4. If `use_memories` is true and Phase 1 produced or already has eligible outputs: attempt Phase 2 consolidation (B5-B6).
  5. If `use_memories` is true for the current user session: enable the read path for that session (B7).
- **Postconditions**: Background memory work is scheduled without blocking the user's first turn.
- **Error Handling**: Memory startup failures are logged as diagnostics and must not prevent normal chat startup.

### B2. Phase 1 Candidate Claim

- **Trigger**: Startup coordinator runs Phase 1.
- **Preconditions**: `generate_memories` is enabled. Rate-limit remaining percentage is at or above `min_rate_limit_remaining_percent`.
- **Algorithm / Flow**:
  1. Prune stale `stage1_outputs` rows unused beyond `max_unused_days`.
  2. Query session JSONL metadata for candidates:
     - root interactive sessions only,
     - not ephemeral,
     - within `max_rollout_age_days`,
     - idle for at least `min_rollout_idle_hours`,
     - memory mode enabled for the source session,
     - no completed Phase 1 output for the same source watermark,
     - no running unexpired Phase 1 job.
  3. Atomically claim up to `max_rollouts_per_startup` candidates by inserting or updating `jobs` rows with:
     - `kind = memory_stage1`,
     - `job_key = session_id`,
     - `status = running`,
     - fresh `ownership_token`,
     - `lease_until = now + stage1_lease_seconds`.
  4. Run claimed extraction jobs concurrently up to `max_stage1_parallelism`.
- **Postconditions**: Each claimed session is owned by one worker until lease expiry.
- **Error Handling**: If rate limits are too low, skip Phase 1 without marking jobs failed. If a lease is already held, skip that candidate.

### B3. Phase 1 Extraction

- **Trigger**: A Phase 1 job is claimed.
- **Preconditions**: The worker holds the job `ownership_token`.
- **Algorithm / Flow**:
  1. Load the source session JSONL transcript from `source_rollout_path`.
  2. Filter transcript content:
     - exclude developer/base instruction blocks,
     - exclude repetitive environment and tool schema context,
     - exclude subagent notification markers unless they are central to user-visible outcome,
     - keep user corrections, user preferences, project facts, final assistant results, tool outcomes, and changed-file summaries.
  3. Serialize the filtered transcript into structured JSON for the extraction prompt.
  4. Invoke the configured extraction model with low reasoning effort and a bounded output schema.
  5. Parse exactly this JSON shape:
     ```json
     {
       "raw_memory": "markdown string",
       "rollout_summary": "single-line summary",
       "rollout_slug": "optional-lowercase-slug-or-null"
     }
     ```
  6. Validate:
     - `raw_memory` and `rollout_summary` are strings,
     - `rollout_slug` is null or lowercase alphanumeric plus underscores/hyphens,
     - all fields obey configured length limits.
  7. Run secret redaction over every output field.
  8. Store a `stage1_outputs` row in the local state database.
  9. Mark the Phase 1 job `done` with completion timestamp.
- **Postconditions**: A successful output row exists, including success-without-output rows where both memory fields are empty.
- **Error Handling**:
  - Model call failure: retry according to the job retry policy.
  - Invalid JSON: retry once with a repair prompt; if still invalid, mark job `error`.
  - Redaction detects unrecoverable secret density: store an empty success-without-output row with `redaction_state = blocked`.

### B4. Phase 1 No-Output Gate

- **Trigger**: Phase 1 parsing succeeds.
- **Preconditions**: Parsed output may be empty.
- **Algorithm / Flow**:
  1. If `raw_memory` or `rollout_summary` is empty after trimming, store both as empty and mark the row as success-without-output.
  2. Do not create or update `raw_memories.md` from this row.
  3. Do not count this row as an input requiring Phase 2 consolidation.
- **Postconditions**: Sessions that produce no useful memory are not repeatedly extracted for the same source watermark.

### B5. Phase 2 Workspace Sync

- **Trigger**: Phase 1 completes, startup coordinator finds unconsolidated selected rows, or the global consolidation cooldown expires.
- **Preconditions**: `use_memories` is enabled. A global Phase 2 job can be claimed.
- **Algorithm / Flow**:
  1. Claim `jobs(kind = memory_consolidate_global, job_key = global)` atomically.
  2. Ensure the memory workspace exists and has a git baseline. If no baseline exists, initialize one before writing new sync files.
  3. Select up to `max_raw_memories_for_consolidation` `stage1_outputs` rows ordered by:
     - higher `usage_count`,
     - newer `last_usage_at`,
     - newer `created_at`.
  4. Exclude success-without-output rows and rows beyond retention limits.
  5. Write `raw_memories.md` in stable ascending session order. Each entry includes session id, source timestamp, workspace path, rollout path, `rollout_summary`, and `raw_memory`.
  6. Write one `rollout_summaries/<stem>.md` file per selected row.
  7. Prune rollout summary files no longer in the selected set.
  8. Prune extension resources older than their retention window, except active ad-hoc notes.
  9. Compute `git diff` from the previous memory workspace baseline.
  10. If the diff is empty: mark Phase 2 `done`, update cooldown watermark, and exit without spawning a consolidation agent.
  11. If the diff is non-empty: write `phase2_workspace_diff.md` and proceed to B6.
- **Postconditions**: The memory workspace contains a deterministic materialized view of selected Phase 1 inputs.
- **Error Handling**: Filesystem write failure keeps the Phase 2 job in `error` with retry metadata. Partial sync files are allowed to remain; the next run rewrites them deterministically.

### B6. Phase 2 Consolidation Agent

- **Trigger**: Phase 2 workspace sync produced a non-empty diff.
- **Preconditions**: The worker holds the global Phase 2 `ownership_token`.
- **Algorithm / Flow**:
  1. Spawn an internal consolidation subagent with:
     - workspace root set to the memory workspace,
     - filesystem write access restricted to the memory workspace,
     - network disabled,
     - approval policy `Never`,
     - MCP/plugins/skills/subagents disabled,
     - ephemeral session mode,
     - memory generation disabled for the consolidation session.
  2. Provide a prompt that instructs the agent to:
     - inspect `phase2_workspace_diff.md`,
     - merge `raw_memories.md` into `MEMORY.md`,
     - update `memory_summary.md`,
     - create or update `skills/` only when a durable reusable procedure is justified,
     - consume `extensions/ad_hoc/notes/` into the consolidated files when appropriate,
     - avoid storing secrets,
     - preserve evidence pointers to source rollout summaries.
  3. Heartbeat the Phase 2 lease every `phase2_heartbeat_seconds` while the subagent runs.
  4. If heartbeat fails because ownership was lost: interrupt the consolidation subagent and mark the job `error`.
  5. On subagent success:
     - verify required files still parse as markdown/text,
     - run secret redaction check over changed files,
     - create a git commit or reset baseline representing the new memory workspace state,
     - mark selected `stage1_outputs` as consolidated for this pass,
     - mark the global job `done` with `last_success_watermark`.
  6. On subagent failure: mark the job `error`, keep workspace files for inspection, and retry after configured delay.
- **Postconditions**: Consolidated memory files are updated only by the sandboxed consolidation agent.

### B7. Read Path and Memory Tools

- **Trigger**: Context assembly starts for a user-facing root session and `use_memories` is enabled.
- **Preconditions**: Memory workspace exists. Read path has not been disabled for the session.
- **Algorithm / Flow**:
  1. Load `memory_summary.md` if it exists and is within size limits.
  2. Build memory developer instructions containing:
     - memory use/skip decision boundary,
     - memory layout,
     - quick-pass search protocol,
     - verification and stale-fact guidance,
     - citation requirements when memory is used,
     - ad-hoc note update rules.
  3. Embed the current `memory_summary.md` content between explicit begin/end markers.
  4. Inject this block through the metadata-derived instruction layer after base instructions and before turn-specific user input.
  5. Register read-only memory tools scoped to the memory workspace:
     - `memory_list`,
     - `memory_read`,
     - `memory_search`.
  6. Do not register memory write tools for ordinary model use.
  7. Emit memory usage telemetry when memory files or tools are used, including file path, line range, session id, and timestamp without content payloads.
- **Postconditions**: The model can use persistent memory without clients managing memory entries.
- **Safety Rules**: Memory read tools must reject paths outside the memory workspace, symlinks escaping the workspace, and binary files above configured size limits.

### B8. Ad-Hoc Memory Notes

- **Trigger**: The user explicitly asks the agent to remember, forget, update, or correct a persistent memory.
- **Preconditions**: Memory feature is enabled and the user intent is explicit.
- **Algorithm / Flow**:
  1. Do not edit `MEMORY.md`, `memory_summary.md`, `raw_memories.md`, `rollout_summaries/`, or `skills/` directly.
  2. Write one small markdown note under `extensions/ad_hoc/notes/<timestamp>-<slug>.md`.
  3. The note must include:
     - operation: add, update, delete, or clarify,
     - user-provided content,
     - scope hint: global, workspace, project, or unknown,
     - source session id and timestamp,
     - any safety redaction applied.
  4. The next Phase 2 consolidation pass consumes the note and decides how to merge it.
  5. If the note cannot be written, report the failure to the user without pretending memory was updated.
- **Postconditions**: User-requested memory changes are durable inputs to consolidation, not unsupervised direct edits to consolidated memory.

### B9. Retention, Pruning, and Deletion Interaction

- **Trigger**: Phase 1 startup pruning, Phase 2 workspace sync, or session deletion.
- **Preconditions**: Retention config is resolved.
- **Algorithm / Flow**:
  1. Prune `stage1_outputs` rows beyond `max_unused_days` when they have no recent usage.
  2. Ignore source sessions older than `max_rollout_age_days` during candidate claim.
  3. Prune rollout summary files no longer selected by Phase 2.
  4. On session deletion, do not expose a memory-management prompt to clients. Apply internal retention policy:
     - retain consolidated memory by default,
     - optionally unlink or prune source-specific Phase 1 rows according to configured retention,
     - never break consolidated memory files solely because a source session was deleted.
  5. Deleting a session's JSONL after memory extraction does not require deleting consolidated memory, because memory is an internal derived artifact with its own retention policy.
- **Postconditions**: Memory remains bounded and does not become a client-managed cleanup burden.

### B10. Job Atomicity and Recovery

- **Trigger**: Any memory job starts, heartbeats, completes, fails, or the server restarts.
- **Preconditions**: Local state database is available.
- **Algorithm / Flow**:
  1. Every running job must have a random `ownership_token`.
  2. A worker may update a job only when both `job_key` and `ownership_token` match.
  3. Expired leases may be reclaimed by another worker.
  4. Phase 2 heartbeat extends the lease; losing the lease aborts the consolidation agent.
  5. Startup recovery treats `running` jobs with expired leases as reclaimable.
  6. Startup recovery treats `running` jobs with unexpired leases as owned by another process and skips them.
  7. Failed jobs are retried only after `retry_at` and only while `retry_remaining > 0`.
- **Postconditions**: Multiple server instances do not perform duplicate Phase 2 consolidation or duplicate Phase 1 extraction for the same source watermark.

### B11. Client Boundary

- **Trigger**: Client connects, subscribes to sessions, or inspects status.
- **Preconditions**: Memory may be enabled.
- **Algorithm / Flow**:
  1. Do not expose per-memory list, edit, delete, export, or change subscription protocol methods.
  2. Clients may show feature-level status such as memory enabled/disabled if configuration inspection permits it.
  3. Clients may let users change memory configuration through ordinary configuration flows if such config UI exists.
  4. Memory extraction and consolidation progress is logged through observability diagnostics, not session transcript events unless a user explicitly requested a memory note in the current conversation.
- **Postconditions**: Memory remains server-owned and does not add a client-managed database surface.

## Required Tests

- Phase 1 candidate claim excludes subagents, ephemeral sessions, too-new sessions, too-old sessions, and already-claimed sessions.
- Phase 1 claims are atomic under two concurrent workers.
- Phase 1 no-output rows prevent repeated extraction for the same source watermark.
- Phase 1 redaction blocks or redacts detected secrets before storage.
- Phase 2 global lock allows only one consolidation worker.
- Phase 2 workspace sync writes deterministic `raw_memories.md` ordering.
- Phase 2 no-diff gate exits without spawning a consolidation agent.
- Losing the Phase 2 lease aborts the consolidation agent.
- Read path injects `memory_summary.md` as metadata-derived instructions, not transcript items.
- Memory tools cannot read outside the memory workspace, including symlink escapes.
- Ad-hoc memory requests create a note file and do not edit consolidated memory directly.
- Session deletion does not expose client memory-management operations and does not corrupt consolidated memory files.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-MEM-001 | specified-by |
| L2-DES-CONV-001 | specified-by |
| L2-DES-SAFETY-001 | specified-by |
| L2-DES-SAFETY-002 | specified-by |
| L2-DES-AGENT-003 | specified-by |
| L2-DES-LLM-003 | specified-by |

## Implementation Placement Guidance

- Core owns the memory coordinator, prompt construction, read-path injection, and filesystem safety checks.
- The local state database may be SQLite and may reuse the same database that backs session indexes and goal projections.
- The consolidation agent may reuse the subagent runtime only if it can enforce the sandbox, disabled-extension, approval, and ephemeral-session requirements in B6.
- Memory workspace git commands must be run with explicit working directory set to the memory root.
- Memory diagnostics should use `L3-BEH-APP-002` observability redaction rules.

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Initial persistent memory extraction and consolidation behavior. |
| 2 | 2026-05-27 | Assistant | Correction | Replaced direct raw-file and direct consolidated-memory write semantics with L2-aligned `stage1_outputs`, Phase 2 workspace sync, sandboxed consolidation, read-only tools, ad-hoc notes, and client-boundary rules. |
