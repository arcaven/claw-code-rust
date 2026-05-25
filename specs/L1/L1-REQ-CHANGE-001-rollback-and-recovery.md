---
artifact_id: L1-REQ-CHANGE-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-22
---

# L1-REQ-CHANGE-001 — Rollback and Recovery

## Purpose

Ensure that users can understand and recover from risky or unwanted file changes made during agent work.

## Background / Context

Git-oriented change management helps in repositories, but the program may also work in non-git workspaces or encounter failed edits, partial writes, interrupted turns, and destructive operations. Users need a product-level way to understand what changed and how to undo or recover from it.

Rollback and recovery must protect user trust, especially when edits are broad, destructive, partially applied, or not yet verified.

## User / Business Requirement

The program must help users recover from risky, failed, or unwanted changes, including changes outside normal git workflows.

## Functional Requirements

- The program must make user-visible file changes attributable to a task where possible.
- The program must warn when an operation may be destructive, broad, or difficult to undo.
- The program must preserve enough information for users to understand what changed.
- The program must provide or explain a recovery path when edits fail, are interrupted, or produce unwanted results.
- The program must support rollback guidance for non-git workspaces where automatic rollback is not available.
- The program must not silently discard user-created changes while attempting recovery.
- When immediate message editing supersedes the latest turn, the program must attempt to restore file changes attributable to that superseded turn before the replacement turn runs.
- If a file changed by the superseded turn has diverged after that turn, the program must skip automatic restoration for that file and preserve the current file state unless the user explicitly chooses a destructive reset policy.
- The program should prefer structured per-tool restoration data for known file-editing tools and may use workspace-level checkpoints for changes that are otherwise difficult to attribute.

## Non-Functional Requirements

- Recovery behavior must prioritize preserving user data over convenience.
- Rollback guidance must be clear enough for users to act on without inspecting internal implementation details.
- Recovery mechanisms must respect workspace, safety, and permission boundaries.
- Automatic rollback must not hide failures or make additional risky changes without clear user intent.

## Acceptance Criteria

- Given the program changes files, when the task finishes, fails, or is interrupted, then the user can identify the changed files where possible.
- Given a potentially destructive operation is requested, when the program is about to act, then the user receives an appropriate warning or approval path.
- Given an edit fails after partial changes, when the program reports failure, then it explains the partial state and recovery options.
- Given the workspace is not managed by git, when the user asks how to undo changes, then the program provides the best available recovery guidance instead of assuming git is available.
- Given user-created changes exist before recovery, when the program attempts rollback, then it avoids overwriting those changes without explicit user intent.
- Given immediate message editing supersedes a turn that changed files, when restoration runs, then the program reports which files were restored, skipped, or unsupported.
- Given a superseded turn changed files through a shell command and no reliable checkpoint exists, when restoration runs, then the program does not pretend those shell changes were restored.

## Out of Scope

- Specific snapshot mechanisms, backup storage formats, patch inversion algorithms, and git command implementation are not specified here.
- This requirement does not guarantee automatic rollback for every operation or every workspace type.
- This requirement does not replace the separate git change management requirement for repository-specific workflows.

## Open Questions

- Which file operations require a pre-change snapshot or explicit rollback plan?
- Should automatic rollback be opt-in, opt-out, or only used after explicit user approval?
- How long should recovery artifacts be retained?
- Should git-based turn checkpoints be mandatory in git workspaces, or should per-tool inverse records remain the primary mechanism?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-CONV-005 | 1 | specs/L1/L1-REQ-CONV-005-immediate-message-editing.md | Immediate message editing requires rollback of file changes from the superseded turn where safe. |
| refined-by | TBD | TBD | specs/L2/change/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft approved for L1 expansion. |
| 1 | 2026-05-22 | Human | Refinement | Added immediate-message-edit restoration requirements and checkpoint considerations. |
