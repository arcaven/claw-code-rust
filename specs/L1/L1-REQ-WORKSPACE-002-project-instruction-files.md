---
artifact_id: L1-REQ-WORKSPACE-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-WORKSPACE-002 — Project Instruction Files

## Purpose

Ensure that the program automatically discovers and reads project instruction files that define local working rules.

## Background / Context

Many coding projects include repository-local instruction files for agents or coding assistants. These files may describe coding style, safety expectations, verification commands, project structure, or workflow constraints. Users should not have to manually paste these instructions into every session.

The program should automatically read recognized instruction files where present and accessible, including `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, and `PROMPT.md`.

## User / Business Requirement

The program must automatically discover, read, and apply recognized project instruction files as part of workspace context.

## Functional Requirements

- The program must automatically look for recognized project instruction files in the current workspace where supported.
- Recognized project instruction files must include `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, and `PROMPT.md` where present.
- The program must read discovered instruction files before performing work that depends on workspace-specific rules.
- The program must make discovered instruction files available as part of the relevant workspace or model context.
- If multiple recognized instruction files are present, the program must handle them in a deterministic order or report any ambiguity that requires user clarification.
- If an instruction file cannot be read because it is missing, inaccessible, too large, or blocked by permissions, the program must handle that state clearly rather than silently assuming no instructions exist.
- User instructions in the active conversation must remain part of the instruction hierarchy and must not be silently overwritten by project instruction files.

## Non-Functional Requirements

- Instruction-file discovery must be predictable and auditable.
- Reading instruction files must respect workspace, privacy, and permission boundaries.
- Large instruction files must not cause unbounded context growth.
- Instruction files must be refreshed or invalidated when the workspace context changes in a way that could affect which instructions apply.

## Acceptance Criteria

- Given a workspace contains `AGENT.md`, when the program begins workspace-dependent work, then the file is discovered and considered as local project instructions.
- Given a workspace contains `AGENTS.md`, when the program begins workspace-dependent work, then the file is discovered and considered as local project instructions.
- Given a workspace contains `CLAUDE.md`, when the program begins workspace-dependent work, then the file is discovered and considered as local project instructions.
- Given a workspace contains `PROMPT.md`, when the program begins workspace-dependent work, then the file is discovered and considered as local project instructions.
- Given multiple recognized instruction files exist, when context is assembled, then their handling is deterministic or the user is told what ambiguity exists.
- Given an instruction file cannot be read, when the program begins work, then the user can understand that the instruction file was unavailable and why.
- Given project instructions are discovered, when a future model call is prepared for workspace-dependent work, then relevant discovered instructions are represented in context subject to context limits and instruction hierarchy.

## Out of Scope

- This requirement does not define exact directory traversal rules, precedence order, file-size limits, cache invalidation mechanics, or prompt serialization format.
- This requirement does not require the program to follow instructions that conflict with higher-priority safety, system, or user instructions.
- This requirement does not require reading instruction files outside the allowed workspace or permission boundary.

## Open Questions

- What search order and precedence should apply when multiple recognized instruction files exist?
- Should instruction files be discovered only at the workspace root, or also in nested directories relevant to edited files?
- How should instruction files be refreshed if they change during an active session?
- What maximum size should be allowed before an instruction file is summarized, truncated, or rejected?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/workspace/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft from approved user requirement. |
