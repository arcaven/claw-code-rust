---
artifact_id: L1-REQ-APP-003
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-APP-003 — Application Safety

## Purpose

Protect user systems, files, credentials, and decision authority while the program performs agentic work.

## Why This Matters

The program can run commands, read files, edit code, and contact external services. Users must remain in control of risky actions and must be able to trust that boundaries are enforced.

## Background / Context

The program can execute tools, read files, modify code, access networks, and interact with external services. Safety must be a program guarantee. Some modes may add stricter safety rules for specialized work.

## User / Business Requirement

The program must enforce permissions, sandboxing, and user approval for actions that can affect user data, systems, or external resources.

## Real User Scenarios

- A command wants to write outside the workspace, and the user is asked for explicit approval before it runs.
- A network request is blocked by the current policy, and the program explains what permission would be needed.

## Functional Requirements

- The program must support permission modes for tool and resource access.
- The program must support sandboxing for risky execution where available.
- The program must enforce mode-specific safety rules where an active mode defines stricter behavior.
- The program must request explicit user approval for actions outside the current permission boundary.
- The program must record approval and denial outcomes in user-visible history.

## Non-Functional Requirements

- Safety decisions must be explainable to the user.
- The program must fail closed when permission state is ambiguous.

## Acceptance Criteria

- Given an action that exceeds current permissions, when the program attempts it, then the user receives an approval request before execution.
- Given a denied approval request, when the program continues, then it must not perform the denied action.
- Given permission state is unclear, when a risky action is requested, then the program refuses or asks for clarification instead of guessing.
- Given a user grants scoped approval, when later unrelated work requests broader access, then the earlier approval is not treated as unlimited permission.
- Given an active mode defines stricter safety behavior, when an action conflicts with that mode's safety rules, then the program blocks or escalates the action according to that mode.

## Out of Scope

- The program does not define sandbox implementation details or policy engine internals in this L1 requirement.
- This requirement does not promise that all operating systems provide identical sandbox strength.

## Open Questions

- Which permission modes should be exposed directly to users?
- Which mode-specific safety rules should be user-configurable, and which should be mandatory?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/app/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added mode-specific safety behavior. |
