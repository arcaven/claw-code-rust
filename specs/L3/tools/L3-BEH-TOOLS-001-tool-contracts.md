---
artifact_id: L3-BEH-TOOLS-001
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-TOOLS-001 — Tool Contracts

## Purpose

Define the `ToolHandler` trait, `ToolRegistry` interface, `ToolSpec`, `ToolContext`, and `ToolOutput`/`ToolError` types that form the contract between `core` (implementations) and `server` (consumers).

## Source Design

L2-DES-TOOL-001, L3-DES-ARCH-001

## 1. Trait and Type Definitions (all in `tools` crate)

```rust
// === tool_handler.rs ===

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

pub struct ToolContext {
    pub session_id: SessionId,
    pub turn_id: TurnId,
    pub tool_call_id: String,
    pub workspace_root: PathBuf,
    pub permission_profile: RuntimePermissionProfile,  // from protocol
    pub tool_registry: Arc<dyn ToolRegistry>,
    pub output_limit_bytes: usize,
    pub cancel_token: CancellationToken,
}

// === tool_spec.rs ===

pub struct ToolSpec {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub input_schema: JsonSchema,
    pub output_mode: ToolOutputMode,
    pub execution_mode: ToolExecutionMode,
    pub capability_tags: Vec<ToolCapabilityTag>,
    pub supports_parallel: bool,
    pub supports_cancellation: bool,
    pub supports_streaming: bool,
    pub preparation_feedback: ToolPreparationFeedback,
}

pub enum ToolOutputMode { Text, Json, Mixed }

pub enum ToolPreparationFeedback { None, Spinner, ProgressBar }

// === registry.rs ===

pub trait ToolRegistry: Send + Sync {
    fn get(&self, name: &str) -> Option<&Arc<dyn ToolHandler>>;
    fn spec(&self, name: &str) -> Option<&ToolSpec>;
    fn list_available(&self, mode: &SessionMode, permission: &PermissionProfile) -> Vec<&ToolSpec>;
    fn list_all_specs(&self) -> &[ToolSpec];
}

// === output.rs ===

pub struct ToolOutput {
    pub content: serde_json::Value,
    pub display_content: Option<String>,
    pub structured_status: StructuredStatus,
    pub result_summary: String,
    pub redaction_state: RedactionState,
    pub safety_notice: Option<String>,
}

pub struct ToolError {
    pub code: ToolErrorCode,
    pub message: String,
    pub recoverable: bool,
}

pub enum ToolErrorCode {
    InvalidInput { field_errors: Vec<FieldError> },
    BlockedByMode { mode: String },
    NeedsConfiguration { missing: Vec<String> },
    Denied { reason: String },
    ApprovalRequired { approval_id: String },
    TimedOut { limit_ms: u64 },
    ExecutionFailed { reason: String },
    Cancelled,
    InternalError,
}
```

## 2. Dependency Contract

```
tools crate:
  depends on: protocol (for SessionId, TurnId, SessionMode, JsonSchema, RuntimePermissionProfile, CancellationToken)
  does NOT depend on: core, server, provider, safety

core crate:
  depends on: tools (implements ToolHandler, ToolRegistry)
  provides: ToolRegistryBuilder, all handler implementations

server crate:
  depends on: tools (consumes &dyn ToolRegistry, &dyn ToolHandler)
  calls: registry.get(name).handle(ctx, input, progress)
```

## 3. ToolSpec Validation Rules

```rust
impl ToolSpec {
    pub fn validate(&self) -> Result<(), Vec<SpecValidationError>> {
        let mut errors = Vec::new();
        if self.name.is_empty() || self.name.len() > 64 { errors.push("name: 1-64 chars"); }
        if !self.name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
            { errors.push("name: lowercase alphanumeric + underscores only"); }
        if self.description.is_empty() || self.description.len() > 1000
            { errors.push("description: 1-1000 chars"); }
        if self.input_schema.type_name() != "object"
            { errors.push("input_schema: must be JSON object type"); }
    }
}
```

## 4. ToolProgressSender

```rust
pub struct ToolProgressSender {
    tx: mpsc::UnboundedSender<ToolProgress>,
}

pub enum ToolProgress {
    OutputDelta { content: String, stream_index: u32 },
    StatusUpdate { message: String },
    Completion { exit_code: Option<i32> },
}
```

## 5. What `tools` Must NOT Contain

- ❌ Any concrete tool implementation (no read, write, grep, shell, etc.)
- ❌ Any filesystem I/O
- ❌ Any process spawning
- ❌ Any network calls
- ❌ Any config reading
- ❌ Any permission checking logic
- ❌ Any approval logic
- ❌ Any JSONL serialization
- ❌ Any context assembly

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TOOL-001 | specified-by |
| L3-DES-ARCH-001 | specified-by |

## Implementation Placement Guidance

- The tools crate contains pure contracts only: handler traits, tool specs, registry traits, errors, events, JSON schema helpers, handler kind, and summaries.
- Concrete handlers belong in core. Existing handler files in the tools crate are stale placement and should be migrated or replaced.
- `ToolRegistry` is a trait. Core provides the runtime implementation.
- `ToolContext` gains `tool_registry: Arc<dyn ToolRegistry>` for nested tool resolution (e.g., `multi_tool_use` needs to look up child tools).
