---
artifact_id: L3-BEH-TOOLS-003
revision: 1
status: Draft
active_baseline: no
---

# L3-BEH-TOOLS-003 — Parallel Tool Orchestration (multi_tool_use)

## Purpose

Define the concrete behavior for `multi_tool_use`: parent envelope validation, concurrent child scheduling, per-child lifecycle, approval handling, result aggregation, client event emission, and cancellation.

## Source Design

L2-DES-TOOL-002 (Parallel Tool Orchestration), L2-DES-TOOL-001 (Built-In Tool System)

## Behavior Specification

### B1. Parent Envelope Validation

- **Trigger**: Provider returns a `multi_tool_use` tool call.
- **Preconditions**: The tool is registered and available.
- **Algorithm / Flow**:
  1. Parse parent input: `parallel_group_id`, `calls` (array of child invocations).
  2. Validate envelope:
     a. `calls` is non-empty and length ≤ `max_children_per_group` (default 10).
     b. Each child has: `child_index` (sequential, 0-based), `tool_name`, `tool_call_id`, `arguments`.
     c. No child tool within the group is `multi_tool_use` itself (no nesting in v1).
     d. No duplicate `tool_call_id` within the group.
  3. If envelope invalid → reject the entire `multi_tool_use` call with `invalid_input`.
  4. Record `tool_call_started` for parent with `parallel_group_id`, `group_child_count`.
- **Postconditions**: Parent is admitted or rejected as a unit. Individual children proceed to their own validation.

### B2. Concurrent Child Scheduling

- **Trigger**: Parent envelope is accepted.
- **Preconditions**: All children are resolved against the tool registry.
- **Algorithm / Flow**:
  1. For each child, spawn an independent async task (`tokio::spawn`):
     ```rust
     for child in calls {
         let handle = tokio::spawn(child_lifecycle(child, ctx.clone()));
         handles.push((child.child_index, handle));
     }
     ```
  2. Each child task independently runs validation → permission → approval → execution (see B3).
  3. Children are made runnable concurrently. The orchestrator does NOT serialize, reorder, or downgrade because of tool categories.
  4. While children run, the parent remains in `running` state.
- **Postconditions**: All children are scheduled concurrently. Their start times may differ due to approval waits.

### B3. Per-Child Lifecycle

- **Trigger**: A child task starts.
- **Preconditions**: Child has valid `tool_name`, `tool_call_id`, and `arguments`.
- **Algorithm / Flow**: Each child runs the same lifecycle as a direct tool call (L3-BEH-TOOLS-002):
  1. Resolve tool definition. If unknown → child terminal `invalid_input`.
  2. Validate arguments. If invalid → child terminal `invalid_input`.
  3. Check mode/availability gates. If blocked → child terminal `blocked_by_mode` or `needs_configuration`.
  4. Check permission profile. If denied by profile → child terminal `denied`.
  5. Run the permission and approval pipeline (`L3-BEH-CORE-004`). If approval required → child enters waiting state. Sibling children continue.
  6. If admitted: execute tool handler. Apply output bounding and redaction.
  7. Emit child events independently: `tool_call_started`, `tool_call_updated`, `tool_call_completed`.
- **Postconditions**: Each child reaches a terminal state independently.
- **Edge Cases**: A child that requires approval does NOT block siblings. Approval denial for one child does NOT affect siblings.

### B4. Parent Result Aggregation

- **Trigger**: All child tasks have reached terminal state.
- **Preconditions**: Every child has a terminal result.
- **Algorithm / Flow**:
  1. Collect all child results. Sort by `child_index` (stable output order, regardless of completion order).
  2. Compute parent group status:
     - All children `Completed` → `Completed`.
     - At least one `Completed` and at least one not → `PartialFailure`.
     - No children `Completed` and at least one failed/blocked/denied → `Failed`.
     - Group was interrupted before all children finished → `Interrupted`.
     - Group was cancelled before meaningful execution → `Canceled`.
  3. Build parent result:
     - `parallel_group_id`, `status`, `children` (ordered by child_index).
     - Each child: `tool_call_id`, `tool_name`, `terminal_state`, `result_summary`.
  4. Emit `tool_call_completed` for parent with aggregate result.
  5. Feed parent result back to model context.
- **Postconditions**: The model sees all child results in stable order. Group status summarizes overall outcome.

### B5. Child Progress Events

- **Trigger**: Individual child tool call state changes.
- **Preconditions**: The child task is running.
- **Algorithm / Flow**:
  1. Emit `tool_call_started` for each child as it begins, with `parent_tool_call_id`, `parallel_group_id`, `child_index`.
  2. Emit `tool_call_updated` for child state changes: waiting for approval, in progress, output preview.
  3. Emit `tool_call_completed` for each child as it finishes.
  4. Client events for children are independent and MUST NOT be batched until all children complete (anti-pattern: no "late flush" where all child events arrive at once).
- **Postconditions**: Clients can render child progress in real time. Users can see which children are running, waiting, or done.

### B6. Interruption of Parallel Group

- **Trigger**: Turn interruption is requested while a `multi_tool_use` group is active.
- **Preconditions**: The parent group has non-terminal children.
- **Algorithm / Flow**:
  1. Signal cancellation to all non-terminal child tasks.
  2. For children in approval wait: resolve as interrupted (canceled).
  3. For children running: send cancellation via handler. Completed child results are retained.
  4. Wait for children to reach terminal states or a bounded deadline (default 5 seconds per child).
  5. If deadline exceeded: force-terminate remaining children, record `interrupted`.
  6. Aggregate results. Set parent status to `Interrupted`.
- **Postconditions**: Completed child results are preserved. The group terminates with `Interrupted` status.

### B7. Limits and Constraints

- **Trigger**: `multi_tool_use` is invoked.
- **Preconditions**: Configurable limits are in effect.
- **Algorithm / Flow**: Enforce these limits:
  - `max_children_per_group`: hard cap on child count (default 10). Exceeding → envelope rejection.
  - `max_nesting_depth`: 0 in v1 (no nested `multi_tool_use`). Attempt → child `invalid_input`.
  - `per_child_timeout`: each child has its own execution timeout (default 120s).
  - `group_timeout`: overall group timeout (default 300s). Exceeding → remaining children interrupted, parent `Failed`.
  - `per_child_output_limit`: same as the tool's `output_limit_bytes`.
  - `aggregate_output_limit`: sum of all child outputs (default 1MB). Exceeding → oldest output truncated with notice.
- **Postconditions**: Resource usage is bounded. Limit violations are explicit.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TOOL-002 | specified-by |
| L2-DES-TOOL-001 | specified-by |

## Implementation Notes

- Use `tokio::task::JoinSet` for child task management — it handles concurrent spawning and ordered result collection.
- Child event emission uses the same event channels as direct tool calls — no separate batching layer.
- The parent `tool_call_started` event is emitted immediately after envelope validation. Clients render the parent group as a container before children start.
