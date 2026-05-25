---
artifact_id: L1-REQ-APP-011
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-APP-011 — Error Recovery

## Purpose

Help users recover from failures without losing work or understanding.

## Why This Matters

Failures are normal in agentic workflows. The product must turn them into understandable recovery paths instead of leaving users with partial state and vague errors.

## Background / Context

Model calls, tools, configuration, network access, permissions, persistence, and clients may fail. The program must turn those failures into actionable product behavior.

Large language model invocations can fail because of transient network issues, provider-side HTTP errors, rate limits, authentication failures, or malformed provider responses. Users need retry behavior for retryable failures and enough provider-returned detail to understand what happened.

## User / Business Requirement

The program must provide clear, user-visible error handling and recovery paths.

## Real User Scenarios

- A provider call fails because credentials are invalid, and the user receives a configuration-focused recovery path.
- A tool writes partial output and exits with an error, and the user can see what happened before deciding whether to retry.
- A model invocation fails with a retryable network error, and the program retries with increasing delay instead of failing immediately.
- A model provider returns an HTTP error response, and the client shows the provider-returned error details in a refined, readable UI rather than only showing a generic exception type.

## Functional Requirements

- The program must identify the phase where a failure occurred.
- The program must preserve completed history and outputs after partial failure.
- The program must suggest practical next steps when retry, configuration, input change, or approval can resolve the failure.
- The program must warn the user when a failure may have left partial file changes or inconsistent state.
- The program must retry retryable large language model network errors using an exponential backoff strategy.
- The program must expose the specific error details returned by model invocations, including HTTP error responses where available, instead of only exposing generic exception classes or failure labels.
- The client interface must present model invocation error details in a refined, readable, non-jarring way.

## Non-Functional Requirements

- Error messages must be actionable rather than generic.
- The program must avoid silent data loss.
- Retry behavior must be bounded so it does not leave users waiting indefinitely.
- Detailed provider errors must be visible without overwhelming the main task flow.
- Error presentation must preserve usability and visual polish even when the underlying provider response is verbose or technical.

## Acceptance Criteria

- Given a provider failure, when the turn fails, then the user can identify that the provider or model call failed.
- Given a retryable network error occurs during a model invocation, when the program can safely retry, then it retries using exponential backoff before reporting final failure.
- Given a model provider returns an HTTP error response, when the client reports the failure, then the user can inspect the provider-returned error details.
- Given model invocation error details are displayed, when the user views them in the client interface, then they are presented in a readable and non-jarring UI treatment rather than as an unstyled raw exception dump.
- Given a tool failure after partial output, when the user reviews the transcript, then the partial output and failure summary remain visible.
- Given a failure leaves possible partial file changes, when the task stops, then the program warns the user to inspect the affected files.
- Given a retry is possible, when the program reports the error, then it explains the condition that must change before retrying.

## Out of Scope

- The program does not define error enum design, error codes, exact retry limits, backoff timing parameters, or crash-recovery implementation in this L1 requirement.
- This requirement does not define the exact visual design of error cards, panels, colors, typography, or disclosure controls.
- This requirement does not guarantee automatic recovery from all external service or system failures.

## Open Questions

- Which model invocation failures are considered retryable?
- What maximum retry count and maximum backoff delay should be used?
- Which provider error fields should be shown by default, and which should be hidden behind disclosure?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/app/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added model network retry, provider error detail display, and refined error UI requirements. |
