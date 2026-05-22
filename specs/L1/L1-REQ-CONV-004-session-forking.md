---
artifact_id: L1-REQ-CONV-004
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-22
---

# L1-REQ-CONV-004 — Session Forking

## Purpose

Allow users and subagents to start a new session from the context of an existing session at a specific conversational turn.

## Background / Context

Users may want to explore a different approach without changing the original session. Subagents also benefit from preserving current context when delegated work starts, because a forked session can carry the relevant conversation state into a bounded child workflow.

A forked session should behave like a new session for future work, while preserving a clear relationship to the parent session and fork turn. From the client perspective, inherited chat history should remain fully viewable. From the persistence perspective, the program should avoid a literal deep copy of the full history because that would consume unnecessary disk space.

Deleting, archiving, or exporting a parent session must not silently corrupt forked sessions that depend on inherited parent history.

Fork persistence must distinguish the fork's origin metadata from the inherited history needed to render and continue the fork. The parent session link is provenance and navigation metadata. It must not be the only way to replay the fork's inherited history, because the parent session may later be deleted or become unavailable.

After parent deletion, origin fields such as `parent_session_id` and `fork_turn_id` may remain only as non-dereferenceable provenance or tombstone metadata. The fork must not require opening the deleted parent session file to recover the inherited transcript.

## User / Business Requirement

The program must support forking a session from a specific conversational turn, preserving user-visible context while representing inherited history efficiently.

## Functional Requirements

- The user must be able to fork a session from a specific conversational turn where session forking is supported.
- A forked session must start a new session whose future turns do not mutate the parent session history.
- The forked session must preserve enough inherited context for the user or subagent to continue work from the selected turn.
- The client interface must allow the user to view the inherited chat history in a forked session.
- The program must represent forked session history using shallow-copy or reference-based behavior rather than requiring a literal deep copy of all parent history records.
- A forked session must persist or reference an inherited-history segment that remains replayable for the fork even if the parent session record is later deleted.
- A forked session must retain enough fork-origin display metadata, such as parent label, fork-turn label, and fork-turn digest, for the user to understand the origin even when parent navigation is unavailable.
- The client interface must clearly indicate that a session was forked from a parent session.
- The fork indicator must identify the relevant parent session and conversational turn.
- The fork indicator must allow the user to navigate back to the original parent session where the parent session remains available.
- Deleting a parent session must not make an existing forked session unusable.
- If a parent session is deleted or unavailable while a forked session remains, the forked session must preserve the inherited history needed for the fork without requiring the deleted parent session to be opened.
- If the parent session is deleted or unavailable, the fork indicator must preserve origin metadata and clearly indicate that parent navigation is unavailable.
- When a user deletes a session that has fork descendants, the program must report the impact on those forks and must not delete forked sessions unless the user explicitly requests cascade deletion where supported.
- Subagent creation should be able to use session forking when delegated work needs existing conversation context.

## Non-Functional Requirements

- Forking must avoid unnecessary disk growth from duplicating full chat histories.
- Forked sessions must preserve parent-child traceability for audit and navigation.
- Forked session rendering must remain understandable after application restart.
- Forked session replay must remain valid when the parent session is deleted, provided the fork itself is not deleted.
- Parent and forked session history must remain isolated from accidental cross-session mutation.

## Acceptance Criteria

- Given a session has multiple turns, when the user forks from a selected turn, then the program creates a new session whose inherited context corresponds to that turn.
- Given a forked session continues with new turns, when the user reviews the parent session, then the parent session history remains unchanged.
- Given the user opens a forked session, when the client renders the transcript, then inherited chat history is viewable without appearing as missing context.
- Given a forked session is displayed, when the user inspects the fork indicator, then the user can identify the parent session and fork turn.
- Given the parent session remains available, when the user activates the fork indicator, then the client can navigate to the original parent session.
- Given the parent session has been deleted or is unavailable, when the user opens a forked session, then the forked session remains usable, inherited history remains viewable, and the fork indicator reports that the parent is unavailable.
- Given the parent session has been deleted or is unavailable, when the user inspects the fork indicator, then the indicator still shows retained origin metadata without requiring the parent session link to resolve.
- Given the parent session storage has been removed, when the forked session is replayed from durable records, then replay does not require opening the deleted parent session file.
- Given a user deletes a session with fork descendants, when deletion is requested, then the program reports whether descendants will be preserved, deleted by explicit cascade, or blocked by policy.
- Given a session is forked from a long history, when persistence stores the fork, then the program avoids a full deep copy of the parent history records.
- Given a subagent is created with existing conversation context, when session forking is used, then the subagent receives the relevant inherited context without modifying the parent session.

## Out of Scope

- This requirement does not define session ID format, storage schema, reference-counting mechanics, or database implementation details.
- This requirement does not define exact client visual design for fork indicators or navigation controls.
- This requirement does not require fork navigation to succeed when the parent session has been deleted or is unavailable by policy.

## Open Questions

- Should users be able to fork from an active in-progress turn, or only from completed turns?
- Should forked sessions inherit all permissions and configuration from the parent, or snapshot only the context visible at the fork turn?
- Should subagent forked sessions be visible in the normal session list by default?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines fork references and retention behavior in the session data model. |
| related-to | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | L2 defines session fork, delete, and broadcast protocol behavior. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft from approved user requirement. |
| 1 | 2026-05-22 | Human | Refinement | Clarified parent deletion behavior for forked sessions. |
| 1 | 2026-05-22 | Human | Refinement | Distinguished fork origin metadata from replayable inherited-history storage. |
| 1 | 2026-05-22 | Human | Refinement | Clarified that parent origin links may become non-dereferenceable tombstone metadata after deletion. |
