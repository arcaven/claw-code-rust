---
artifact_id: L1-REQ-NOTIFY-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-NOTIFY-001 — Attention Management

## Purpose

Ensure that the program brings important events to the user's attention without creating noise or interrupting flow unnecessarily.

## Background / Context

Agentic work may run for a long time, wait for approval, fail, become blocked, finish in the background, or require the user to make a decision. Automations and reminders cover scheduled work, but active work also needs attention rules so users know when they should act.

The program should notify users about meaningful state changes while avoiding repeated or low-value interruptions.

## User / Business Requirement

The program must provide attention management for active and background work so users are informed when action or awareness is needed.

## Functional Requirements

- The program must surface when a long-running task completes.
- The program must surface when a task fails or becomes blocked.
- The program must surface when a task needs approval or a user answer.
- The program must surface when background or delegated work produces a result that affects the current session.
- The user must be able to understand why attention is requested.
- The program should avoid repeatedly notifying the user about the same unchanged state.

## Non-Functional Requirements

- Notifications must be useful, concise, and tied to actionable state.
- Notifications must not spam the user during normal streaming or frequent progress updates.
- Attention signals must respect privacy and avoid exposing sensitive content in places where it may be inappropriate.
- Attention behavior should be consistent across client surfaces where the relevant capability exists.

## Acceptance Criteria

- Given a long-running task completes while the user is not focused on it, when the result is available, then the program can surface completion in a user-visible way.
- Given a task fails, when the failure is known, then the program can draw attention to the failure and its summary.
- Given a task needs approval or a user answer, when progress is blocked on the user, then the program surfaces that action is required.
- Given the same blocked state remains unchanged, when time passes, then the program does not repeatedly notify the user without new information.
- Given a notification is shown, when the user inspects it, then the related session, turn, task, or automation is identifiable.

## Out of Scope

- Notification transport, operating-system notification APIs, badge behavior, sound behavior, and client-specific presentation are not specified here.
- This requirement does not define scheduling semantics for automations or reminders.
- This requirement does not require every minor progress update to generate a notification.

## Open Questions

- Which events should produce external notifications versus in-client attention indicators?
- Should notification preferences be configured globally, per workspace, per session, or per automation?
- What quiet-hours or do-not-disturb behavior should be supported?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/notify/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft approved for L1 expansion. |
