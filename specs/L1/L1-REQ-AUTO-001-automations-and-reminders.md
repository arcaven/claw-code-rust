---
artifact_id: L1-REQ-AUTO-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-AUTO-001 — Automations and Reminders

## Purpose

Allow users to ask the program to continue, remind, monitor, or repeat work at a later time.

## Why This Matters

Some work depends on time, external changes, or a future follow-up. Automations let users delegate delayed work while preserving visibility and control over what will run.

## Background / Context

Some agent workflows are not completed in a single immediate turn. Users may want the program to check back later, continue a thread after a short delay, run a recurring verification, monitor an external condition, or remind them about unfinished work.

These workflows must be explicit and inspectable so users understand what will run, when it will run, and what authority it has.

## User / Business Requirement

The program must support user-controlled automations and reminders for delayed, recurring, or follow-up work.

## Real User Scenarios

- A user asks the program to remind them later to continue a paused thread.
- A user schedules a recurring check that runs verification and reports failures.

## Functional Requirements

- The user must be able to create a reminder or automation with a clear task and schedule.
- The user must be able to view, update, pause, resume, and delete automations.
- The program must distinguish one-time follow-ups from recurring automations.
- The program must show what context, workspace, permissions, and goal an automation will use.
- The program must report automation results or failures in a user-visible place.

## Non-Functional Requirements

- Automations must be explicit and user-controlled.
- Automations must respect safety, privacy, permission, and workspace boundaries.
- Automations must not silently run broad or destructive work without appropriate user intent.

## Acceptance Criteria

- Given a user creates a reminder, when the scheduled time arrives, then the program surfaces the requested follow-up.
- Given a user creates a recurring automation, when the user views automations, then the schedule, task, status, and last result are visible.
- Given an automation would require permissions beyond its current scope, when it runs, then it follows the approval and safety model instead of silently escalating.
- Given an automation fails, when the user views its status, then the failure reason and last attempted run are visible.
- Given a user pauses an automation, when the schedule would otherwise trigger, then the automation does not run until resumed.

## Out of Scope

- The program does not define scheduling engine implementation, recurrence rule syntax, notification transport, or background execution architecture in this L1 requirement.
- This requirement does not allow automations to perform destructive or broad work without user intent and permission.

## Open Questions

- Should automations be bound to sessions, workspaces, goals, or a combination of these?
- Which automation types are required for the first milestone: reminders, thread follow-ups, recurring jobs, or monitors?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/auto/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
