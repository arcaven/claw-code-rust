---
artifact_id: L1-REQ-CONV-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-CONV-002 — Turn Lifecycle

## Purpose

Make each user-to-agent execution cycle visible and auditable.

## Why This Matters

Turns are how users understand what happened after each input. A clear turn lifecycle prevents confusion between active work, waiting state, completed output, interrupted work, and failed execution.

## Background / Context

A turn may include user input, model output, reasoning summaries, tool calls, tool outputs, approvals, Plan Mode questions, and final response state.

## User / Business Requirement

The program must expose a clear lifecycle for each turn in a session.

## Real User Scenarios

- A user submits a request and watches the turn move from running, to waiting for approval, to completed.
- A user reviews a prior failed turn and needs to know which model output, tool call, or approval step failed.

## Functional Requirements

- A turn must begin when the user submits input for agent execution.
- A turn must represent running, waiting, completed, failed, and interrupted states.
- A turn must preserve relevant items in session history after it ends.
- A turn should expose token usage, model information, and key execution results where available.

## Non-Functional Requirements

- Turn status must be understandable to users in real time.
- Turn history must support later audit and recovery.

## Acceptance Criteria

- Given an active turn, when the program waits for approval or a Plan Mode question, then the user can see why it is waiting.
- Given an interrupted turn, when the user reviews history, then the interruption state is preserved.
- Given a turn completes successfully, when the user reviews history, then the final response and relevant execution items are associated with that turn.
- Given a turn fails before producing a final answer, when the user reviews it, then the failure state is visible and not confused with completion.

## Out of Scope

- The program does not define internal item types, server event names, or token accounting precision in this L1 requirement.
- This requirement does not require every internal event to be displayed as a separate user-facing transcript item.

## Open Questions

- Can a single Plan Mode turn ask the user multiple questions?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-AGENT-005 | 1 | specs/L1/L1-REQ-AGENT-005-plan-mode.md | Plan Mode defines when the question tool may be used during a turn. |
| refined-by | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines turn and item structures for durable session history. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Clarified that turn questions are Plan Mode questions under the question-tool restriction. |
