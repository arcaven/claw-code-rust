---
artifact_id: L1-REQ-CONTEXT-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-CONTEXT-001 — Context Management

## Purpose

Ensure the program can maintain useful working context across long-running sessions.

## Why This Matters

The model can only use the context it is given. Context management determines whether the program remembers goals, instructions, permissions, recent work, and tool results while staying within model limits.

## Background / Context

Agentic work requires model-visible context such as system instructions, active mode, project instruction files, environment, permissions, tools, user messages, model output, tool calls, and tool results. Model context windows are finite.

## User / Business Requirement

The program must manage model context so long-running work remains coherent while respecting model limits.

## Real User Scenarios

- A user resumes a long task after many turns and expects the program to remember the current objective and important decisions.
- A user changes permission mode and expects future model calls to receive the updated constraint.

## Functional Requirements

- The program must include required startup context such as instructions, active mode, environment, permissions, persona, tools, skills, and MCP capabilities where applicable.
- The program must include relevant discovered project instruction files in context where applicable and permitted.
- The program must include relevant conversation items such as user messages, model responses, reasoning summaries, tool inputs, and tool outputs.
- The program must keep context structurally valid across turns.
- The program must support context reduction when needed to stay within model limits.

## Non-Functional Requirements

- Context management must preserve recent and relevant task information.
- Context reduction must not corrupt tool-call or conversation structure.

## Acceptance Criteria

- Given a long session, when the context approaches model limits, then the program reduces context rather than failing unnecessarily.
- Given a future model call, when context is assembled, then required instructions, active mode, permissions, and available capabilities are represented.
- Given recognized project instruction files were discovered, when context is assembled for workspace-dependent work, then relevant instructions from those files are represented subject to context limits and instruction hierarchy.
- Given context is rebuilt after tool use, when the next model call starts, then relevant tool inputs and outputs remain coherent.
- Given user instructions conflict with obsolete summarized context, when context is assembled, then the current user instruction is preserved as authoritative.

## Out of Scope

- The program does not define token estimator implementation, compaction algorithm, or prompt serialization format in this L1 requirement.
- This requirement does not guarantee that every historical detail remains model-visible forever.

## Open Questions

- Which context items are mandatory for every model invocation?
- Should active mode be represented in every model invocation or only when mode-specific behavior applies?
- Which discovered project instruction files should be mandatory context for workspace-dependent model invocations?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines active context snapshots as references into metadata and transcript records. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added discovered project instruction files as workspace-dependent model context. |
| 1 | 2026-05-21 | Human | Refinement | Added active mode as model context. |
