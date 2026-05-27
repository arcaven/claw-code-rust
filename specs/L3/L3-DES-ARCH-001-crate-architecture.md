---
artifact_id: L3-DES-ARCH-001
revision: 1
status: Draft
active_baseline: no
---

# L3-DES-ARCH-001 — Crate Architecture

## Purpose

Evaluate the existing crate structure, define the final crate layout, specify inter-crate contracts (key traits, data flow), and map each crate to its L2 design sources.

## 1. Existing Crate Evaluation

### Current State

| Crate | Src Files | Current Role | Issues |
|---|---|---|---|
| `protocol` | 17 | Data types, JSON-RPC envelopes, events, session/turn types | Clean. Pure data, no logic. ✓ |
| `core` | 15 | Config, context, model catalog, session state, query, re-exports protocol | Too thin. Architecture supplement requires it to be heavy — should absorb tool handlers, permission logic, persistence. |
| `server` | 20 | Runtime, turn exec, transport, persistence, approval, client mgmt | Too heavy. Contains logic that should be in core (persistence decisions, approval routing). Transport and event broadcast are correct here. |
| `tools` | 30 | ToolHandler trait, ToolSpec, ToolRegistry, 17 handler impls | **Major violation.** Architecture supplement says handlers go in core. Current tools crate is the heaviest crate with all concrete implementations. |
| `safety` | 1 | PermissionMode, PermissionPreset, RuntimePermissionProfile, sandbox eval | Permission types belong in core per supplement. Sandbox enforcement can stay but is thin. |
| `provider` | 6 | OpenAI/Anthropic HTTP adapters, stream parsing | Clean. Independent adapter layer. ✓ |
| `tui` | 56 | Full terminal UI: chatwidget, bottom_pane, streaming, composer, onboarding | Correctly isolated. No business logic leakage. ✓ |
| `client` | 2 | WebSocket client, stdio transport | Thin and correct. ✓ |
| `cli` | 4 | Argument parsing, server lifecycle, onboarding entry | Minor: some onboarding state machine logic could move to core. |
| `mcp` | 1 | MCP server record types, transport config | Thin types — correct location. MCP manager logic should be in core. |
| `file-search` | 3 | Fuzzy file search (nucleo-based), CLI | Correct isolation. Search logic stays here. |
| `tasks` | 3 | Background task/job tracking | Thin. Types here, logic in core/server. |
| `utils` | 11 | ANSI escape, fuzzy match, git ops, config paths, terminal detection | Correct — pure utilities. ✓ |
| `arg0` | 1 | Argument forwarding/preprocessing | Thin wrapper. ✓ |

### Key Problems

1. **tools is the heaviest crate** (30 files) but should be light (only contracts). All 17 handler implementations must move to core.
2. **safety contains permission types** (`RuntimePermissionProfile`, `PermissionMode`) that are core's responsibility per the supplement.
3. **core is too thin** (15 files) — should contain data models, config, context assembly/compaction/normalization, tool handlers, permission evaluation, approval decisions, model binding resolution, persistence triggering.
4. **server contains decision logic** (approval routing, persistence decisions) that should be in core. Server should only orchestrate: run the turn loop, broadcast events, manage connections.
5. **mcp is only types** — the MCP manager (connection lifecycle, capability discovery) should be a core module.

## 2. Final Crate Architecture

```
                    ┌──────────┐
                    │ protocol  │  Pure data: types, events, JSON-RPC envelopes
                    └────┬─────┘
                         │ (depends on nothing else)
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
┌───────┐          ┌──────────┐        ┌──────────┐
│ utils  │          │   core    │        │ safety   │
│ (util)│          │ (heavy)   │        │ (sandbox)│
└───────┘          └────┬─────┘        └────┬─────┘
                        │                  │
      ┌─────────────────┼──────────────────┼──────────────────┐
      │                 │                  │                  │
      ▼                 ▼                  ▼                  ▼
┌──────────┐    ┌──────────┐      ┌──────────┐      ┌──────────┐
│ provider  │    │  server   │      │   mcp    │      │  client  │
│ (HTTP)    │    │ (orchest) │      │ (MCP)    │      │ (SDK)    │
└──────────┘    └────┬─────┘      └──────────┘      └──────────┘
                     │
                     ▼
               ┌──────────┐
               │   tui    │
               │ (UI)     │
               └──────────┘
```

### Crate Definitions

#### `protocol` — Shared Data Structures
- **Responsibility**: All types exchanged between crates. JSON-RPC envelopes, session/turn/item/event types, error codes.
- **Exposes**: `SessionId`, `TurnId`, `ItemId`, `TurnMetadata`, `InputItem`, `ContentBlock`, `Message`, `Role`, `ProtocolErrorCode`, `ClientRequest`, `ServerNotification`, event payload structs, `ToolDefinition` projection.
- **Depends on**: Nothing (zero deps beyond serde, chrono, uuid).
- **Must NOT contain**: Any business logic, validation beyond serde deserialization, I/O.

#### `core` — Business Logic (Heavy Crate)
- **Responsibility**: All domain logic. Data model serialization, config resolution, context assembly/compaction/normalization, tool handler implementations, tool registry construction, permission evaluation, approval decision pipeline, model binding resolution, persistence triggering, memory pipeline, skills catalog, workspace discovery, fuzzy search provider trait.
- **Exposes**:
  - **Data model**: `SessionRecord`, `TurnRecord`, `ItemRecord`, `PlanRecord`, `GoalRecord`, `FileChange`, `Mention`, `ContentPart`, all JSONL record types and replay engine.
  - **Config**: `ConfigLayers`, `EffectiveConfig`, config resolution/merge.
  - **Context**: `ContextAssembler` (trait), `CompactionEngine`, `ContextNormalizer`.
  - **Tools**: All tool handler implementations (`ReadHandler`, `WriteHandler`, `GrepHandler`, `GlobHandler`, `ShellHandler`, `WebSearchHandler`, `FetchUrlHandler`, `PlanHandler`, `GoalUpdateHandler`, `ApprovalHandler`, `QuestionHandler`, `SpawnAgentHandler`, `MultiToolUseHandler`, `ToolSearchHandler`), `ToolRegistryBuilder`.
  - **Permissions**: `PermissionProfile`, `AccessMode`, `resolve_access()`, `can_read()`, `can_write()`, `network_enabled()`, materialization of symbolic paths.
  - **Approval**: `authorize_tool_request()` entry point, `ApprovalCache`, `ApprovalDecision`, auto-reviewer logic, circuit breaker.
  - **Model**: `SupportedModelDefinition` catalog, `ModelProviderBinding` validation, `ResolvedModelProfile` construction.
  - **Memory**: Memory extraction (Phase 1), consolidation (Phase 2), read path, job concurrency.
  - **Skills**: `SkillCatalog`, discovery from roots, activation.
  - **Workspace**: Project root detection, instruction file discovery.
  - **Search**: `SearchProvider` trait, `FileSearchProvider` (uses `file-search` crate).
  - **Persistence**: `SessionStore` trait (JSONL append/replay), persistence triggers.
- **Depends on**: `protocol`, `utils`, `file-search` (for fuzzy matching). Does NOT depend on `server`, `provider`, `tui`, `client`.
- **Must NOT contain**: Network I/O, process management, provider HTTP calls, terminal rendering, WebSocket handling, user interaction channels.

#### `server` — Orchestration (Light Crate)
- **Responsibility**: Wraps core in a runtime. Transport, turn execution loop, event broadcast, connection management, interrupt propagation, process supervision.
- **Exposes**: `ServerRuntime` (startup/shutdown), `Transport` (trait), `ClientRegistry`, `EventBroadcaster`.
- **Depends on**: `core`, `protocol`, `provider` (for invoking models), `client` (for SDK types).
- **Turn execution loop**: Calls `core::query()` for each model invocation. Passes results to tool dispatch. Broadcasts events to clients.
- **Must NOT contain**: Tool logic, config logic, permission logic, context logic, persistence format decisions — all delegated to core.

#### `tools` — Tool Contracts (Light Crate)
- **Responsibility**: Only `ToolHandler` trait, `ToolRegistry` lookup interface, `ToolSpec` schema definition.
- **Exposes**:
  - `trait ToolHandler`: `async fn handle(&self, ctx: ToolContext, input: Value) -> Result<ToolOutput, ToolError>`
  - `ToolSpec { name, description, input_schema, output_mode, execution_mode, capability_tags, supports_parallel, supports_cancellation }`
  - `ToolRegistry`: `fn get(&self, name: &str) -> Option<&Arc<dyn ToolHandler>>`, `fn spec(&self, name: &str) -> Option<&ToolSpec>`, `fn list_available(&self, mode: &SessionMode) -> Vec<&ToolSpec>`
  - `ToolContext { session_id, turn_id, workspace_root, permission_profile, tool_registry, output_limit_bytes }`
  - `ToolOutput { content, display_content, structured_status, result_summary, redaction_state }`
  - `ToolError { code, message, recoverable }`
- **Depends on**: `protocol` (for `ToolDefinition` projection). Does NOT depend on `core`, `server`, `provider`.
- **Must NOT contain**: Any concrete tool implementation, any I/O, any permission checking, any config reading.

#### `safety` — Sandbox Enforcement (Independent)
- **Responsibility**: Sandbox policy enforcement at the OS boundary. Process isolation constraints, filesystem jail, network egress filtering.
- **Exposes**: `SandboxPolicy`, `apply_sandbox(command: Command) -> SandboxedCommand`, `NetworkEgressFilter`.
- **Depends on**: `protocol` (for error types). Does NOT depend on `core`.
- **Note**: Permission types (`PermissionProfile`, `AccessMode`, permission evaluation) live in `core`, not here. Safety only enforces sandbox — the mechanical "can this process touch this path/port."

#### `provider` — Provider Adapters (Independent)
- **Responsibility**: OpenAI/Anthropic HTTP protocol adapters. Request serialization, response streaming, SSE parsing, provider event normalization.
- **Exposes**: `ModelProviderSDK` (trait), `ProviderRequest`, `ProviderEvent`, `StreamNormalizer`.
- **Depends on**: `protocol` (for event types). Does NOT depend on `core`, `server`.

#### `tui` — Terminal UI (Independent)
- **Responsibility**: All terminal rendering and user interaction. Ratatui-based layout, composer, transcript, streaming cells, approval modals, slash commands, onboarding UI.
- **Depends on**: `client` (for server connection), `protocol` (for event types), `file-search` (for @-mention search).
- **Must NOT contain**: Business logic, tool execution, permission decisions, config resolution.

#### `client` — Server SDK (Independent)
- **Responsibility**: WebSocket connection management, JSON-RPC serialization, reconnection, event subscription, `Client` struct for TUI/IDE/desktop consumers.
- **Depends on**: `protocol`.

#### `cli` — Entry Point (Thin)
- **Responsibility**: Argument parsing (clap), server lifecycle management (fork/exec), onboarding trigger, signal handling.
- **Depends on**: `server`, `tui`, `client`, `core` (for config loading).

#### `mcp` — MCP Types (Thin)
- **Responsibility**: MCP protocol types: `McpServerId`, `McpServerRecord`, `McpTransportConfig`, `McpAuthConfig`.
- MCP manager logic (connection lifecycle, capability discovery, tool normalization) lives in `core::mcp`.
- **Depends on**: `protocol`.

#### `file-search` — Fuzzy File Search (Utility)
- **Responsibility**: High-performance incremental file search using `nucleo` + `ignore` walker. Used by `core::search` and `tui` @-mention.
- **Depends on**: Nothing beyond nucleo, ignore crates.

#### `utils` — General Utilities
- **Responsibility**: ANSI escape processing, fuzzy string matching, git operations, config path resolution, terminal detection, shell command parsing.
- **Depends on**: `protocol` (for `ParsedCommand` type).

#### `tasks` — Job/Task Primitives
- **Responsibility**: Background job tracking primitives, lease-based job coordination.
- **Depends on**: `protocol`.

#### `arg0` — CLI Preprocessing
- **Responsibility**: Argument forwarding for multi-call binary patterns.
- **Depends on**: `core`, `server`, `utils`.

## 3. Inter-Crate Contracts

### core → server

```rust
// In core crate — the main entry point server calls per turn
pub async fn query(
    session: &SessionRecord,
    turn: &TurnRecord,
    context: &AssembledContext,
    model: &ResolvedModelProfile,
    tool_registry: &dyn ToolRegistry,
    permission_profile: &RuntimePermissionProfile,
    approval_cache: &ApprovalCache,
) -> Result<QueryOutcome, QueryError>;

pub enum QueryOutcome {
    TerminalResponse {
        item: ResponseItem,
        usage: TurnUsage,
    },
    ToolCallsRequired {
        tool_calls: Vec<ToolCallRequest>,
        usage_so_far: TurnUsage,
    },
}

// Server calls this to execute a tool after approval gates pass
pub async fn execute_tool(
    tool_name: &str,
    input: serde_json::Value,
    ctx: ToolContext,
) -> Result<ToolOutput, ToolError>;

// Server calls this for permission decisions
pub fn authorize_tool_request(
    tool_name: &str,
    tool_category: ToolCategory,
    resource: &ResourceKind,
    profile: &RuntimePermissionProfile,
    cache: &mut ApprovalCache,
    policy: &ApprovalPolicy,
) -> PermissionDecision;
```

### tools → core (trait impl direction)

```rust
// Defined in tools crate, IMPLEMENTED in core crate
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

// Defined in tools crate, POPULATED in core crate
pub trait ToolRegistry: Send + Sync {
    fn get(&self, name: &str) -> Option<&Arc<dyn ToolHandler>>;
    fn spec(&self, name: &str) -> Option<&ToolSpec>;
    fn list_available(&self, session_mode: &SessionMode) -> Vec<&ToolSpec>;
    fn list_all_specs(&self) -> &[ToolSpec];
}
```

### provider → core (called by server, not core directly)

```rust
// Defined in provider crate
#[async_trait]
pub trait ModelProviderSDK: Send + Sync {
    async fn stream_query(
        &self,
        request: ProviderRequest,
    ) -> Result<BoxStream<'static, ProviderEvent>, ProviderError>;
}
```

### safety → server (enforced at process boundary)

```rust
// Defined in safety crate
pub trait Sandbox: Send + Sync {
    fn constrain_command(&self, command: &mut std::process::Command, profile: &SandboxPolicy);
    fn constrain_network(&self, target: &url::Url, policy: &NetworkEgressFilter) -> bool;
}
```

### Data Flow Direction

```
User Input (tui)
  → client (JSON-RPC)
  → server (turn.submit handler)
  → core::assemble_context()
  → server calls provider::stream_query()
  → server feeds result to core for processing
  → if tool calls: server asks core::authorize_tool_request()
  → if approved: server calls core::execute_tool() via registry
  → server broadcasts events via client connections
  → tui renders events
```

## 4. L2 Design Mapping

| Crate | L2 Designs |
|---|---|
| `protocol` | APP-003 (JSON-RPC envelopes, event payloads), CONV-001 (ID types) |
| `core` | CONV-001 (full data model, JSONL records, replay), CONTEXT-001/002/003 (assembly, compaction, normalization), TOOL-001 (handler implementations, registry build), TOOL-002 (multi_tool_use), TOOL-003 (deferred loading), SAFETY-001 (permission evaluation, profile resolution), SAFETY-002 (approval pipeline, auto-reviewer, cache), MODEL-001 (binding resolution), MEM-001 (memory pipeline), SKILLS-001 (catalog, activation), WORKSPACE-001 (instruction discovery), APP-002 (persistence triggers), APP-005 (config schema), APP-006 (search provider trait), GOAL-001 (goal state machine) |
| `server` | AGENT-001 (turn execution loop orchestration), AGENT-002 (interrupt propagation, resume), AGENT-003 (subagent session management), APP-003 (transport, broadcast, sequence), APP-001 (process ownership) |
| `tools` | TOOL-001 (handler contract, spec, registry interface) |
| `safety` | SAFETY-001 (sandbox enforcement at OS boundary) |
| `provider` | MODEL-001 (invocation method adapters), LLM-003 (stream event normalization) |
| `tui` | TUI-001 through TUI-010 (all TUI L2s), TUI-CMD-001 through TUI-CMD-012 (slash commands), CLIENT-001/002/003 (rendering behavior) |
| `client` | APP-003 (WebSocket transport, reconnection) |
| `cli` | APP-007 (entry point, onboarding trigger) |
| `mcp` | MCP-001 (protocol types) |
| `file-search` | APP-006 (fuzzy search backend) |
| `tasks` | MEM-001 (job coordination primitives) |

## 5. Acceptance Criteria Self-Check

| Criterion | Status |
|---|---|
| Each crate has clear, unambiguous responsibility boundaries | ✓ |
| No circular dependencies | ✓ (DAG: protocol→{core,utils,safety}→server→tui; core↛server, tools↛core) |
| `core` and `protocol` contain only pure data and trait definitions (no business logic is false — core IS business logic, but contains no I/O) | ✱ See note |
| `server` holds execution state machine but no UI rendering | ✓ |
| `tools` only defines handler contract and registry, not implementations | ✓ |
| `safety`/`provider`/`tui` are independent replaceable modules | ✓ |

**Note on core/protocol**: The architecture supplement explicitly states "core is a heavey crate" containing all domain logic. The "no business logic" constraint applies to `protocol` only. `core` contains business logic but no I/O (no network, no process mgmt, no terminal, no HTTP). The supplement says core must NOT hold: network I/O, process management, provider HTTP calls, terminal rendering, user interaction channels. ✓ This is satisfied.

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---|---:|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Crate architecture evaluation, final layout, inter-crate contracts, L2 mapping. |
