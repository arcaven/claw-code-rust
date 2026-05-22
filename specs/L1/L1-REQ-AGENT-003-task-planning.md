---
artifact_id: L1-REQ-AGENT-003
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-AGENT-003 — Task Planning

## Purpose

Provide a shared plan between the user and the agent for multi-step work.

## Why This Matters

Plans make agentic work legible. They let the user see the intended route, correct direction early, and distinguish genuine progress from hidden model activity.

## Background / Context

For complex tasks, users need a visible representation of intended steps and current execution state. A plan is user-facing task state, not hidden reasoning.

Plan Mode is a stricter planning interaction where the agent analyzes and produces a strategic plan without modifying files.

## User / Business Requirement

The program must support visible task planning with status updates during execution.

## Real User Scenarios

- A user asks for a refactor across several modules and wants to approve the approach before edits begin.
- A user watches a long task progress through investigation, implementation, tests, and cleanup steps.

## Functional Requirements

- The user must be able to request a plan before execution.
- The user must be able to enter Plan Mode for analysis and strategic planning without file modification.
- The program may create a plan when task complexity or risk justifies it.
- The plan must represent pending, in-progress, completed, and blocked states.
- The program must update the plan when execution status or user constraints change.

## Non-Functional Requirements

- Plan state must remain consistent with actual execution state.
- The plan must not expose private model reasoning as if it were program state.

## Acceptance Criteria

- Given a planned task, when a step begins, then the plan marks that step as in progress.
- Given Plan Mode is active, when the user asks for planning, then the program produces a strategic plan without applying file changes.
- Given a blocked step, when the program cannot proceed, then the plan reflects the blocker rather than marking the step complete.
- Given the user changes the objective, when the plan is still active, then the program updates the plan or explains why the old plan no longer applies.
- Given parallel work is delegated, when more than one step is active, then the plan makes the parallelism explicit.

## Out of Scope

- The program does not define internal plan data structures, plan-generation algorithms, or UI rendering details in this L1 requirement.
- This requirement does not make a visible plan mandatory for every trivial task.

## Open Questions

- Which task types should automatically create a visible plan?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-AGENT-005 | 1 | specs/L1/L1-REQ-AGENT-005-plan-mode.md | Plan Mode defines the planning-only interaction behavior and no-file-modification rule. |
| refined-by | L2-DES-TOOL-001 | 1 | specs/L2/tool/L2-DES-TOOL-001-built-in-tool-system.md | Defines the plan tool as visible to-do state for task planning and execution progress. |
| related-to | L2-DES-AGENT-001 | 1 | specs/L2/agent/L2-DES-AGENT-001-execution-engine.md | The execution engine updates visible plan state as work proceeds. |
| related-to | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | Protocol events expose plan updates to clients. |
| related-to | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | Durable records preserve plan state for replay and recovery. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added Plan Mode as a planning-only interaction without file modification. |
| 1 | 2026-05-22 | Human | Traceability | Linked task planning to the L2 built-in tool system and plan tool design. |
