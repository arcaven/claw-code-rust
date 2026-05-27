---
artifact_id: L3-BEH-CORE-002
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-CORE-002 — Turn Execution Engine

## Purpose

Define the turn execution state machine with precise phase transitions, the `query()` entry point server calls each cycle, tool dispatch integration, failure classification, and completion semantics.

## Source Design

L2-DES-AGENT-001, L3-DES-ARCH-001

## 1. Core Entry Point — `query()`

```rust
/// Called by server each model-invocation cycle within a turn.
/// Stateless — all state passed in, outcome returned.
pub async fn query(
    session: &SessionProjection,
    turn: &TurnRecord,
    context: &AssembledContext,
    model: &ResolvedModelProfile,
    tool_registry: &dyn ToolRegistry,
    permission_profile: &RuntimePermissionProfile,
    approval_cache: &mut ApprovalCache,
    cancel_token: &CancellationToken,
) -> Result<QueryOutcome, QueryError>;

pub enum QueryOutcome {
    /// Model produced a terminal response. Turn is done.
    TerminalResponse {
        response_item: ResponseItem,
        usage_delta: TurnUsage,
    },
    /// Model requested tool calls. Server must dispatch them.
    ToolCallsRequired {
        items: Vec<ToolCallItem>,
        usage_so_far: TurnUsage,
        context_to_continue: AssembledContext,
    },
    /// Context pressure requires compaction before proceeding.
    CompactionRequired {
        context: AssembledContext,
        compaction_range: (TurnId, TurnId),
    },
}

pub struct QueryError {
    pub code: QueryErrorCode,
    pub phase: ExecutionPhase,
    pub message: String,
    pub recoverable: bool,
    pub retry_after: Option<Duration>,
}

pub enum QueryErrorCode {
    ModelResolutionFailed,
    ProviderError(ProviderError),
    ContextAssemblyFailed,
    ContextLimitExceeded,
    ToolSchemaSerializationFailed,
    Cancelled,
    InternalError,
}
```

## 2. Execution Phase State Machine

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionPhase {
    Admission,
    ContextAssembly,
    Compaction,
    ModelInvocation,
    ToolDispatch,
    WaitingForUser,
    Finalization,
    Terminal,
}
```

### Transition Table

```
Admission ──► ContextAssembly          (turn admitted, durable input written)
Admission ──► Terminal(Failed)         (admission validation failure)

ContextAssembly ──► Compaction         (token estimate exceeds threshold)
ContextAssembly ──► ModelInvocation     (context ready, no compaction needed)
ContextAssembly ──► Terminal(Failed)    (assembly error, model resolution failure)

Compaction ──► ModelInvocation          (compaction succeeded)
Compaction ──► ModelInvocation          (compaction skipped — already compacted, insufficient history)
Compaction ──► Terminal(Failed)         (compaction critical failure, context unrecoverable)

ModelInvocation ──► ToolDispatch        (model returned tool calls)
ModelInvocation ──► Finalization        (model returned terminal response)
ModelInvocation ──► Terminal(Failed)    (provider error, context overflow)
ModelInvocation ──► Terminal(Interrupted) (cancellation token fired)

ToolDispatch ──► WaitingForUser         (approval or question required)
ToolDispatch ──► ModelInvocation        (all tools done, continue with results)
ToolDispatch ──► Finalization           (model indicated no more tool calls needed)
ToolDispatch ──► Terminal(Failed)       (tool execution critical failure)
ToolDispatch ──► Terminal(Interrupted)  (cancellation during tool execution)

WaitingForUser ──► ToolDispatch         (user responded, continue dispatching)
WaitingForUser ──► Terminal(Interrupted)(user cancelled, approval timeout)

Finalization ──► Terminal(Completed)    (all records persisted, usage finalized)
Finalization ──► Terminal(Failed)       (persistence failure)
```

### Illegal Transitions

| Transition | Reason |
|---|---|
| `Terminal → any phase` | Terminal states are final |
| `ToolDispatch → ContextAssembly` | Cannot go backward; results fed forward to ModelInvocation |
| `WaitingForUser → ModelInvocation` | Must go through ToolDispatch to resolve the pending tool |
| `ModelInvocation → ModelInvocation` (without tool dispatch between) | Must consume model output before next call |
| `Admission` skip to `ToolDispatch` | Context must be assembled before tool schemas are known |

## 3. Turn Lifecycle — Server Orchestration

Server owns the loop. Core is stateless per invocation.

```rust
// Server-side turn execution loop (pseudocode)
async fn execute_turn(
    store: &dyn SessionStore,
    session: &mut SessionProjection,
    turn: TurnRecord,
    model: &ResolvedModelProfile,
    registry: &dyn ToolRegistry,
    permission_profile: &RuntimePermissionProfile,
    cancel_token: CancellationToken,
) -> TurnOutcome {
    let mut context = assemble_context(session, &turn, model, registry)?;
    let mut approval_cache = ApprovalCache::new();
    let mut usage_total = TurnUsage::default();

    loop {
        // Check compaction
        if context.token_estimate > model.effective_context_window * 0.8 {
            let summary = compact_context(&context, store).await?;
            context = apply_compaction(context, summary);
        }

        // Normalize context
        context = normalize_context(context, model)?;

        // Call model via provider (server handles HTTP, core processes result)
        let outcome = query(
            session, &turn, &context, model, registry,
            permission_profile, &mut approval_cache, &cancel_token,
        ).await?;

        match outcome {
            QueryOutcome::TerminalResponse { response_item, usage_delta } => {
                usage_total += usage_delta;
                store.append(turn.session_id, ItemCompleted { ... }).await?;
                return TurnOutcome::Completed { response: response_item, usage: usage_total };
            }
            QueryOutcome::ToolCallsRequired { items, usage_so_far, context_to_continue } => {
                usage_total += usage_so_far;
                context = context_to_continue;

                let results = dispatch_tools(
                    items, registry, permission_profile, &mut approval_cache, &cancel_token
                ).await?;

                // Append tool results to context for next model invocation
                context = append_tool_results(context, results);
            }
            QueryOutcome::CompactionRequired { context: ctx, .. } => {
                context = ctx;
                // loop will retry after compaction
            }
        }
    }
}
```

## 4. Tool Dispatch — `execute_tool()`

```rust
/// Called by server after approval gates pass.
pub async fn execute_tool(
    tool_name: &str,
    input: serde_json::Value,
    ctx: ToolContext,
    cancel_token: &CancellationToken,
) -> Result<ToolOutput, ToolError>;

pub struct ToolContext {
    pub session_id: SessionId,
    pub turn_id: TurnId,
    pub workspace_root: PathBuf,
    pub permission_profile: RuntimePermissionProfile,
    pub tool_registry: Arc<dyn ToolRegistry>,  // for nested tool resolution
    pub output_limit_bytes: usize,              // default 65536
}

pub struct ToolOutput {
    pub content: serde_json::Value,
    pub display_content: Option<String>,
    pub structured_status: StructuredStatus,
    pub result_summary: String,  // ≤500 chars, factual
    pub redaction_state: RedactionState,
    pub safety_notice: Option<String>,
}

pub enum StructuredStatus {
    Command { exit_code: i32, signal: Option<i32> },
    Http { status_code: u16 },
    FileOps { files_changed: u32, bytes_written: u64 },
    Search { match_count: u32 },
    Generic { success: bool },
}
```

## 5. Failure Classification

```rust
pub enum TurnFailurePhase {
    Admission,
    ContextAssembly,
    Compaction,
    ModelResolution,
    ProviderInvocation,
    ToolValidation,
    ToolExecution,
    ApprovalTimeout(Duration),
    QuestionTimeout(Duration),
    Persistence,
    Cancelled,
}

pub struct TurnFailure {
    pub phase: TurnFailurePhase,
    pub error_code: String,
    pub message: String,
    pub recoverable: bool,
    pub retry_strategy: Option<RetryStrategy>,
    pub provider_error_ref: Option<String>,
}

pub enum RetryStrategy {
    Immediate { max_attempts: u8 },
    Backoff { initial_ms: u64, max_ms: u64, max_attempts: u8 },
    AfterCompaction,
    AfterUserAction,
}
```

## 6. Async Behavior

| Operation | Timeout | Retries | Cancel Behavior |
|---|---|---|---|
| `query()` | 120s (configurable) | Auto-retry on rate-limit (429) with Retry-After header | CancellationToken checked before each provider call and at cooperative yield points |
| `execute_tool()` | Per-tool timeout (default 120s, configurable per tool) | No auto-retry (tools are not idempotent by default) | Send SIGTERM to process, wait 5s, SIGKILL |
| `compact_context()` | 60s | None | Abort compaction, use uncompressed context |
| Tool dispatch (per child of multi_tool_use) | 120s per child | No auto-retry | Cancel individual child, preserve sibling results |

## 7. Invariants

- At most one turn per session is in a non-terminal phase.
- Accepted user input is durable (`TurnStarted` + `ItemStarted(UserInput)` fsync'd) before `query()` is called.
- Every turn reaches exactly one terminal state.
- Tool calls route through `authorize_tool_request()` (core function) before `execute_tool()`.
- The execution loop is server-owned (transport, event broadcast). All decisions (permission, approval, context, persistence) are made by core.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-AGENT-001 | specified-by |
| L3-DES-ARCH-001 | specified-by |

## Implementation Placement Guidance

- `query()` is a pure async function — it takes all state as parameters and returns outcomes. Server orchestrates the loop around it.
- `crates/core/src/query.rs` is an acceptable placement if its interface is updated to this L3 contract. Existing code in that file is reference material, not a constraint on the final behavior.
- The server turn execution loop should remain a thin orchestration layer that delegates decisions to core. Do not preserve stale server-side decision logic merely because it already exists.
- CancellationToken is from `tokio_util::sync::CancellationToken`.
