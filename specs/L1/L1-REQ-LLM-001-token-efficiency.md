---
artifact_id: L1-REQ-LLM-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-LLM-001 — Token Efficiency

## Purpose

Reduce unnecessary model cost and latency while preserving task quality.

## Why This Matters

Token use affects cost, speed, and model reliability. Efficient context construction helps the program stay responsive and take advantage of provider caching without sacrificing user intent.

## Background / Context

Model providers may support prompt or prefix caching. Context construction should avoid avoidable churn in stable prompt prefixes. A stable context prefix is the key mechanism for maximizing cache hit rates across repeated turns.

Users may still change runtime configuration during a conversation, including access permissions, response persona, selected model, or generation state after an interruption. These changes must be represented without rewriting existing prefix content, because in-place updates to the context prefix can invalidate provider cache reuse.

## User / Business Requirement

The program must consider token efficiency and provider cache friendliness when constructing model context, and it must preserve stable context prefixes by representing in-conversation configuration changes through appended context rather than in-place prefix mutation.

## Real User Scenarios

- A user runs many turns in one session and expects unchanged instructions and tool definitions not to be needlessly churned.
- A user checks token usage and wants to understand how much context is read, generated, or cached.
- A user changes permissions, persona, or model during a conversation and expects the change to affect future behavior without rewriting earlier stable context.
- A user interrupts generation and resumes work, and the program records the new state without mutating the existing context prefix.

## Functional Requirements

- The program should keep stable context prefixes stable where program behavior allows.
- The program should avoid unnecessary reordering or rewriting of unchanged context.
- The program must represent dynamic in-conversation changes by appending new context or state rather than performing in-place updates to existing context prefix content.
- Dynamic changes that must preserve the existing context prefix include access permission changes, response persona changes, model switches, and generation interruption state changes.
- The program must avoid rewriting stable instructions, tool definitions, prior messages, or previous configuration records solely to reflect a later configuration change.
- The program should expose token usage and cached-token information where available.
- The program should avoid sending irrelevant large context to the model.

## Non-Functional Requirements

- Token optimization must not compromise correctness, safety, or user intent.
- Provider-specific optimization should remain compatible with provider-independent behavior.
- Cache-friendly context construction must be deterministic enough to debug why a cache hit was or was not expected.
- Append-only handling of runtime changes must preserve an auditable history of configuration changes that affected model behavior.

## Acceptance Criteria

- Given unchanged instructions and capabilities, when multiple turns run, then stable prompt content remains stable where possible.
- Given the user changes access permissions during a conversation, when the next model context is assembled, then the permission change is represented as appended state and the existing context prefix is not rewritten.
- Given the user changes response persona during a conversation, when future model responses are prepared, then the new persona is appended or otherwise represented without in-place mutation of earlier prefix content.
- Given the user switches models during a conversation, when the next model request is prepared, then model-specific request handling may change but existing context prefix content is not rewritten merely because the model changed.
- Given generation is interrupted, when the session continues, then interruption state is appended or recorded after the existing prefix rather than editing earlier context content.
- Given token usage data is available, when the user inspects model usage, then read, write, and cached-read usage are visible.
- Given a large irrelevant artifact is available, when model context is assembled, then the program avoids sending it unless it is needed for the task.
- Given an optimization would change task meaning or omit required safety context, when context is assembled, then correctness and safety take priority over token savings.

## Out of Scope

- The program does not define provider-specific cache protocols, token-estimation algorithms, or prompt serialization in this L1 requirement.
- This requirement does not require token savings at the cost of correctness, safety, or user intent.
- This requirement does not require preserving a stable prefix when a higher-priority safety or correctness requirement makes prefix mutation unavoidable.

## Open Questions

- Which token metrics should be required in the initial user interface?
- Which context segments are considered part of the stable cacheable prefix for each provider or model family?
- How should the client explain cache-impacting changes when a stable prefix cannot be preserved?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/llm/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added stable prefix preservation and append-only runtime configuration change requirements. |
