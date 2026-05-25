---
artifact_id: L1-REQ-GOAL-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-GOAL-001 — Ralph Loop

## Purpose

Let users run a bounded autonomous coding loop around a durable objective until the objective is verified, blocked, paused, canceled, or stopped by budget limits.

## Why This Matters

Ralph Loop style work is useful when a task is too large for one turn but still has a concrete completion condition. The loop keeps the program focused on the objective, forces repeated audit against the requested outcome, and prevents false completion based only on partial progress or proxy signals.

## Background / Context

In coding-agent practice, a Ralph Loop is an autonomous iteration pattern: the agent receives an objective, works on it, verifies the result, and continues looping while the objective is not satisfied and allowed budget remains. Effective Ralph Loop use depends on a clear objective, persisted task state, verification criteria, and explicit stop conditions.

The program's goal feature is this Ralph Loop objective. It is not only a label for the session; it is the active contract that drives continuation, audit, status reporting, and completion decisions.

## User / Business Requirement

The program must provide a Ralph Loop goal capability for bounded autonomous work toward a verifiable objective.

## Real User Scenarios

- A user sets a Ralph Loop goal to eliminate all failing tests in a package; the program keeps iterating until the tests pass or a blocker or budget limit is reached.
- A user sets a Ralph Loop goal to complete a migration; the program performs implementation, checks the migration against the objective, and does not stop merely because one command succeeded.
- A task fails verification, and the Ralph Loop goal remains active instead of being marked complete.

## Functional Requirements

- The user must be able to create, view, pause, resume, clear, and complete a Ralph Loop goal.
- A Ralph Loop goal must describe the active objective and the user-visible success condition.
- A Ralph Loop goal must expose status such as pursuing, paused, completed, blocked, canceled, or budget-limited.
- The program must continue work across turns while the Ralph Loop goal is active, not paused, not complete, and still within allowed budget.
- The program must audit actual completion before marking the Ralph Loop goal complete.
- The program must report progress, blockers, verification status, and remaining budget information where available.

## Non-Functional Requirements

- Ralph Loop state must survive across turns and recoverable session resumes.
- Completion must be based on actual satisfaction of the objective, not on attempted work, generated text, or a single weak proxy signal.
- Looping must be bounded by explicit budget, stop, pause, or cancellation controls.
- The user must be able to understand why the loop is continuing or why it stopped.

## Acceptance Criteria

- Given an active Ralph Loop goal, when the user asks for status, then the program reports the objective, current status, progress, blockers, and budget state where available.
- Given the objective has not been verified as complete, when a turn ends, then the Ralph Loop goal remains active or blocked rather than being incorrectly marked complete.
- Given verification fails, when the loop continues, then the failure is treated as feedback for the next iteration or reported as a blocker.
- Given the user pauses the Ralph Loop goal, when the current turn ends, then automatic continuation stops until the user resumes it.
- Given the budget or stop condition is reached, when the loop stops, then the program reports that the goal is not necessarily complete unless completion was actually verified.

## Out of Scope

- The program does not define Ralph Loop storage format, slash-command syntax, continuation prompt design, model-tool schema, or budget calculation in this L1 requirement.
- This requirement does not allow the program to run forever without explicit budget or stop controls.
- This requirement does not allow the program to mark a Ralph Loop goal complete based only on attempted work, generated text, or a single unverified signal.

## Open Questions

- Should a session allow more than one active Ralph Loop goal?
- Which statuses should be product-level states versus L2/L3 runtime details?
- What budget dimensions should be exposed to users: tokens, time, turns, tool calls, cost, or a combination?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/goal/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
