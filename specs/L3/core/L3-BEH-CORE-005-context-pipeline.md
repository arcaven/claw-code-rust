---
artifact_id: L3-BEH-CORE-005
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-CORE-005 — Context Assembly, Compaction, and Normalization

## Purpose

Define `ContextAssembler`, `CompactionEngine`, and `ContextNormalizer` — the three-phase context pipeline that runs before every model invocation.

## Source Design

L2-DES-CONTEXT-001, L2-DES-CONTEXT-002, L2-DES-CONTEXT-003, L3-DES-ARCH-001

## 1. ContextAssembler

```rust
pub struct ContextAssembler {
    config: ContextConfig,
}

pub struct ContextConfig {
    pub max_instruction_file_bytes: usize,    // default 65536
    pub max_total_instruction_bytes: usize,   // default 262144
    pub reserved_recent_turns: usize,         // default 5
    pub compaction_threshold: f64,            // default 0.80
}

pub struct AssembledContext {
    pub context_id: ContextId,
    pub session_id: SessionId,
    pub created_for_turn: TurnId,
    pub model_binding: ModelBindingId,
    pub entries: Vec<ContextEntry>,
    pub token_estimate: u64,
    pub immutable_prefix_hash: String,
    pub created_at: DateTime<Utc>,
}

pub enum ContextEntry {
    InstructionRef { source: InstructionSource, content: String },
    ToolSchema { name: String, schema: JsonSchema },
    TranscriptItemRef { turn_id: TurnId, item_id: ItemId },
    TranscriptRangeRef { from: TurnId, to: TurnId },
    ContextSummaryRef { summary_id: SummaryId },
    ArtifactRef { artifact_id: String },
}

pub enum InstructionSource {
    BaseInstruction,
    AgentMode(CodingMode),
    Persona(Persona),
    InteractionMode(InteractionMode),
    ProjectInstruction(PathBuf),
    GlobalInstruction(PathBuf),
    SkillActivation(SkillId),
    HiddenGoalContext,
    MemoryContext,
    ChangeSignal,
}
```

### Assembly Algorithm

```
fn assemble(
    session: &SessionProjection,
    turn: &TurnRecord,
    model: &ResolvedModelProfile,
    tool_registry: &dyn ToolRegistry,
    skill_catalog: &SkillCatalog,
    memory_store: &MemoryStore,
    prev_snapshot: Option<&ContextSnapshot>,
) -> AssembledContext:
    entries = []

    // 1. Immutable prefix
    entries.push(InstructionRef(BaseInstruction, model.base_instructions))
    entries.push(InstructionRef(AgentMode, session.agent_mode.instructions()))

    // 2. Tool schemas (pre-loaded + loaded-deferred only)
    for tool in tool_registry.list_available(session.mode, session.permission_profile):
        entries.push(ToolSchema(tool.spec))

    // 3. Prior transcript from active snapshot
    if let Some(snapshot) = prev_snapshot:
        for ref in snapshot.transcript_refs:
            entries.push(ref)

    // 4. Metadata-derived instructions
    entries.push(InstructionRef(Persona, session.persona.instructions()))
    entries.push(InstructionRef(InteractionMode, session.interaction_mode.instructions()))

    // 5. Project instructions (from workspace discovery)
    for instr in session.instruction_set.project_instructions:
        entries.push(InstructionRef(ProjectInstruction, instr))

    // 6. Activated skills and persistent memory are metadata-derived instructions
    for skill in session.active_skills:
        entries.push(InstructionRef(SkillActivation(skill.id), skill.instructions))

    if let Some(memories) = memory_store.read_relevant(session.workspace_root):
        entries.push(InstructionRef(MemoryContext, memories))

    // 7. Hidden goal context (only when eligible for goal-guided execution)
    if is_goal_context_eligible(session, turn):
        entries.push(InstructionRef(HiddenGoalContext, build_goal_context(session)))

    // 8. Consolidated change-signal (if state changed since prev turn)
    if state_changed(session, prev_snapshot):
        entries.push(InstructionRef(ChangeSignal, build_change_signal(session, prev_snapshot)))

    // 9. Current user input
    entries.push(TranscriptItemRef(turn.turn_id, turn.user_item_id))

    // Compute token estimate
    token_estimate = estimate_tokens(&entries, model)

    // Compute immutable prefix hash (entries 1-3)
    immutable_prefix_hash = hash(entries[..transcript_boundary])

    return AssembledContext { ... }
```

## 2. Change-Signal Generation

Detect changes since prior turn's context state:

| Field | Trigger |
|---|---|
| `persona` | Persona changed |
| `interaction_mode` | Mode changed (`normal` ↔ `plan` ↔ `review`) |
| Active goal state | Goal created, replaced, paused, resumed, completed, blocked, budget-limited, canceled, cleared |
| Interrupt condition | Prior turn was interrupted |

If any changed → ONE message: "The persona is now: <p>. The interaction mode is now: <m>. The active goal was <event>. The previous turn was interrupted."

If none changed → no change-signal generated.

## 3. CompactionEngine

```rust
pub struct CompactionEngine {
    config: CompactionConfig,
}

pub struct CompactionConfig {
    pub threshold: f64,                          // default 0.80
    pub reserved_recent_turns: usize,            // default 5
    pub summary_model: String,                   // model used for summarization
    pub max_summary_tokens: u64,                 // default 4000
    pub eligible_min_turns: usize,               // default 3
}

pub struct CompactionResult {
    pub summary: CompactionSummary,
    pub compacted_range: (TurnId, TurnId),
    pub tokens_before: u64,
    pub tokens_after: u64,
    pub trigger: CompactionTrigger,  // Manual | Automatic
}

pub struct CompactionSummary {
    pub objectives: Vec<String>,
    pub key_decisions: Vec<String>,
    pub changed_files: Vec<CompactedFileChange>,
    pub blockers: Vec<String>,
    pub verification_status: String,
    pub error_context: Vec<String>,
    pub notable_state_changes: Vec<String>,
}
```

### Compaction Algorithm

```
fn compact(context: &AssembledContext, session: &SessionProjection) -> Result<CompactionResult>:
    if context.token_estimate <= model.effective_context_window * threshold:
        return Skip("token estimate below threshold")

    eligible = identify_eligible_turns(session.transcript)
    if eligible.len() < eligible_min_turns:
        return Skip("insufficient history")

    if eligible_already_compacted(eligible):
        return Skip("already compacted, no new turns")

    Write durable(context_compaction_started)
    Emit TUI notice (Manual|Automatic Compaction Started)

    summary = extract_summary(eligible, session)
    // Extract: objectives, key decisions, changed files, blockers,
    //          verification status, error context, state changes

    // Build new context snapshot referencing summary + preserved recent turns
    new_snapshot = build_snapshot(summary, preserved_range, context)

    Write durable(context_compaction_completed)
    Emit TUI notice (Compaction Done)

    tokens_after = estimate_tokens(new_snapshot)
    return CompactionResult { summary, ... }
```

**Compaction skip conditions:**
- Token estimate below threshold
- Fewer than 3 eligible turns
- Eligible range already compacted, no new turns since
- During tool-call loop (defer to next user-initiated turn)

**Emergency compaction**: If provider returns context-length error, force compaction with halved `reserved_recent_turns` (minimum 1). Retry invocation once.

## 4. ContextNormalizer

```rust
pub struct ContextNormalizer;

pub struct NormalizedContext {
    pub messages: Vec<ProviderMessage>,
    pub token_count: u64,
    pub items_dropped: u32,
    pub turns_dropped: u32,
    pub truncations_applied: u32,
}

pub enum ProviderMessage {
    System(String),
    Developer(String),
    User(Vec<ContentPart>),
    Assistant(Vec<ContentPart>),
    ToolResult { tool_call_id: String, content: String },
}
```

### Normalization Passes (in order)

**Pass 1 — Modality Filter**: Drop `image_ref`/`audio_ref`/`video_ref` parts if model doesn't support that modality. Replace sole dropped part with text note.

**Pass 2 — Item Size Bound**: Truncate items > `max_item_chars` (default 100000). Append `[... content truncated at N characters ...]`. Preserve tool-call/result pairs (both present or both removed).

**Pass 3 — Token Budget**: If total > `effective_context_window`:
- Preserve: base instructions, tool schemas, persona/mode instructions, hidden goal context, change signal, current user input.
- Drop oldest transcript turns until within budget, keeping at least `reserved_recent_turns`.
- If still over: truncate items within remaining turns (shorter limit).
- If STILL over: return `ContextLimitExceeded` error.

## 5. Async Behavior

| Operation | Timeout | Retries | Cancel |
|---|---|---|---|
| Context assembly | N/A (synchronous) | N/A | N/A |
| Compaction (model call for summary) | 60s | 1 on failure | Abort |
| Normalization | N/A (synchronous) | N/A | N/A |

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-CONTEXT-001 | specified-by |
| L2-DES-CONTEXT-002 | specified-by |
| L2-DES-CONTEXT-003 | specified-by |
| L3-DES-ARCH-001 | specified-by |

## Implementation Notes

- `is_goal_context_eligible` must apply the L2 goal and Plan Mode rules: no goal context in Plan Mode unless a later design explicitly permits a read-only planning interaction, no context for terminal or cleared goals, and no fabricated budget fields.
- The immutable prefix hash covers stable prefix entries only. Dynamic metadata-derived entries such as persona, interaction mode, goal context, memory, skill activation, and change signals must not be folded into the prefix hash unless a future cache strategy explicitly versions them.
