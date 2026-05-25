---
artifact_id: L1-REQ-TOOL-005
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-TOOL-005 — Background Process Management

## Purpose

Ensure that processes started by command execution tools remain visible and controllable when they continue running in the background.

## Background / Context

Command execution may start long-running or interactive processes. Some commands return an initial result while the underlying process continues running in the background. Users need to know which program-started processes are still active, inspect their state, and stop them manually when they are no longer needed.

## User / Business Requirement

The program must expose current background processes started by the program and let the user manually stop those processes from the client interface.

## Functional Requirements

- The program must track background processes started by command execution tools.
- The program must expose current background processes to the client interface while those processes remain active.
- The client interface must show enough process information for the user to identify the process, such as command label, process identifier, workspace or session association, runtime status, and recent output availability.
- The client interface must provide a manual stop action for a selected background process.
- When a user requests a background process stop, the program must update the client-visible process state to indicate whether the process is stopping, stopped, exited, or could not be stopped.
- Background process output must remain accessible enough for the user to inspect what the process is doing or did before it stopped.
- A background process that continues after the originating turn completes must remain visible until it exits or is stopped by the user.

## Non-Functional Requirements

- Background process state must update timely enough that users do not confuse an active process with a completed command.
- Stop controls must avoid terminating unrelated host processes.
- Process output display must be bounded so a noisy background process does not make the client unusable.
- The process list and stop action must be understandable without requiring users to inspect logs.

## Acceptance Criteria

- Given a command execution tool starts a long-running process, when the process remains active in the background, then the client interface shows it in the current background process list.
- Given a background process is shown, when the user inspects it, then the user can identify which command and workspace or session started it.
- Given a background process is producing output, when the user opens or inspects that process, then the user can access recent output or an available output view.
- Given the user manually stops a background process, when the stop request is accepted, then the client-visible state changes to stopping and eventually stopped or failed-to-stop.
- Given the originating turn has completed while a background process remains active, when the user views current background processes, then that process remains visible.
- Given a tracked background process exits on its own, when the client state updates, then the process is no longer presented as actively running.

## Out of Scope

- This requirement does not define platform-specific process termination signals, process-group behavior, or shell implementation details.
- This requirement does not require the program to manage arbitrary host processes that it did not start.
- This requirement does not define the exact client layout, keybinding, command name, or visual design for the process list.
- This requirement does not guarantee that every external process can be stopped immediately or cleanly.

## Open Questions

- Should exited background processes remain visible for a short review window before disappearing from the current process list?
- Should background process state be restored after an application restart, or only while the process supervisor is still running?
- Should stopping a background process require confirmation when the process appears to own child processes or unsaved output?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-TOOL-002 | 1 | specs/L1/L1-REQ-TOOL-002-tools.md | Built-in command execution creates the background process lifecycle this requirement controls. |
| related-to | L1-REQ-AGENT-002 | 1 | specs/L1/L1-REQ-AGENT-002-interrupt-resume.md | Interrupt and resume behavior includes stopping running tools and background tasks. |
| related-to | L1-REQ-TUI-004 | 1 | specs/L1/L1-REQ-TUI-004-state-visibility.md | The TUI must expose current execution state, including current background process state. |
| related-to | L2-DES-AGENT-002 | 1 | specs/L2/agent/L2-DES-AGENT-002-interrupt-resume-control.md | Active work inspection and interruption include tracked background process state. |
| related-to | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | Protocol methods expose active work inspection and tracked background process stop requests. |
| refined-by | TBD | TBD | specs/L2/tool/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft from approved user requirement. |
| 1 | 2026-05-22 | Human | Traceability | Linked background process management to agent interrupt/resume and protocol surfaces. |
