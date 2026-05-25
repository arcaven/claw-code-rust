---
artifact_id: L1-REQ-INPUT-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-INPUT-001 — Attachments and Multimodal Input

## Purpose

Allow users to provide files, images, logs, and other artifacts as task context.

## Why This Matters

Many real tasks begin with screenshots, logs, documents, spreadsheets, or other artifacts. Users should not have to manually translate every artifact into plain text before the program can help.

## Background / Context

Coding and product work often depends on external artifacts such as screenshots, logs, documents, spreadsheets, design references, archives, or generated reports. Users should be able to attach or reference those artifacts without manually converting everything into plain text.

Attachments and multimodal inputs must be handled safely, with clear limits and clear representation in session history.

## User / Business Requirement

The program must support user-provided attachments and multimodal inputs as first-class task context where the active model and tools allow it.

## Real User Scenarios

- A user attaches a screenshot of a UI bug and asks the program to diagnose the layout issue.
- A user provides a log file or document and asks the program to extract the relevant failure or requirement.

## Functional Requirements

- The user must be able to provide file attachments or local artifact references as part of a task.
- The program must identify the type, size, and availability of attached artifacts.
- The program must make attached artifacts visible in the session or turn context.
- The program must use appropriate processing for text files, images, logs, documents, spreadsheets, archives, and other supported artifact types.
- The program must explain when an attachment cannot be used because of format, size, permission, model capability, or safety constraints.

## Non-Functional Requirements

- Attachment handling must respect privacy, permission, and workspace boundaries.
- Large attachments must not cause unbounded memory or context usage.
- The program must distinguish raw artifact storage from model-visible summarized or extracted content.

## Acceptance Criteria

- Given a user attaches a supported file, when the task begins, then the program can reference that artifact as part of the task context.
- Given an unsupported or inaccessible attachment, when the program tries to use it, then the user receives a clear explanation.
- Given a large attachment, when the program processes it, then the program applies bounded behavior and reports any truncation or summarization.
- Given an attachment requires a model capability that is unavailable, when the task starts, then the program explains the limitation and offers an alternate path where possible.
- Given an attachment is outside the workspace or permission boundary, when the program attempts to access it, then the normal approval or denial behavior applies.

## Out of Scope

- The program does not define file parser implementation, OCR implementation, archive extraction details, or provider-specific multimodal payload formats in this L1 requirement.
- This requirement does not guarantee that every artifact format can be interpreted.

## Open Questions

- Which attachment types are required for the first product milestone?
- Should attachments be persisted with session history or referenced by path only?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines item content parts and mentions for multimodal input and artifact references. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
