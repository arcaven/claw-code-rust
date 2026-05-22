---
artifact_id: L1-REQ-AGENT-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-AGENT-002 — Interrupt and Resume

## Purpose

Ensure that users can control long-running or misdirected work.

## Why This Matters

Agentic work can take time, call tools, and modify files. Users must be able to regain control quickly when the work is wrong, risky, too expensive, or no longer useful.

## Background / Context

Agentic work may include model generation, command execution, background processes, file edits, and delegated work. Users need predictable control over these activities.

## User / Business Requirement

The program must let the user interrupt, cancel, inspect, and resume work where recovery is possible.

## Real User Scenarios

- A user notices that the program is editing the wrong module and interrupts the task before more files change.
- A user stops model generation after noticing that the response is going in the wrong direction or spending unnecessary tokens.
- A user stops a long-running command, reviews the partial output, and resumes the task with new instructions.

## Functional Requirements

- The user must be able to interrupt current model generation.
- The user must be able to stop or cancel running tools and background tasks where safe.
- The user must be able to inspect current background processes before deciding whether to stop them.
- The program must preserve completed steps, outputs, and file-change state after interruption.
- The program must support resuming an interrupted task when enough context remains available.

## Non-Functional Requirements

- Interruption feedback must be visible and timely.
- The program must not silently leave background work running after a user cancellation.

## Acceptance Criteria

- Given an active turn, when the user interrupts execution, then the program shows that execution has stopped or is stopping.
- Given an interrupted task with recoverable context, when the user resumes, then the program continues with awareness of prior progress rather than treating it as a new task.
- Given a running tool cannot be stopped immediately, when the user cancels, then the program reports that cleanup is pending or explains the remaining process state.
- Given background processes started by the program are still running, when the user inspects active work, then the program exposes those processes before the user chooses whether to stop them.
- Given file changes exist after interruption, when the user reviews the task, then the program identifies which changes were produced before interruption.

## Out of Scope

- The program does not define platform-specific process termination signals, process-group handling, or UI keybindings in this L1 requirement.
- This requirement does not guarantee that every external process can be safely resumed after cancellation.

## Open Questions

- Should the program distinguish interrupt, cancel, abort, and pause as separate user actions?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-TOOL-005 | 1 | specs/L1/L1-REQ-TOOL-005-background-process-management.md | Background process management defines the process list and manual stop behavior used for background task control. |
| refined-by | L2-DES-AGENT-002 | 1 | specs/L2/agent/L2-DES-AGENT-002-interrupt-resume-control.md | Defines server-owned interrupt, active work inspection, cleanup, and resume behavior. |
| related-to | L2-DES-AGENT-001 | 1 | specs/L2/agent/L2-DES-AGENT-001-execution-engine.md | Interrupt and resume operate on active execution engine state. |
| related-to | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | Protocol requests and notifications expose interrupt and resume controls. |
| related-to | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | Durable records preserve interrupted and resumed turn state. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added inspection of current background processes before manual stop decisions. |
| 1 | 2026-05-21 | Human | Refinement | Added a real user scenario for stopping model generation. |
| 1 | 2026-05-22 | Human | Traceability | Linked the requirement to the L2 interrupt and resume control design. |
