---
artifact_id: L3-BEH-SAFETY-002
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-SAFETY-002 — Approval Safety Integration

## Purpose

Define how approval decisions produced by the core permission pipeline are applied at the sandbox and process-boundary layer.

This document deliberately does not redefine `authorize_tool_request`, approval caching, auto-reviewer behavior, or user-prompt lifecycle. Those are owned by `L3-BEH-CORE-004`. The safety crate is responsible for enforcing the approved sandbox posture, refusing unsupported escalation shapes, and reporting enforcement outcomes.

## Source Design

L2-DES-SAFETY-001 (Permission System Architecture), L2-DES-SAFETY-002 (Approval Mechanism Design), L3-BEH-CORE-004 (Permission Evaluation and Approval Pipeline), L3-BEH-SAFETY-001 (Sandbox Enforcement)

## Behavior Specification

### B1. Authority Boundary

- **Trigger**: A tool call is ready to execute after mode, permission, and approval checks.
- **Preconditions**: Core has produced a terminal `PermissionDecision::Allow` or an approval has been resolved to allow.
- **Algorithm / Flow**:
  1. Core constructs an `ExecutionGrant` containing the authorized resource, sandbox mode, optional additional permissions, and approval provenance.
  2. Server passes the `ExecutionGrant` to the safety enforcement layer when the tool needs OS-boundary constraints, such as shell execution or network access.
  3. Safety validates that the grant is internally consistent.
  4. Safety applies sandbox constraints or reports that the grant cannot be enforced on the current platform.
- **Postconditions**: The tool either runs under the granted enforcement mode or fails closed before side effects occur.

### B2. Sandbox Mode Application

- **Trigger**: A command or external process is about to start.
- **Preconditions**: An `ExecutionGrant` exists.
- **Algorithm / Flow**:
  1. `SandboxMode::Normal`: apply the resolved `SandboxPolicy` derived from the session permission profile.
  2. `SandboxMode::AdditionalPermissions`: merge only the explicitly approved additional paths or network allowances into the sandbox policy for this one invocation.
  3. Explicit deny entries and protected metadata carveouts remain deny/read-only unless the user approved an explicit override that L2 permits.
  4. `SandboxMode::RequireEscalated`: do not apply normal sandbox constraints, but require approval provenance that proves core accepted full escalation.
  5. If the platform cannot enforce the requested normal or additional sandbox policy, return `SandboxUnavailable` or `UnsupportedPolicy` before spawning the process unless the approved grant explicitly allows unsandboxed fallback.
- **Postconditions**: The child process is constrained according to the approved mode.

### B3. Prefix Rule Provenance

- **Trigger**: A fully escalated command was allowed because a command-prefix rule matched.
- **Preconditions**: Core approval cache matched an existing `CommandPrefix` scope or the user approved a new prefix rule.
- **Algorithm / Flow**:
  1. Safety receives the matched prefix rule id or token sequence as provenance, not as an instruction to update approval cache.
  2. Safety records the prefix provenance in the execution audit fields.
  3. Safety must not broaden, normalize, or persist prefix rules. Prefix storage and matching remain in `L3-BEH-CORE-004`.
- **Postconditions**: Escalated execution remains auditable without duplicating approval-cache logic in the safety crate.

### B4. Enforcement Events

- **Trigger**: Safety applies or refuses sandbox enforcement.
- **Preconditions**: The server is executing a tool call.
- **Algorithm / Flow**:
  1. Emit an internal enforcement record with `tool_call_id`, `sandbox_mode`, `platform`, `policy_hash`, and `enforcement_result`.
  2. If enforcement fails, return a tool error before spawning.
  3. If enforcement is degraded but explicitly allowed by the grant, include a `safety_notice` in the tool result and server-client event.
  4. Do not include plaintext credentials or full command output in safety audit metadata.
- **Postconditions**: Clients can see safe summaries of degraded or failed enforcement, and durable records can explain why an action did or did not run.

### B5. Required Tests

- Normal sandbox policy is applied for shell commands inside the workspace.
- Additional permissions affect only the current tool invocation.
- Protected metadata paths such as `.git`, `.devo`, and `.agents` are not made writable by broad workspace grants.
- Require-escalated execution fails closed without approval provenance.
- Prefix-rule provenance is recorded but not persisted by the safety layer.
- Unsupported sandbox features fail closed unless the explicit grant permits fallback.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-SAFETY-001 | specified-by |
| L2-DES-SAFETY-002 | related-to |
| L3-BEH-CORE-004 | related-to |
| L3-BEH-SAFETY-001 | specified-by |

## Implementation Notes

- `L3-BEH-CORE-004` owns approval state and cache mutation.
- `L3-BEH-SAFETY-001` owns platform-specific sandbox primitives.
- This document owns the integration contract between an approved execution grant and the sandbox enforcement layer.

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Initial approval pipeline draft. |
| 2 | 2026-05-27 | Assistant | Correction | Removed duplicate approval-pipeline ownership and narrowed the document to safety enforcement integration. |
