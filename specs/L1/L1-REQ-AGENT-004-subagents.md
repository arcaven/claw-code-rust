---
artifact_id: L1-REQ-AGENT-004
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-AGENT-004 — Subagents

## Purpose

Allow bounded work to be delegated to parallel agents while keeping the main workflow coherent.

## Why This Matters

Parallel delegation can shorten large investigations, but it can also create duplicate work or conflicting edits. Users need subagents to be scoped, visible, and integrated by the main workflow.

## Background / Context

Some tasks benefit from parallel exploration, implementation, or verification. Delegation must remain visible, scoped, and safe from the user perspective. Subagents may need to inherit the current conversation context, and session forking can provide that context without modifying the parent session.

## User / Business Requirement

The program must support subagents for delegated, bounded work and must let the user inspect their status and results.

## Real User Scenarios

- A user asks the main agent to investigate two independent subsystems in parallel and compare the findings.
- A user asks one subagent to implement a bounded patch while another subagent checks related tests.

## Functional Requirements

- The user must be able to request creation of a subagent.
- Each subagent must have a clear task, scope, and expected output.
- The user must be able to inspect subagent status and final results.
- The main agent must integrate subagent findings, patches, or verification results into the main workflow.
- Subagents should be able to start from a forked session or equivalent forked context when delegated work requires existing conversation history.
- When a subagent uses a forked session or forked context, the relationship to the parent session must remain visible.

## Non-Functional Requirements

- Subagents must respect the same safety, permission, and workspace boundaries as the main session.
- The program must reduce duplicate work and conflicting edits when multiple subagents run concurrently.

## Acceptance Criteria

- Given a delegated task, when a subagent starts, then the user can see what work was delegated.
- Given a completed subagent, when the main agent reports final status, then the subagent result is summarized or integrated in the main session.
- Given a subagent modifies files, when the main workflow reports results, then the changed files and ownership of the work are visible.
- Given a subagent fails or is canceled, when the user checks status, then the failure or cancellation is visible without hiding the main task state.
- Given a subagent starts from a forked session or forked context, when the user inspects the subagent, then the parent session relationship is visible.

## Out of Scope

- The program does not define subagent scheduling, workspace forking, merge mechanics, or communication protocols in this L1 requirement.
- This requirement does not allow subagents to bypass safety, approval, or workspace boundaries.

## Open Questions

- Can a subagent request user approval directly, or must approval route through the main agent?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/agent/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added subagent use of forked session context and parent-session visibility. |
