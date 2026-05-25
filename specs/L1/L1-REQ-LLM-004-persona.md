---
artifact_id: L1-REQ-LLM-004
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-LLM-004 — Persona and Communication Style

## Purpose

Allow users to control the communication style used by the model-facing agent.

## Why This Matters

Different tasks and users require different communication styles. Configurable style helps the program match user expectations while keeping safety, correctness, and instruction hierarchy intact.

## Background / Context

Different users and tasks may require concise, detailed, formal, direct, or localized communication styles.

## User / Business Requirement

The program must support adjustable persona or communication style settings.

## Real User Scenarios

- A user selects a concise style for implementation tasks and expects shorter final reports.
- A user switches to a more explanatory style while learning unfamiliar code.

## Functional Requirements

- The user must be able to select or configure a communication style.
- The selected style must influence model-facing instructions for future responses.
- The program must make the active style understandable to the user.
- The program must allow style changes without changing unrelated safety or tool behavior.

## Non-Functional Requirements

- Persona settings must not override higher-priority user, safety, or system constraints.
- Style changes should be durable when configured as a preference.

## Acceptance Criteria

- Given a selected concise style, when the model responds, then responses are shorter where task requirements allow.
- Given a style change, when a later turn begins, then the new style is used unless overridden.
- Given a style asks for brevity, when safety or verification details are important, then the program still includes necessary information.
- Given a project or system instruction conflicts with style preference, when the model responds, then higher-priority instructions take precedence.

## Out of Scope

- The program does not define prompt template implementation or style taxonomy in this L1 requirement.
- This requirement does not allow persona settings to override safety, user intent, or factual accuracy.

## Open Questions

- Which built-in styles should be available by default?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/llm/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
