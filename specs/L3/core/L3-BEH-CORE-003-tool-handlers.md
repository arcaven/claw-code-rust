---
artifact_id: L3-BEH-CORE-003
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-CORE-003 — Tool Handler Implementations and Registry

## Purpose

Define every built-in handler implementation in the `core` crate, the `ToolRegistryBuilder`, and mode/availability gating. The normative `ToolHandler`, `ToolSpec`, `ToolContext`, and `ToolOutput` contracts are defined by `L3-BEH-TOOLS-001`; this document may repeat small excerpts only for orientation.

## Source Design

L2-DES-TOOL-001, L3-BEH-TOOLS-001, L3-BEH-TOOLS-003, L3-BEH-TOOLS-004, L3-DES-ARCH-001

## 1. Imported Tool Contract Boundary

`L3-BEH-TOOLS-001` is the source of truth for the `tools` crate contract. If a type signature in this document diverges from `L3-BEH-TOOLS-001`, the contract document wins and this handler document must be corrected.

Core implements concrete handlers and registry construction, but it must not define a second incompatible `ToolHandler` trait.

```rust
#[async_trait]
pub trait ToolHandler: Send + Sync {
    fn spec(&self) -> &ToolSpec;

    async fn handle(
        &self,
        ctx: ToolContext,
        input: serde_json::Value,
        progress: Option<ToolProgressSender>,
    ) -> Result<ToolOutput, ToolError>;
}

pub struct ToolSpec {
    pub name: String,                    // unique, lowercase, alphanumeric + underscores, ≤64 chars
    pub display_name: String,
    pub description: String,             // model-facing, ≤1000 chars
    pub input_schema: JsonSchema,
    pub output_mode: ToolOutputMode,     // Text | Json | Mixed
    pub execution_mode: ToolExecutionMode,
    pub capability_tags: Vec<ToolCapabilityTag>,
    pub supports_parallel: bool,
    pub supports_cancellation: bool,
    pub supports_streaming: bool,
    pub preparation_feedback: ToolPreparationFeedback, // None | Spinner | ProgressBar
}

pub enum ToolExecutionMode {
    ReadOnly,
    Mutating,
    Command,
    BackgroundProcess,
    UserPrompt,
    Planning,
    GoalStatus,
    Delegation,
    Web,
    Internal,
    ExternalSideEffect,
}

pub enum ToolCapabilityTag {
    ReadFiles, WriteFiles, ExecuteProcess, NetworkAccess,
    SearchWorkspace, ReadImages, DelegateWork, ManagePlan,
}
```

## 2. ToolRegistry Trait & Builder (core implements, server consumes)

```rust
// In tools crate
pub trait ToolRegistry: Send + Sync {
    fn get(&self, name: &str) -> Option<&Arc<dyn ToolHandler>>;
    fn spec(&self, name: &str) -> Option<&ToolSpec>;
    fn list_available(&self, mode: &SessionMode, permission: &PermissionProfile) -> Vec<&ToolSpec>;
    fn list_all_specs(&self) -> &[ToolSpec];
}

// In core crate
pub struct ToolRegistryBuilder {
    handlers: HashMap<String, Arc<dyn ToolHandler>>,
    specs: Vec<ToolSpec>,
    deferred_policy: DeferredLoadingPolicy,
}

impl ToolRegistryBuilder {
    pub fn new() -> Self;
    pub fn register(mut self, handler: impl ToolHandler + 'static) -> Self;
    pub fn with_deferred_policy(mut self, policy: DeferredLoadingPolicy) -> Self;
    pub fn build(self) -> Arc<dyn ToolRegistry>;
}
```

## 3. Built-in Handler Catalog (all implementations in core)

| Handler | execution_mode | supports_parallel | supports_cancellation | supports_streaming |
|---|---|---|---|---|
| `ReadHandler` | ReadOnly | yes | no | no |
| `WriteHandler` | Mutating | yes | no | no |
| `ApplyPatchHandler` | Mutating | yes | no | no |
| `GrepHandler` | ReadOnly | yes | yes | yes |
| `GlobHandler` | ReadOnly | yes | yes | no |
| `LsHandler` | ReadOnly | yes | no | no |
| `ShellHandler` | Command | yes | yes | yes |
| `WebSearchHandler` | Web | yes | yes | no |
| `FetchUrlHandler` | Web | yes | yes | no |
| `PlanHandler` | Planning | no | no | no |
| `GoalUpdateHandler` | GoalStatus | no | no | no |
| `ApprovalHandler` | UserPrompt | no | no | no |
| `QuestionHandler` | UserPrompt | no | no | no |
| `SpawnAgentHandler` | Delegation | no | no | no |
| `SendMessageHandler` | Delegation | no | no | no |
| `FollowupTaskHandler` | Delegation | no | no | no |
| `WaitAgentHandler` | Internal | no | no | no |
| `ListAgentsHandler` | ReadOnly | no | no | no |
| `CloseAgentHandler` | Delegation | no | no | no |
| `MultiToolUseHandler` | Internal | n/a (parent) | yes | no |
| `ToolSearchHandler` | Internal | no | no | no |

## 4. Shell Handler — Detailed Behavior

```rust
struct ShellHandler {
    spec: ToolSpec,
    process_store: Arc<ProcessStore>,
    sandbox: Arc<dyn Sandbox>,  // from safety crate
}

struct ShellInput {
    description: String,   // required, ≤500 chars. Intent summary.
    command: String,        // required, ≤65536 chars.
    timeout_ms: Option<u64>, // default 120000
    cwd: Option<PathBuf>,
    env: Option<HashMap<String, String>>,
}

struct ShellOutput {
    exit_code: i32,
    stdout: String,     // bounded to output_limit_bytes
    stderr: String,     // bounded
    truncated: bool,
    signal: Option<i32>,
    duration_ms: u64,
}
```

**Execution flow:**
1. Validate `description` non-empty, `command` non-empty.
2. Parse command into segments split on `&&`, `||`, `;`. For background processes: detect trailing `&`.
3. Run `authorize_tool_request()` (core function) — checks permission profile, approval policy.
4. If denied/requires-approval: return `ToolError::ApprovalRequired` or `ToolError::Denied`.
5. Apply sandbox via `safety::Sandbox::constrain_command()`.
6. Spawn child process via `tokio::process::Command`. Capture stdout/stderr via pipes.
7. Stream output via `progress` channel if provided.
8. Wait for exit or timeout. If timeout: send SIGTERM, wait 5s, SIGKILL.
9. Redact output: scan for secret patterns. Apply `output_limit_bytes`.
10. Build `ToolOutput` with `StructuredStatus::Command { exit_code, signal }` and factual `result_summary`.

**Background process**: If command ends with `&`, register in `ProcessStore`. Handler returns immediately with process_id. Continued output captured asynchronously.

**Timeout/Retry/Cancel:**
- Timeout: `timeout_ms` (default 120s, max 600s).
- Retry: NOT retried. Shell commands are not idempotent.
- Cancel: SIGTERM → 5s → SIGKILL. Partial output captured.

## 5. Plan Handler — Detailed Behavior

```rust
struct PlanInput {
    operation: PlanOperation,
    objective: Option<String>,
    items: Option<Vec<PlanItemInput>>,
    status: Option<PlanStatus>,
}

enum PlanOperation {
    Create,
    UpdateItems,
    Complete,
    Block,
    Abandon,
}

struct PlanItemInput {
    plan_item_id: Option<String>,  // required for updates
    text: String,                  // ≤500 chars, user-visible
    status: PlanItemStatus,        // Pending | InProgress | Completed | Blocked | Canceled
    details: Option<String>,
    parent_item_id: Option<String>,
    parallel_group_id: Option<String>,
}
```

**Constraints:**
- `text` must be user-visible task description, NOT private model reasoning.
- Plan items must not expose chain-of-thought, uncertainty, or model internals.
- `parallel_group_id` groups items for explicit parallel execution visibility.

## 6. Goal Update Handler — Detailed Behavior

```rust
struct GoalUpdateInput {
    expected_goal_id: String,  // stale-state guard
    operation: GoalUpdateOperation,
    verification_summary: Option<String>,
    blocker_summary: Option<String>,
}

enum GoalUpdateOperation {
    MarkComplete,
    MarkBlocked,
}
```

**Constraints:**
- ONLY `MarkComplete` and `MarkBlocked` allowed.
- DISALLOWED (returns `ToolError::OperationNotAllowed`): create, replace, edit objective, change budget, pause, resume, clear, cancel.
- Stale `expected_goal_id` → no-op result with "Goal was replaced. Current objective: ...".

## 7. Tool Mode Gating

```rust
fn is_tool_available(spec: &ToolSpec, mode: &SessionMode) -> Availability {
    match (spec.execution_mode, mode.interaction_mode) {
        (Mutating | Command, InteractionMode::Plan | InteractionMode::Review) =>
            Availability::BlockedByMode,
        (UserPrompt, InteractionMode::Normal) if spec.name == "question" =>
            Availability::BlockedByMode,
        (Delegation, _) if !config.multi_agent_enabled =>
            Availability::Unsupported,
        _ => Availability::Available,
    }
}
```

## 8. Async Behavior per Handler

| Handler | Timeout | Retries | Cancel |
|---|---|---|---|
| ShellHandler | configurable, max 600s | 0 (not idempotent) | SIGTERM→5s→SIGKILL |
| WebSearchHandler | 30s | 1 on 5xx | Abort HTTP request |
| FetchUrlHandler | 30s | 1 on 5xx | Abort HTTP request |
| GrepHandler | 60s | 0 | Abort ripgrep process |
| ReadHandler | 5s | 0 | N/A |
| WriteHandler | 10s | 0 | N/A |
| All others | 30s | 0 | CancellationToken check |

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TOOL-001 | specified-by |
| L3-BEH-TOOLS-001 | specified-by |
| L3-BEH-TOOLS-003 | related-to |
| L3-BEH-TOOLS-004 | related-to |
| L3-DES-ARCH-001 | specified-by |

## Implementation Placement Guidance

- Final ownership follows `L3-DES-ARCH-001`: concrete handler implementations belong to core, while pure tool contracts belong to the tools crate.
- A conventional placement is `crates/core/src/tools/handlers/` for handlers and `crates/core/src/tools/registry_builder.rs` for registry construction. Existing handler files elsewhere are migration inputs only.
- Shell command parsing utilities may remain in a shared utility crate if they stay pure and do not own tool execution policy.
- `ProcessStore` belongs with core/session state because background process tracking participates in persistence, interruption, and replay.
