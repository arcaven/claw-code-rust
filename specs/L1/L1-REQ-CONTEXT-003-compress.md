---
artifact_id: L1-REQ-CONTEXT-003
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-CONTEXT-003 — Context Compression

## Purpose

Support long conversations by replacing older detail with useful summaries when context grows too large.

## Why This Matters

Without compression, long sessions eventually fail or lose useful continuity. Compression lets the program keep moving while preserving the important intent, decisions, and task state from older history.

## Background / Context

The program must continue working across long sessions even when full raw history no longer fits in the model context window.

## User / Business Requirement

The program must compress older context when context usage reaches a configured threshold.

## Real User Scenarios

- A user works through a long implementation session and expects older decisions to survive as summary when raw history no longer fits.
- A user resumes after compression and expects the current objective, changed files, blockers, and verification status to remain available.

## Functional Requirements

- The program must detect when context usage approaches a threshold.
- The program must summarize eligible older history into a compact representation.
- The program must preserve recent conversation turns without unnecessary compression.
- The program must combine summary history with recent turns for future model calls.

## Non-Functional Requirements

- Compression must preserve task continuity and important decisions.
- Compression must avoid losing recoverability of the true historical record.

## Acceptance Criteria

- Given a session that exceeds the context threshold, when compression runs, then future context contains a summary plus recent turns.
- Given compressed history, when the user resumes work, then the agent retains the major goals, decisions, and constraints from earlier work.
- Given compression omits raw detail, when the user inspects history, then the original historical record remains recoverable outside the compressed model context where persistence allows it.
- Given recent turns are still active task context, when compression runs, then those recent turns are preserved rather than summarized away prematurely.

## Out of Scope

- The program does not define summary prompt design, threshold formulas, or storage representation in this L1 requirement.
- This requirement does not require summaries to preserve every historical token or low-value output detail.

## Open Questions

- How many recent turns should remain uncompressed by default?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/context/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
