---
artifact_id: L1-REQ-CI-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-20
---

# L1-REQ-CI-001 — Continuous Integration

## Purpose

Define the baseline quality checks required for the project.

## Why This Matters

CI protects the project from regressions that local development may miss. A shared quality gate gives users and contributors a clear signal for whether code is formatted, builds, passes tests, and satisfies lint rules.

## Background / Context

The program is a Rust-based project. Contributors and agents need a shared quality gate for formatting, compilation, tests, and linting.

## User / Business Requirement

The project must provide a reliable CI quality gate for formatting, checking, testing, and linting.

## Real User Scenarios

- A contributor opens a pull request and expects CI to catch formatting, test, compile, and lint failures.
- A maintainer wants local verification commands to match the checks that will run in CI.

## Functional Requirements

- CI must run formatting checks.
- CI must run workspace tests.
- CI must run workspace compilation checks for all targets.
- CI must run clippy with warnings treated as errors.

## Non-Functional Requirements

- CI failures must be visible and actionable.
- The local verification commands should match CI expectations where practical.

## Acceptance Criteria

- Given a pull request, when CI runs, then formatting, tests, check, and clippy are executed.
- Given a lint warning, when CI runs clippy, then the CI job fails.
- Given a CI job fails, when the user inspects the result, then the failing command or check category is visible.
- Given local verification passes with the documented commands, when CI runs in the same supported environment, then CI should not fail because of mismatched baseline commands.

## Out of Scope

- The program does not define CI provider configuration, caching strategy, or release automation in this L1 requirement.
- This requirement does not guarantee that every platform-specific issue is caught by a single CI configuration.

## Open Questions

- Should CI include platform-specific jobs for macOS, Linux, and Windows?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/ci/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
