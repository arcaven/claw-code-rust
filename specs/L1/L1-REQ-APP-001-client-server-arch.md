---
artifact_id: L1-REQ-APP-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-APP-001 — Client Server Architecture

## Purpose

Ensure that the program separates user-facing clients from the agent runtime capability they control.

## Why This Matters

Users should not get different task semantics depending on which client they use. A shared runtime makes sessions, approvals, task state, and history consistent across TUI, desktop, IDE, and future clients.

## Background / Context

The program may expose multiple user interfaces over time. The initial client surface is the TUI, but agent execution, session state, tool execution, safety decisions, and model interactions should not be owned by one client implementation.

Users should experience consistent core behavior whether they interact through the TUI or a future client surface.

For example, the TUI, a desktop client, and an IDE extension client may all connect to the same agent runtime. When the user starts a task, approves an action, interrupts work, or resumes a session from one client, the other connected clients should observe the same underlying session and task state.

## User / Business Requirement

The program must provide a client/server product architecture where clients present and control work, while the server-side agent capability owns shared execution behavior.

## Real User Scenarios

- A user starts a task in the TUI, opens a desktop client, and sees the same running session state.
- A user approves a tool action from one client and expects the approval decision to be reflected in other connected clients.

## Functional Requirements

- The program must provide a server-side agent capability that can be used by client surfaces.
- The initial product must provide a TUI client surface.
- Client surfaces must be able to start, observe, interrupt, and resume agent work through the shared agent capability.
- Multiple connected client surfaces must observe the same underlying session, turn, approval, and task state when they are connected to the same agent runtime.
- Core behaviors such as sessions, turns, model calls, tool execution, approvals, safety checks, and persistence must be shared rather than reimplemented independently by each client.
- Client-specific UI behavior may differ, but it must not change the meaning of core agent execution.

## Non-Functional Requirements

- Core agent behavior must remain client-neutral where possible.
- A future client should be able to reuse the same core capabilities without changing existing TUI behavior.
- Client/server boundaries must preserve user-visible consistency for task state, history, approvals, and errors.

## Acceptance Criteria

- Given the TUI client starts a task, when the task runs, then the shared agent capability owns execution rather than TUI-only logic.
- Given a future client surface, when it starts or resumes a session, then it observes the same session and turn semantics as the TUI.
- Given the TUI, desktop client, and IDE extension are connected to the same agent runtime, when the user performs an operation in one client, then the other clients observe the same updated session or task state.
- Given a tool approval is required, when any client surface is active, then the approval represents the same safety decision in the shared agent capability.
- Given an error occurs during model or tool execution, when any client surface reports it, then the user receives the same underlying failure state.
- Given a client reconnects to an active session, when the session is still running, then the client can observe the current state instead of creating a conflicting duplicate session.

## Out of Scope

- The program does not define transport protocols, wire payloads, crate boundaries, deployment topology, or process layout in this L1 requirement.
- This requirement does not require every client to have identical UI layout or interaction shortcuts.
- Tool extensibility is covered by separate tool and integration requirements.

## Open Questions

- Which client surfaces after the TUI should be considered first-class?
- Should local and remote clients share the same user-facing capability guarantees?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | L2 defines protocol, transport, and server instance ownership for shared clients. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
