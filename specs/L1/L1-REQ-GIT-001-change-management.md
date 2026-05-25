---
artifact_id: L1-REQ-GIT-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-22
---

# L1-REQ-GIT-001 — Change Management

## Purpose

Help users manage code changes safely and intentionally.

## Why This Matters

Git operations can publish or preserve work. Users need the program to distinguish task changes from unrelated local changes and to avoid staging, committing, or pushing without clear intent.

## Background / Context

The program modifies code in working repositories. Users need to understand diffs, avoid unrelated changes, verify work, and create branches or commits on request.

## User / Business Requirement

The program must provide git-oriented change management for repository work.

## Real User Scenarios

- A user asks the program to commit only the files changed for the current task while unrelated local files are dirty.
- A user asks for a branch and pull request after verification passes.

## Functional Requirements

- The program must be able to show current branch and working-tree status.
- The program must distinguish task-related changes from unrelated pre-existing changes where possible.
- The program must support showing or summarizing diffs.
- The program must stage, commit, branch, push, or create pull requests only when requested or approved by the user.
- The program may use internal git objects, hidden refs, or ghost commits as implementation details for turn-level workspace checkpoints, provided they are not presented as user-authored commits and do not publish or rewrite visible history without explicit user intent.

## Non-Functional Requirements

- The program must avoid including unrelated files in commits.
- Commit messages must describe the actual change.
- Internal git checkpoints must remain distinguishable from user-requested branches, commits, staging, pushes, and pull requests.

## Acceptance Criteria

- Given unrelated dirty files, when the user asks for a commit, then the program does not include those files without explicit intent.
- Given verification failures, when the program reports or commits changes, then the failure is disclosed.
- Given the user asks to stage changes, when task-related and unrelated files are both present, then the program stages only the intended files or asks for clarification.
- Given a push or pull request is requested, when the repository state prevents it, then the program explains the blocker.
- Given the program uses a hidden git checkpoint for restoration, when the user inspects normal git history, then the checkpoint is not confused with a user-authored commit.

## Out of Scope

- The program does not define git command implementation, hosting-provider integration, or merge-conflict algorithms in this L1 requirement.
- This requirement does not permit automatic publication of code changes without user intent.
- This requirement does not permit hidden checkpoint machinery to silently discard user changes unless a separate explicit destructive reset policy is chosen by the user.

## Open Questions

- Should the program create task branches automatically for certain workflows?
- Should internal git checkpoints be implemented as hidden refs, temporary commits, worktree snapshots, or another mechanism?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| related-to | L1-REQ-CONV-005 | 1 | specs/L1/L1-REQ-CONV-005-immediate-message-editing.md | Immediate message editing may use hidden git checkpoints for superseded-turn restoration. |
| refined-by | TBD | TBD | specs/L2/git/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-22 | Human | Refinement | Added internal git checkpoint constraints for turn-level restoration. |
