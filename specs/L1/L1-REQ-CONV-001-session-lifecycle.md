---
artifact_id: L1-REQ-CONV-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-CONV-001 — Session Lifecycle

## Purpose

Define how users manage durable conversations with the program.

## Why This Matters

Sessions are the user's unit of work. Clear lifecycle behavior lets users start, resume, fork, archive, and delete work without losing track of which history or workspace they are using.

## Background / Context

A session is the main unit of ongoing collaboration. Users need to create, resume, search, fork, archive, and delete sessions without losing clarity. A new session is created when the first user message for that session is submitted.

## User / Business Requirement

The program must support a complete user-visible session lifecycle.

## Real User Scenarios

- A user resumes a previous session to continue a feature implementation.
- A user forks a session to try a different approach without changing the original conversation history.

## Functional Requirements

- The user must be able to create a new session.
- The program must create a new session when the first user message for that session is submitted.
- The user must be able to resume an existing session.
- The user must be able to find and inspect prior sessions.
- The user must be able to fork, archive, or delete sessions where supported.
- Session forking must preserve a visible relationship to the parent session and fork turn.

## Non-Functional Requirements

- Session history must survive normal application restarts.
- Session operations must not silently corrupt or overwrite existing history.

## Acceptance Criteria

- Given an existing session, when the application restarts, then the user can find and resume that session.
- Given no session exists yet for a new conversation, when the user sends the first message, then the program creates the session.
- Given a forked session, when the user continues in the fork, then the original session history remains unchanged.
- Given a forked session is inspected, when parent session data remains available, then the user can identify and navigate to the parent session and fork turn.
- Given a session is archived, when the user views active sessions, then the archived session no longer appears as active but remains recoverable if supported.
- Given a session is deleted, when deletion completes, then the program reports whether associated persisted data was removed or retained by policy.

## Out of Scope

- The program does not define session ID format, storage layout, or session-list UI in this L1 requirement.
- This requirement does not require every session operation to be reversible.

## Open Questions

- Should every session be bound to one workspace, many workspaces, or no workspace?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines the durable JSONL session data model. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added explicit parent-session and fork-turn traceability for session forking. |
| 1 | 2026-05-21 | Human | Refinement | Clarified that a new session is created when the first user message is submitted. |
