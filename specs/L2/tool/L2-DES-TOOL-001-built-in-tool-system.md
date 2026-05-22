---
artifact_id: L2-DES-TOOL-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Assistant
last_updated: 2026-05-22
---

# L2-DES-TOOL-001 — Built-In Tool System

## Purpose

Define the built-in tool system used by the agent execution engine, including baseline tool categories, tool lifecycle, safety gates, visibility, and the plan tool that maintains user-visible task planning state.

## Background / Context

The agent execution engine depends on tools to inspect the workspace, modify files, run commands, ask for approval, ask Plan Mode clarification questions, search, fetch external content, coordinate subagents, and keep a visible plan.

`L2-DES-AGENT-001` defines where model-requested tool dispatch occurs in the execution loop. This design defines the tool system that dispatch uses.

The plan tool is part of the tool system rather than private model reasoning. It updates a user-visible to-do list that represents planned work and execution status.

## Source Requirements

- `L1-REQ-TOOL-002` requires a baseline set of built-in tools.
- `L1-REQ-AGENT-003` requires visible task planning with status updates.
- `L1-REQ-AGENT-005` restricts the question tool to Plan Mode.
- `L1-REQ-LLM-002` requires model-requested tool use through a controlled lifecycle.
- `L1-REQ-TOOL-001` requires tool safety, approval, redaction, and bounded output.
- `L1-REQ-TOOL-005` requires background process visibility and manual stop behavior.
- `L1-REQ-TOOL-003` requires configurable web search behavior.
- `L1-REQ-TOOL-004` requires explicit parallel tool orchestration where enabled.
- `L1-REQ-AGENT-004` requires subagent delegation where enabled.
- `L1-REQ-APP-010` requires configuration and unavailable-state behavior.
- `L2-DES-AGENT-001` defines the execution engine that dispatches tools.
- `L2-DES-AGENT-002` defines interruption and background process control.
- `L2-DES-APP-003` defines protocol events that expose tool and plan state.
- `L2-DES-CONV-001` defines durable tool, plan, and transcript records.

## Design Requirement

The program should provide a server-owned tool registry and tool supervisor. The model may request tools through structured tool calls, but the server validates, authorizes, executes, records, and reports every tool call.

Tool calls are not arbitrary code paths. Each tool must be defined by metadata, schema, capability classification, safety policy, output policy, and runtime handler.

## Tool Registry

Conceptual `ToolDefinition` fields:

- `tool_name`
- `display_name`
- `description`
- `input_schema`
- `output_schema`
- `tool_category`
- `execution_mode`: read_only, mutating, command, background_process, user_prompt, planning, delegation, web, or internal.
- `availability`: available, disabled, needs_configuration, unsupported, or blocked_by_mode.
- `configuration_refs`
- `permission_profile`
- `approval_policy`
- `redaction_policy`
- `output_limit_policy`
- `supports_streaming_output`
- `supports_cancellation`
- `supports_parallel_execution`

The registry should expose only tools available to the current session mode, permission posture, configuration, and model capability. A tool that is disabled or misconfigured should fail explicitly with a structured unavailable result rather than fabricating output.

## Baseline Tool Categories

The baseline built-in tool set should cover these categories:

| Category | Purpose | Examples |
|---|---|---|
| File read | Inspect file contents and metadata. | read file, list directory. |
| File mutation | Create, edit, delete, or rename files through structured operations. | write, apply patch. |
| Search | Find files or content in the workspace. | file-name search, content search. |
| Command execution | Run shell commands with bounded output. | one-shot command execution. |
| Background process | Track long-running commands and process stdin. | dev server, test watcher, interactive command. |
| Planning | Maintain visible task plan state. | plan tool. |
| Approval | Ask the user for permission before risky actions. | approval request. |
| Question | Ask the user for clarification in Plan Mode only. | question tool. |
| Web | Fetch or search external content where configured. | web fetch, web search. |
| Delegation | Start or coordinate subagents where enabled. | subagent spawn/status/result. |
| Parallel orchestration | Execute an explicit group of valid tool calls concurrently. | `multi_tool_use`. |

Exact tool names and schemas are L3 concerns. This L2 design defines the categories and lifecycle constraints.

## Tool Invocation Lifecycle

The normal lifecycle for a model-requested tool call is:

1. Provider stream emits a structured tool request.
2. Execution engine normalizes the request into an internal tool invocation.
3. Tool registry resolves the tool definition.
4. Input is validated against the tool schema.
5. Mode, permission, safety, and configuration gates are evaluated.
6. Approval is requested if required.
7. The tool supervisor executes the handler or returns a structured denial/unavailable result.
8. Streaming progress is emitted where supported.
9. Output is bounded, redacted, and normalized.
10. Durable tool call and tool result records are appended.
11. Server-client events update subscribed clients.
12. The structured result is returned to the model if the provider interaction continues.

Every tool invocation should produce one of these terminal states:

- `completed`
- `denied`
- `blocked_by_mode`
- `needs_configuration`
- `invalid_input`
- `failed`
- `canceled`
- `interrupted`

## Plan Tool

The plan tool maintains a visible to-do list for the current session or active task. It is the primary mechanism for satisfying visible task-planning requirements without exposing private model reasoning.

The plan tool should be available in Normal Mode and Plan Mode. In Plan Mode it may be used to build a strategic plan without mutating files. In Normal Mode it may be used to track execution progress.

Conceptual plan fields:

- `plan_id`
- `session_id`
- `turn_id` where created or last updated.
- `objective`
- `items`
- `status`: active, completed, blocked, abandoned, or superseded.
- `created_by`: agent, user, or imported.
- `created_at`
- `updated_at`

Conceptual plan item fields:

- `plan_item_id`
- `text`
- `status`: pending, in_progress, completed, blocked, or canceled.
- `details`
- `parent_item_id`
- `parallel_group_id`
- `source_turn_id`
- `updated_at`

Plan tool operations should include:

- Create or replace an active plan.
- Add plan items.
- Update item status.
- Mark the overall plan complete, blocked, abandoned, or superseded.
- Attach a blocker or short status note.
- Represent explicit parallel work through multiple in-progress items or a `parallel_group_id`.

The plan tool output is program state, not hidden chain-of-thought. Plan item text should be concise, user-visible, and action-oriented.

## Plan Consistency

The execution engine should keep plan state consistent with actual execution state:

- When a planned step starts, the corresponding item should become `in_progress`.
- When a planned step finishes, the corresponding item should become `completed`.
- When execution cannot continue, the corresponding item should become `blocked` with a concise reason.
- If the user's objective changes, the active plan should be updated, superseded, or explicitly abandoned.
- If work is delegated to subagents, plan state should identify delegated or parallel work.

The plan tool should not be mandatory for trivial one-step tasks. The agent may create a plan when task complexity, risk, user request, Plan Mode, or parallel work justifies it.

## Mode Gating

Tools must respect session-local interaction mode and session-level agent mode.

Plan Mode constraints:

- Mutating file tools must be blocked.
- The question tool may be available for clarification.
- Read-only tools, search tools, and safe inspection tools may be available.
- The plan tool should be available.
- Command, web, and subagent tools should follow explicit mode policy because they may have non-file side effects.

Normal Mode constraints:

- The question tool must be blocked unless a later requirement explicitly allows another mode.
- The plan tool remains available for visible progress tracking.
- Mutating tools may be available subject to permission and safety policy.

Tool availability should be resolved before tool schemas are exposed to the model where practical. If a provider still emits a blocked tool call, the server must return a structured blocked result.

## Parallel Tool Orchestration

`multi_tool_use` is an explicit orchestration tool. It should not bypass the lifecycle of individual tool calls.

Rules:

- Each child tool call must be independently resolved, validated, authorized, and recorded.
- Child calls should execute concurrently only when their tool definitions allow parallel execution.
- Mutating child calls require conflict and safety handling before concurrent execution.
- The parent orchestration result should preserve child ordering, child ids, terminal states, and partial failures.
- Progress events should be emitted per child call so clients can render work before the entire group completes.

## Output And Redaction

Tool output should be split into:

- Canonical result content returned to the model.
- Display content safe for clients.
- Durable output references where output is large.
- Redaction metadata explaining whether secrets or unsafe content were removed.

Output must be bounded so noisy commands, large files, web content, or background processes do not make the client or model context unusable.

## Background Processes

Command tools may start processes that continue after the originating tool call returns. Such processes should be registered with the tool supervisor and exposed through `L2-DES-AGENT-002` and `L2-DES-APP-003`.

The built-in tool system should record:

- Process id where available.
- Command label.
- Session and turn association.
- Workspace root.
- Runtime status.
- Recent output reference.
- Stdin capability.
- Stop capability.

Detailed process termination semantics are refined by interrupt/resume and future tool L3 designs.

## Durable Recording

The tool system should produce durable records through `L2-DES-CONV-001` for:

- Tool calls.
- Tool results.
- Tool progress summaries where needed for replay.
- Plan creation and updates.
- Approval and question requests.
- Background process registration and terminal state.
- Workspace change-set records from structured mutating tools.

Live server-client events may be more frequent than durable records, but replay must recover the final visible tool and plan state.

## Invariants

- Tools execute only through the server-owned tool supervisor.
- Tool schemas exposed to the model reflect current mode, configuration, and capability state where practical.
- Tool calls cannot bypass validation, safety, approval, or mode gates.
- The question tool is blocked in Normal Mode.
- The plan tool creates visible plan state and does not expose private model reasoning.
- Mutating tools report file changes to the core-owned workspace change set where supported.
- Tool outputs are bounded and redacted before model or client exposure.
- A tool unavailable due to configuration returns a clear unavailable result.

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refines | L1-REQ-TOOL-002 | 1 | specs/L1/L1-REQ-TOOL-002-tools.md | Defines the built-in tool registry, categories, lifecycle, and baseline tool behavior. |
| refines | L1-REQ-AGENT-003 | 1 | specs/L1/L1-REQ-AGENT-003-task-planning.md | Defines the plan tool as visible to-do state for task planning and progress. |
| related-to | L1-REQ-AGENT-005 | 1 | specs/L1/L1-REQ-AGENT-005-plan-mode.md | Applies Plan Mode restrictions to mutating tools and question-tool availability. |
| related-to | L1-REQ-LLM-002 | 1 | specs/L1/L1-REQ-LLM-002-tools.md | Defines the controlled lifecycle for model-requested tools. |
| related-to | L1-REQ-TOOL-001 | 1 | specs/L1/L1-REQ-TOOL-001-safety.md | Tool safety, approval, and redaction gates apply to all tool calls. |
| related-to | L1-REQ-TOOL-003 | 1 | specs/L1/L1-REQ-TOOL-003-web-search-configuration.md | Web search is a configurable built-in tool category. |
| related-to | L1-REQ-TOOL-004 | 1 | specs/L1/L1-REQ-TOOL-004-parallel-tool-orchestration.md | `multi_tool_use` is the explicit parallel orchestration tool. |
| related-to | L1-REQ-TOOL-005 | 1 | specs/L1/L1-REQ-TOOL-005-background-process-management.md | Command tools can register background processes for inspection and stop control. |
| related-to | L1-REQ-AGENT-004 | 1 | specs/L1/L1-REQ-AGENT-004-subagents.md | Subagent coordination is a built-in delegation tool category where enabled. |
| related-to | L2-DES-AGENT-001 | 1 | specs/L2/agent/L2-DES-AGENT-001-execution-engine.md | The execution engine dispatches tools through this tool system. |
| related-to | L2-DES-AGENT-002 | 1 | specs/L2/agent/L2-DES-AGENT-002-interrupt-resume-control.md | Interrupt and resume control active tool and background process work. |
| related-to | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | Protocol events expose tool and plan state to clients. |
| related-to | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | Durable records preserve tool and plan state. |
| specified-by | TBD | TBD | specs/L3/tool/TBD.md | L3 behavior has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-22 | Assistant | Initial | Initial built-in tool system and plan tool design. |
