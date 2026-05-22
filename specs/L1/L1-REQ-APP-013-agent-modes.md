---
artifact_id: L1-REQ-APP-013
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-APP-013 — Agent Modes

## Purpose

Allow the program to support distinct operating modes without splitting the core agent runtime into separate programs.

## Background / Context

The program is primarily a coding agent, but users may also need a security-focused operating mode for authorized security work. These modes should share the same session, tool, model, context, safety, persistence, and client architecture while allowing mode-specific instructions, tool defaults, permission expectations, reporting expectations, and safety rules.

The initial mode set should include Coding Mode and Security Mode. A mode is a user-visible operating profile, not a separate program and not divided into smaller formal categories.

Mode is session-scoped after a session exists. Before the first user message is sent, no session has been created yet; the user is editing a pending mode selection initialized from the persisted default mode where a default is configured. When the first user message is sent, the program creates the session using the current pending mode selection and locks that mode for the session.

Session-level agent modes are distinct from TUI session-local input modes such as Shell Mode and Plan Mode. TUI input modes may change how composer input is interpreted within a session, but they must not change the session-level agent mode.

## User / Business Requirement

The program must support user-visible agent modes that configure behavior for different work contexts while preserving common platform guarantees.

## Functional Requirements

- The program must support Coding Mode as an operating mode for software development and coding-agent workflows.
- The program must support Security Mode as an operating mode for authorized security work.
- The active session mode must be visible to the user.
- Before a session exists, the program must initialize the pending mode selection from the persisted default mode where a default mode is configured.
- Before the first user message is sent, the user must be able to select or change the pending mode selection where mode selection is supported.
- When the user changes the pending mode selection before sending the first user message, the program must automatically persist that selected mode as the default mode configuration.
- When the first user message is sent, the program must create the session using the current pending mode selection.
- The user must be able to inspect the active session mode.
- Once the first user message has been sent, the program must not allow the user to change that session's active mode.
- If the user needs a different mode, the program should direct the user to create or fork a session with the desired mode where supported.
- A mode may configure base instructions, tool defaults, skills, MCP integrations, permission posture, safety rules, and reporting expectations.
- Mode-specific behavior must be represented in model context where relevant.
- Modes must not create separate, incompatible session semantics for history, persistence, approvals, or tool visibility.
- Modes must remain distinct from client-local input modes such as Shell Mode and Plan Mode.

## Non-Functional Requirements

- Mode behavior must be predictable and auditable.
- Mode selection must not weaken safety, privacy, permission, or workspace boundaries.
- Mode-specific configuration must remain understandable to users.
- Shared platform behavior should remain consistent across modes unless a mode explicitly changes user-visible behavior.

## Acceptance Criteria

- Given the program supports multiple modes, when the user inspects the session state, then the active mode is visible.
- Given a default mode is configured, when no session has been created yet, then the pending mode selection is initialized with that default mode.
- Given the first user message has not been sent, when the user changes the pending mode selection, then that mode is automatically persisted as the default mode configuration.
- Given the first user message is sent, when the program creates the session, then the session's active mode is set from the current pending mode selection.
- Given Coding Mode is active, when the user performs ordinary software development work, then the program uses coding-oriented defaults and reporting expectations.
- Given Security Mode is active, when the user performs authorized security work, then the program uses security-oriented instructions, tools, safety rules, and reporting expectations.
- Given the first user message has been sent, when the user attempts to change that session's active mode, then the program refuses the change and preserves the existing session mode.
- Given the user needs a different mode after a session has started, when mode selection is required, then the program can direct the user to create or fork a session with the desired mode where supported.
- Given a mode changes tool availability or permission posture, when the user inspects effective configuration, then the mode-specific effect is visible.
- Given the TUI enters Shell Mode or Plan Mode, when the user inspects the session-level agent mode, then Coding Mode or Security Mode remains unchanged.

## Out of Scope

- This requirement does not define the exact session-creation command, configuration file format, client UI design, or internal prompt layout.
- This requirement does not define formal subdivisions inside Security Mode.
- This requirement does not allow any mode to bypass safety, approval, privacy, permission, or workspace boundaries.

## Open Questions

- Which mode should be the default for a new session?
- Should mode defaults be global, workspace-specific, or selected explicitly for every new session?
- Which mode-specific settings should be persistent defaults, workspace defaults, or fixed session-level settings?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-TUI-009 | 1 | specs/L1/L1-REQ-TUI-009-session-input-modes.md | Distinguishes session-level agent modes from session-local TUI input modes. |
| refined-by | TBD | TBD | specs/L2/app/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft from approved user requirement. |
| 1 | 2026-05-21 | Human | Refinement | Made mode session-scoped and disallowed mode changes during a session. |
| 1 | 2026-05-21 | Human | Refinement | Allowed mode changes before the first user message and persisted that choice as default mode configuration. |
| 1 | 2026-05-21 | Human | Refinement | Clarified that no session exists before the first user message and that the pending mode selection is used at session creation. |
| 1 | 2026-05-21 | Human | Refinement | Clarified that session-level agent modes are distinct from TUI session-local input modes. |
