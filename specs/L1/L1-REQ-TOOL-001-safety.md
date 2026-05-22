---
artifact_id: L1-REQ-TOOL-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-TOOL-001 — Tool Output Safety

## Purpose

Prevent tool outputs from exposing secrets or unsafe content to model context, logs, or users unintentionally.

## Why This Matters

Tools can surface arbitrary local or remote content. Without output safety, a useful tool call can accidentally leak credentials into model context, logs, transcripts, or external systems.

## Background / Context

Tools can read files, run commands, fetch web content, and return arbitrary output. Outputs may include credentials or sensitive data.

## User / Business Requirement

The program must sanitize tool outputs when necessary before exposing them to model context or persistent records.

## Real User Scenarios

- A shell command prints an API key, and the program redacts it before sending output to the model.
- A fetched page contains sensitive tokens, and the program avoids storing or replaying them as ordinary context.

## Functional Requirements

- The program must detect likely secrets in tool output where feasible.
- The program must redact or withhold sensitive content before model exposure where required.
- The program must make redaction understandable to the user.
- The program must apply safety processing consistently across built-in and external tools where possible.

## Non-Functional Requirements

- Redaction must not rely solely on model judgment.
- Safety processing must avoid logging plaintext secrets.

## Acceptance Criteria

- Given tool output containing a likely API key, when the output is prepared for model context, then the secret is redacted or excluded.
- Given redacted output, when the user reviews the transcript, then the user can tell that redaction occurred.
- Given output safety removes content, when the model continues, then it receives a clear indication that data was withheld or redacted.
- Given a tool output is persisted, when safety rules apply, then the persisted representation avoids plaintext exposure where required.

## Out of Scope

- The program does not define exact secret patterns, redaction engine, or policy implementation in this L1 requirement.
- This requirement does not guarantee perfect detection of all sensitive data.

## Open Questions

- Which secret classes must be detected in the first milestone?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/tool/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
