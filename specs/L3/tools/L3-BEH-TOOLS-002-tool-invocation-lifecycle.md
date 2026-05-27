---
artifact_id: L3-BEH-TOOLS-002
revision: 1
status: Draft
active_baseline: no
---

# L3-BEH-TOOLS-002 — Tool Invocation Lifecycle and Dispatch

## Purpose

Define the concrete behavior for tool call validation, permission checking, execution, output bounding/redaction, result construction, and terminal state recording.

## Source Design

L2-DES-TOOL-001 (Built-In Tool System), L2-DES-SAFETY-002 (Approval Mechanism)

## Behavior Specification

### B1. Tool Call Validation

- **Trigger**: The provider returns a tool call in the model response.
- **Preconditions**: The tool call has a `tool_name` and `arguments` (JSON).
- **Algorithm / Flow**:
  1. Look up `ToolDefinition` by `tool_name`. If not found → `invalid_input` (unknown tool).
  2. Parse arguments as JSON Value. Validate against `input_schema` using a JSON Schema validator.
  3. If validation fails: return `invalid_input` with field-level error details.
  4. For command tools: extract and validate `description` field (required, non-empty, max 500 chars). Extract `command` field (required, non-empty, max 65536 chars).
  5. For command tools: check that actual command is consistent with `description`. If they clearly conflict (heuristic: command contains destructive patterns but description claims safety) → flag as suspicious per safety policy (may trigger approval even under permissive policy).
- **Postconditions**: The tool call is validated or rejected with structured error.

### B2. Tool Execution

- **Trigger**: Tool call passed all gates (validation, mode, permission, approval) and is admitted for execution.
- **Preconditions**: `ToolRuntimeContext` is available (session, turn, workspace, config, tool registry).
- **Algorithm / Flow**:
  1. Record `tool_call_started` event with: `tool_call_id`, `tool_name`, `command_description` (for command tools), `arguments_preview` (first 200 chars), `approval_state`, `safety_state`.
  2. Invoke the handler:
     ```rust
     let result = handler.execute(ctx, arguments).await;
     ```
  3. Apply output bounding: truncate `result.content` to `output_limit_bytes`. If truncated, note "Output truncated at N bytes" in the status summary.
  4. Apply redaction: scan for secrets (API keys, tokens, passwords) using regex patterns. Replace with `[REDACTED]`. Record `redaction_state` (None, Partial, Full).
  5. Construct the `ToolResult`:
     - `tool_call_id`, `tool_name`, `status` (Completed, Denied, BlockedByMode, NeedsConfiguration, InvalidInput, Failed, Canceled, Interrupted).
     - `result_summary` (natural-language, ≤ 500 chars, factual, derived from output).
     - `structured_status` (exit_code, http_status, process_id, changed_file_count, etc.).
     - `content` (canonical result for model), `display_content` (safe for clients).
     - `redaction_state`, `safety_notice` (if applicable).
  6. Record `tool_call_completed` event.
  7. For mutating tools: add file changes to the turn's workspace change set.
- **Postconditions**: Tool result is available for model context and client display.
- **Error Handling**: Handler panic → catch unwind, return `Failed` with "Internal tool error". Handler timeout → `Failed` with timeout message.

### B3. Natural-Language Result Summary

- **Trigger**: Tool execution completes with structured output.
- **Preconditions**: The tool result has structured fields (exit code, HTTP status, file counts, etc.).
- **Algorithm / Flow**:
  1. Generate a factual summary from structured results:
     - Command: "Command <description> succeeded/failed (exit code: N). <key output excerpt>."
     - File read: "Read N lines from <path>."
     - File write: "Created/Modified <path> (N bytes)."
     - Web fetch: "Fetched <url> (HTTP N, M bytes)."
     - Web search: "Found N results for '<query>'."
     - Plan: "Plan updated: N items, M completed."
     - Goal: "Goal <status>."
  2. The summary must be factual — no invented causes or next actions.
  3. If the tool cannot determine outcome: state what is known ("Command exited with code 1. No stderr output captured.").
- **Postconditions**: The model receives a concise natural-language status alongside structured fields.

### B4. Tool Terminal States

- **Trigger**: Tool execution finishes (or is blocked/denied/failed).
- **Preconditions**: The outcome is determined.
- **Algorithm / Flow**: Every tool invocation produces exactly one terminal state:
  - `Completed`: executed successfully, output is valid.
  - `Denied`: user or auto-reviewer denied the tool call. Include denial reason.
  - `BlockedByMode`: the tool is unavailable in the current interaction mode.
  - `NeedsConfiguration`: the tool requires config that is missing.
  - `InvalidInput`: arguments failed schema validation.
  - `Failed`: execution error (timeout, crash, runtime error).
  - `Canceled`: tool was cancelled via interrupt.
  - `Interrupted`: turn was interrupted while tool was running; partial output preserved.
- **Postconditions**: Every tool call has a durable terminal record.

### B5. Plan Tool Behavior

- **Trigger**: Model calls the plan tool.
- **Preconditions**: Plan tool is available in the current mode (Normal and Plan modes).
- **Algorithm / Flow**:
  1. Parse the plan operation: `create`, `update`, `add_items`, `update_items`, `complete`, `block`, `abandon`.
  2. Validate plan items: each item has `text` (non-empty, max 500 chars), optional `details`, optional `parent_item_id`, optional `parallel_group_id`.
  3. Apply the operation:
     - `create`: if an active plan exists, replace it (old plan → Superseded). Create new plan with items.
     - `update_items`: patch existing items by `plan_item_id`. Change status, text, or details. Unmatched ids are reported in result.
     - `complete`/`block`/`abandon`: set plan status, optional note.
  4. Persist `plan_created` or `plan_updated` record.
  5. Broadcast `plan_updated` client event with changed item ids.
  6. Plan items must be user-visible task descriptions, not private model reasoning. Text should be concise and action-oriented.
- **Postconditions**: The active plan is updated. Subscribed clients see the new plan state.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TOOL-001 | specified-by |
| L2-DES-SAFETY-002 | specified-by |

## Implementation Placement Guidance

- Per `L3-DES-ARCH-001`, tool handler implementations belong to core. The tools crate defines pure contracts such as `ToolHandler`, `ToolSpec`, and `ToolRegistry`.
- The `ToolContext` (from `tools` crate) provides access to the tool registry (for nested tool resolution), session state, and workspace.
- Output bounding should happen before redaction (redact in the bounded output, not the unbounded raw output).
- Command description/command conflict detection is a configurable heuristic, not a security boundary.
