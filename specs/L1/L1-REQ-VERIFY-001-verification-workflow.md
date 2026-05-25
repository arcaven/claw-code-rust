---
artifact_id: L1-REQ-VERIFY-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-VERIFY-001 — Verification Workflow

## Purpose

Ensure that work performed by the program is verified before it is presented as complete.

## Why This Matters

Verification is the difference between attempted work and trustworthy work. Users need to know what was checked, what failed, what was skipped, and what risk remains.

## Background / Context

Coding-agent work often changes files, runs tools, updates configuration, or diagnoses failures. Users need to know whether the result was actually checked, which checks were run, and what residual risk remains.

Verification is a user-facing workflow, not only a CI concern. The program should connect implementation work with appropriate tests, checks, or explicit statements that verification was not possible.

## User / Business Requirement

The program must support a verification workflow for user-requested work and must report verification status clearly.

## Real User Scenarios

- A user asks for a bug fix and expects the relevant test or check to run before the program claims success.
- A user asks for a UI change where automated checks pass but manual visual verification is still required or explicitly skipped.

## Functional Requirements

- The program must identify relevant verification steps for tasks that change code, configuration, generated artifacts, or behavior.
- The program must run relevant checks when they are available and appropriate.
- The program must distinguish unit tests, integration tests, end-to-end tests, build checks, lint checks, static analysis, and manual verification requirements where relevant.
- The program must report checks that passed, failed, were skipped, or could not be run.
- The program must avoid claiming completion when required verification failed or was not performed.

## Non-Functional Requirements

- Verification reporting must be clear enough for the user to understand confidence and residual risk.
- Verification should prefer automated checks when available.
- Verification must not hide failures behind generic success messages.

## Acceptance Criteria

- Given a task that changes code, when the program finishes, then the final response states which verification steps were run and their results.
- Given a relevant check fails, when the program reports final status, then the failure is visible and the task is not represented as fully verified.
- Given verification cannot be run, when the program finishes, then the final response explains why and identifies the remaining risk.
- Given the user requested specific verification commands, when the program verifies the work, then those commands are run or the reason they were not run is stated.
- Given verification passes for only part of the change, when the program reports final status, then it distinguishes verified and unverified scope.

## Out of Scope

- The program does not define test framework selection, CI provider configuration, test discovery algorithms, or command execution implementation in this L1 requirement.
- This requirement does not guarantee that automated verification can prove every user-visible behavior.

## Open Questions

- Which task types require verification before the program may call the work complete?
- Should the program require user approval before running expensive or long verification commands?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/verify/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
