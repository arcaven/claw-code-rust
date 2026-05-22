---
artifact_id: L1-REQ-APP-006
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-APP-006 — Fuzzy Search

## Purpose

Help users quickly find capabilities and project information without exact names.

## Why This Matters

Users often remember partial names, rough concepts, or fragments from prior work rather than exact paths or command names. Fuzzy search reduces friction when navigating project files, sessions, skills, MCP capabilities, and commands.

## Background / Context

Users need to navigate skills, MCP capabilities, project files, commands, and prior context during agentic work.

## User / Business Requirement

The program must support fuzzy search across important user-facing entities.

## Real User Scenarios

- A user remembers part of a filename and uses fuzzy search to open the relevant project file.
- A user searches for an available skill or MCP tool without remembering its exact name.

## Functional Requirements

- The program must support fuzzy search for project files.
- The program must support fuzzy search for skills.
- The program must support fuzzy search for MCP servers, tools, resources, or templates where available.
- The program should support fuzzy search for sessions, transcript entries, and commands.

## Non-Functional Requirements

- Search results must be fast enough for interactive use.
- Search must respect workspace, privacy, and permission boundaries.

## Acceptance Criteria

- Given a partial file name, when the user searches, then matching project files are returned.
- Given configured skills or MCP capabilities, when the user searches by partial name, then relevant entries are discoverable.
- Given search results include different entity types, when results are shown, then the user can distinguish files, sessions, commands, skills, and MCP capabilities.
- Given a search crosses workspace data, when permissions restrict access, then restricted entries are omitted or clearly unavailable.

## Out of Scope

- The program does not define indexing algorithms, ranking formulas, or UI layout in this L1 requirement.
- This requirement does not require fuzzy search to expose private or permission-restricted data.

## Open Questions

- Should transcript and session search be included in the initial fuzzy-search scope?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/app/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
