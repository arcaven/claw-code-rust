---
artifact_id: L1-REQ-LLM-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-LLM-002 — Model Tool Use

## Purpose

Allow the model to request external capabilities through controlled tools.

## Why This Matters

Tool use is how the model turns reasoning into action. The user needs those actions to be structured, validated, visible, and constrained by safety policy.

## Background / Context

The program relies on tools for file access, command execution, search, web access, planning, approvals, and other actions. Tool use must remain structured and safe.

## User / Business Requirement

The program must support model-requested tool use through a controlled tool lifecycle.

## Real User Scenarios

- The model requests a file read to inspect code before proposing a fix.
- The model requests a command execution that requires approval because it writes outside the current permission boundary.

## Functional Requirements

- The model must be able to request available tools using structured inputs.
- The model should be able to request explicit parallel tool orchestration through `multi_tool_use` where enabled.
- The program must validate tool requests before execution.
- The program must apply safety and approval checks before risky tool execution.
- The program must return structured tool results to the model and user-visible history.

## Non-Functional Requirements

- Tool behavior must be predictable and auditable.
- Tool outputs must be bounded and sanitized where necessary.

## Acceptance Criteria

- Given a model-requested tool call, when the tool is allowed, then the program executes it and records the result.
- Given a tool call that requires approval, when approval is denied, then the program does not execute the tool.
- Given the model invokes `multi_tool_use`, when the underlying tool calls are valid and allowed, then the program executes the listed calls as an explicit parallel group.
- Given tool input is invalid, when the model requests the tool, then the program rejects or normalizes the request before execution.
- Given tool output is produced, when the model continues, then the result is represented in a structured and bounded way.

## Out of Scope

- The program does not define individual tool schemas, provider wire formats, or execution backends in this L1 requirement.
- This requirement does not allow the model to bypass validation or approval by using a different tool path.

## Open Questions

- Which tools must be available in the first milestone?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/llm/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added model-requested `multi_tool_use` parallel orchestration behavior. |
