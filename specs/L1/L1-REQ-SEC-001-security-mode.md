---
artifact_id: L1-REQ-SEC-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-SEC-001 — Security Mode

## Purpose

Support authorized security engagements as a first-class operating mode of the program.

## Background / Context

Security Mode is intended for authorized penetration testing engagements, software reverse engineering, vulnerability validation, web application penetration testing, and malware analysis. These activities need different instructions, tools, safety expectations, evidence handling, and reporting expectations from ordinary coding work.

Security Mode must remain bounded by authorization, scope, user control, and controlled execution requirements. Malware analysis is included in Security Mode, but suspected malware must not be dynamically executed on the host environment. Any behavior observation or execution of suspected malware must require a configured controlled environment such as a virtual machine, sandbox, isolated lab, or equivalent controlled analysis environment.

## User / Business Requirement

The program must provide a Security Mode for authorized security work while enforcing scope, safety, permission, evidence, and controlled-environment requirements.

## Functional Requirements

- The program must support Security Mode as a user-visible operating mode.
- Security Mode must support authorized penetration testing engagements, software reverse engineering, vulnerability validation, web application penetration testing, and malware analysis under one mode contract.
- Security Mode must make authorization and engagement scope visible or request clarification when scope is missing or ambiguous.
- Security Mode must support security-oriented tools, skills, MCP integrations, instructions, and reporting expectations where configured.
- Security Mode must preserve ordinary tool validation, permission, approval, sandbox, privacy, and audit behavior.
- Security Mode must distinguish static analysis of suspicious artifacts from dynamic execution of suspected malware.
- Security Mode must prevent suspected malware from being dynamically executed on the host environment.
- Security Mode must require a configured controlled environment before behavior observation, detonation, or execution of suspected malware can occur.
- Security Mode must report when a requested security action cannot proceed because authorization, scope, permissions, tools, or controlled environment requirements are missing.
- Security Mode final responses should preserve security-relevant evidence, assumptions, limitations, findings, and remediation guidance where applicable.

## Non-Functional Requirements

- Security Mode must fail closed when authorization, scope, or controlled-environment state is ambiguous.
- Security Mode must keep safety decisions explainable to the user.
- Security Mode must keep evidence and tool activity auditable.
- Security Mode must not weaken the user's privacy, permission, or workspace boundaries.
- Controlled-environment requirements must be clear enough that the user can understand why a host-side action was blocked.

## Acceptance Criteria

- Given Security Mode is active, when the user inspects session state, then the client identifies that the session is in Security Mode.
- Given the user requests security work without clear authorization or scope, when the program needs that information to proceed safely, then it asks for clarification or reports the missing requirement.
- Given Security Mode uses configured security tools or integrations, when the user inspects effective configuration or tool activity, then the relevant security capabilities are visible.
- Given a suspected malware sample is provided, when the user requests static analysis that does not execute the sample, then the program may proceed within ordinary safety and permission boundaries.
- Given a suspected malware sample is provided, when the user requests dynamic execution or behavior observation, then the program blocks host execution unless a controlled environment is configured and active.
- Given no controlled environment is configured, when malware execution is requested, then the program reports the missing controlled environment instead of executing on the host.
- Given Security Mode produces findings or conclusions, when the final response is presented, then relevant evidence, assumptions, limitations, and remediation guidance are included where applicable.

## Out of Scope

- This requirement does not define specific penetration testing methodology, reverse engineering workflow, vulnerability scoring scheme, malware sandbox implementation, or controlled-environment provider.
- This requirement does not define formal subdivisions inside Security Mode.
- This requirement does not authorize activity outside user-approved scope or applicable policy.
- This requirement does not require suspected malware to be executed; static analysis and refusal to execute without a controlled environment are valid outcomes.

## Open Questions

- What minimum authorization and engagement-scope fields should Security Mode require before high-risk work begins?
- What controlled-environment signals are sufficient before suspected malware dynamic execution may proceed?
- Which security tools, skills, and MCP integrations should be included in the first Security Mode milestone?
- How should Security Mode evidence be persisted, exported, or redacted?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | TBD | TBD | specs/L2/sec/TBD.md | L2 design has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft from approved user requirement. |
