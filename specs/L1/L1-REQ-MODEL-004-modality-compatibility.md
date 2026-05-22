---
artifact_id: L1-REQ-MODEL-004
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-MODEL-004 — Modality Compatibility

## Purpose

Ensure that the program remains model-agnostic while respecting the modality capabilities of the currently selected model.

## Background / Context

The program should support mainstream models rather than being tied to one provider or one model family. Mainstream models do not all accept the same input modalities. Some models accept text only, while others may accept images, video, or other multimodal inputs.

Because users can switch models during a conversation, previously valid context may contain modalities that the newly selected model does not support. The program must handle that mismatch before sending a model request.

## User / Business Requirement

The program must track model modality capabilities and must only send model context in modalities supported by the current model.

## Functional Requirements

- The program must support mainstream models through a model-agnostic design.
- Model configuration must represent supported input modalities, including at least text, image, and video where applicable.
- The program must allow model switching during a conversation where the program's policy permits it.
- Before a model request is sent, the program must compare the prepared context with the current model's supported modalities.
- Any context information in a modality unsupported by the current model must be removed from the model request or converted to a supported representation when an approved conversion path exists.
- The user must be able to understand when context was omitted because the selected model does not support a required modality.

## Non-Functional Requirements

- Modality filtering must happen before provider request submission.
- Modality compatibility behavior must be deterministic and auditable.
- Removing unsupported modalities must preserve conversation structure where possible.
- Model switching must not silently send unsupported modality payloads to a provider.

## Acceptance Criteria

- Given a text-only model is selected, when the conversation context contains images, then image payloads are removed or replaced with an approved supported representation before the request is sent.
- Given a model that does not support video is selected, when context contains video input, then the video modality is not sent to that model.
- Given context content is omitted because of modality incompatibility, when the user reviews the turn context or error explanation, then the omission is visible or explainable.
- Given the user switches from a multimodal model to a less capable model mid-conversation, when the next request is prepared, then unsupported modalities from earlier context are normalized out before invocation.
- Given a model supports a modality, when context contains that modality and policy allows it, then the program may include it in the model request.

## Out of Scope

- This requirement does not define provider-specific multimodal payload formats.
- This requirement does not define image, video, OCR, transcription, or summarization conversion implementations.
- This requirement does not require every mainstream model to support every modality.

## Open Questions

- Which mainstream models are required for the first milestone?
- Which modality conversions are acceptable when the target model does not support the original modality?
- Should omitted unsupported modality content remain visible in the client transcript even when excluded from the model request?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/model/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft from approved user requirement. |
