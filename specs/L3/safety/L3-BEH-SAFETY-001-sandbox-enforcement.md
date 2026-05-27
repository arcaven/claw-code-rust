---
artifact_id: L3-BEH-SAFETY-001
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-SAFETY-001 — Sandbox Enforcement

## Purpose

Define the `Sandbox` trait and `SandboxPolicy` — the OS-boundary enforcement layer that constrains process execution and network egress. This is the ONLY responsibility of the `safety` crate. All permission types live in `core`.

## Source Design

L2-DES-SAFETY-001, L3-DES-ARCH-001

## 1. Sandbox Trait

```rust
/// Defined in safety crate.
/// Implementations: seccomp-based (Linux), seatbelt (macOS), none (Windows MVP).
#[async_trait]
pub trait Sandbox: Send + Sync {
    /// Constrain a Command before spawning. Applies filesystem and network
    /// restrictions according to the policy.
    fn constrain_command(
        &self,
        command: &mut std::process::Command,
        policy: &SandboxPolicy,
    ) -> Result<(), SandboxError>;

    /// Check whether a network request to `target` is allowed.
    /// Returns true if allowed, false if blocked.
    fn allow_network(
        &self,
        target: &url::Url,
        policy: &NetworkEgressFilter,
    ) -> bool;
}

pub struct SandboxPolicy {
    pub readable_paths: Vec<PathBuf>,
    pub writable_paths: Vec<PathBuf>,
    pub deny_paths: Vec<PathBuf>,
    pub allow_network: bool,
    pub allow_subprocesses: bool,
}

pub struct NetworkEgressFilter {
    pub allowed_domains: Vec<String>,
    pub denied_domains: Vec<String>,
}

pub struct SandboxError {
    pub code: SandboxErrorCode,
    pub message: String,
}

pub enum SandboxErrorCode {
    UnsupportedPlatform,
    PolicyTooRestrictive,
    SeccompFailure,
    InternalError,
}
```

## 2. Platform-Specific Behavior

### Linux (seccomp)

- Use `libseccomp` to block syscalls outside the policy.
- Allow: `read`, `write`, `openat`, `close`, `fstat`, `mmap`, `brk`, `rt_sigaction`, etc.
- Block: `ptrace`, `mount`, `chmod`, `chown`, `setuid`, `reboot`, etc.
- Filesystem filtering via seccomp argument inspection on `openat` (path prefix matching).

### macOS (Seatbelt / sandbox-exec)

- Generate a Seatbelt profile `.sb` file from the policy.
- Apply via `sandbox-exec` or `sandbox_init`.
- Profile restricts: `file-read*`, `file-write*` to allowed paths, `file-read*` / `file-write*` deny for deny paths.
- Network: `(deny network*)` when network disabled.

### Windows MVP

- No kernel-level sandbox initially.
- Apply process creation restrictions via job objects.
- Filesystem: NTFS ACLs where possible.
- Network: firewall rules or proxy interception.

## 3. Integration Point

The `Sandbox` is called by `core::ShellHandler::handle()` before spawning a command:

```rust
// In core::tools::handlers::shell::ShellHandler
async fn handle(&self, ctx: ToolContext, input: Value, progress: Option<ToolProgressSender>)
    -> Result<ToolOutput, ToolError>
{
    let shell_input: ShellInput = serde_json::from_value(input)?;

    // ... validation, authorization ...

    let mut command = std::process::Command::new("sh");
    command.args(["-c", &shell_input.command]);

    // Apply sandbox (safety crate)
    self.sandbox.constrain_command(
        &mut command,
        &SandboxPolicy {
            readable_paths: ctx.permission_profile.readable_paths(),
            writable_paths: ctx.permission_profile.writable_paths(),
            deny_paths: ctx.permission_profile.denied_paths(),
            allow_network: ctx.permission_profile.network_enabled(),
            allow_subprocesses: true,
        },
    )?;

    // Spawn
    let child = command.spawn()?;
    // ... capture output ...
}
```

## 4. What `safety` Does NOT Contain

- ❌ `PermissionProfile`, `PermissionMode`, `PermissionPreset` → these are in `core`
- ❌ `ApprovalsReviewer`, `ApprovalCache`, `ApprovalScope` → these are in `core`
- ❌ `authorize_tool_request()` → in `core`
- ❌ `resolve_access()`, `can_read()`, `can_write()` → in `core`
- ❌ Auto-reviewer logic, circuit breaker → in `core`
- ❌ Escalation tiers, prefix rules → in `core`
- ❌ Any tool output redaction → in `core` (handler-level)

## 5. Error Handling

| Scenario | Behavior |
|---|---|
| Platform not supported | `SandboxError::UnsupportedPlatform` — handler falls back to no sandbox (logs warning) |
| seccomp filter fails to load | `SandboxError::SeccompFailure` — handler fails the tool call with `ToolError::ExecutionFailed` |
| Policy has no readable paths | `SandboxError::PolicyTooRestrictive` — command would be unable to run, fail early |
| Network request to denied domain | `allow_network()` returns `false` — handler blocks the request |

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-SAFETY-001 | specified-by |
| L3-DES-ARCH-001 | specified-by |

## Implementation Placement Guidance

- The safety crate owns OS/process-boundary enforcement only: `Sandbox`, platform-specific implementations, `SandboxPolicy`, and `NetworkEgressFilter`.
- Permission-domain types and approval decisions belong to core, even if stale implementations currently place them elsewhere.
- Credential redaction and secret detection for tool outputs belong near core/tool output handling because they are content-safety behavior, not OS sandbox enforcement.
