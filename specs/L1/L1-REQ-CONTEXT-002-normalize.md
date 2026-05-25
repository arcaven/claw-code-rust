---
artifact_id: L1-REQ-CONTEXT-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-CONTEXT-002 — Context Normalization

## Purpose

Keep model context well-formed, bounded, and compatible with the currently selected model.

## Why This Matters

Malformed or oversized context can make the model misunderstand the task, lose tool-call structure, or exceed provider limits. Normalization keeps context safe to send and understandable when content is omitted.

## Background / Context

Conversation history can include large messages, tool outputs, structured tool-call pairs, and multimodal content such as text, images, and video. Invalid, oversized, or modality-incompatible context can harm model behavior and reliability.

Because users can switch models during a conversation, context normalization must account for the capabilities of the currently selected model before each request.

## User / Business Requirement

The program must normalize context items before they are used for model calls.

## Real User Scenarios

- A command produces thousands of lines of output, and the program includes a bounded representation instead of flooding the next model call.
- A tool call and result are preserved together so the model does not see an orphaned tool output.
- A user switches from a multimodal model to a text-only model, and unsupported image or video context is removed before the next model request.

## Functional Requirements

- The program must bound individual context item size.
- The program must truncate oversized items in a visible and structured way.
- The program must preserve tool input and output pairing.
- The program must avoid model context states with orphaned tool calls or orphaned tool outputs.
- The program must normalize context against the currently selected model's supported modalities before each model request.
- The program must remove modality content unsupported by the current model before sending the request, unless it can be converted into an approved supported representation.
- The program must make modality-based omission visible or explainable to the user when it affects task context.

## Non-Functional Requirements

- Normalization must preserve enough information for the model and user to understand what was omitted.
- Normalization must be deterministic enough for debugging and replay.
- Modality filtering must prevent unsupported modality payloads from being sent to model providers.
- Context normalization must remain valid when the user switches models mid-conversation.

## Acceptance Criteria

- Given an oversized tool output, when context is prepared, then the output is truncated instead of consuming unbounded context.
- Given a tool call record, when context is prepared, then the corresponding input and output relationship remains valid.
- Given an item is truncated, when the user or model sees the context representation, then the truncation is indicated rather than hidden.
- Given multiple item types have different risk profiles, when normalization runs, then each item type can use an appropriate bounded representation.
- Given the selected model does not support a modality present in context, when context is prepared, then content in that unsupported modality is removed or converted before the model request is sent.
- Given the user switches models mid-conversation, when the next context is prepared, then context is normalized for the newly selected model's modality capabilities.
- Given unsupported modality content is removed, when the user needs to understand model behavior, then the omission is visible or explainable.

## Out of Scope

- The program does not define exact size limits, truncation format, or serialization schema in this L1 requirement.
- The program does not define modality conversion algorithms, OCR, video transcription, or provider-specific payload formats in this L1 requirement.
- This requirement does not require preserving full raw content inside model context when it exceeds limits.

## Open Questions

- What item types require different maximum-size policies?
- Which modality conversions are acceptable before removing unsupported context content entirely?
- How should the client display modality-based omissions from model context?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/context/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added model-switching and unsupported modality normalization requirements. |
