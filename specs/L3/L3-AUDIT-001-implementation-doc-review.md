---
artifact_id: L3-AUDIT-001
revision: 9
status: Draft
active_baseline: no
---

# L3-AUDIT-001 — Implementation Documentation Review

## Purpose

Record unreasonable aspects, design flaws, and defects found in the current L3 implementation documentation, and define the correction direction required before implementation should treat L3 as authoritative.

## Review Standard

L3 implementation documentation must:

- Refine L2 designs without weakening or replacing them.
- Avoid concessions to stale implementation details in `crates/`.
- Define enough concrete types, state transitions, persistence timing, event behavior, error behavior, and tests to guide development.
- Preserve crate responsibility boundaries from `L3-DES-ARCH-001`.
- Avoid duplicating ownership of the same subsystem across multiple L3 documents.

## Findings

### F1. Onboarding Entry Drift

**Issue**: The CLI and TUI onboarding L3 documents still referred to `devo onboard`, provider-first setup, `.devo` project config paths, and `~/.config/devo/config.toml`.

**Why unreasonable**: L2 requires manual onboarding through `devo --onboard`, model-first onboarding, project config at `project_directory/.dev/config.toml`, and user config at `~/.devo/config.toml` or `C:\Users\username\.devo\config.toml`.

**Correction**: `L3-BEH-CLI-001` and `L3-BEH-TUI-005` now use `--onboard`, delegate the model-first flow to onboarding UI L3, and use the L2-defined config/auth locations.

### F2. `/btw` Persistence Semantics Were Wrong

**Issue**: The slash-command L3 treated `/btw` as a low-priority normal turn with a submission hint.

**Why unreasonable**: L2 changed `/btw` into a side conversation inside an ephemeral fork. It must not persist session, turn, item, queue, steer, or fork records.

**Correction**: `L3-BEH-TUI-004` now requires an ephemeral fork execution path and forbids lowering `/btw` into normal durable `turn.submit`.

### F3. Goal Lifecycle L3 Weakened L2 Accounting And Continuation Guarantees

**Issue**: Goal L3 accounted only at turn completion, used `turn_usage.total_tokens`, implied a default budget-shaped reminder, and did not model continuation reservation/recheck.

**Why unreasonable**: L2 requires incremental accounting, token delta as non-cached input plus output, no double-counted reasoning tokens, no fabricated budget when none exists, and pre-check/reserve/re-check launch semantics to avoid races.

**Correction**: `L3-BEH-SERVER-004` now defines incremental accounting points, normalized token accounting, no-default-budget behavior, JSONL source of truth, continuation reservation/recheck, context snapshots, and no-useful-work suppression.

### F4. Cross-References Pointed To The Wrong Subsystems

**Issue**: Several L3 documents pointed context assembly work to `L3-BEH-CORE-002` or compaction work to `L3-BEH-CORE-003`.

**Why unreasonable**: `L3-BEH-CORE-002` is the turn execution engine and `L3-BEH-CORE-003` is tool handlers. Context assembly and compaction are owned by `L3-BEH-CORE-005`.

**Correction**: Goal, memory, skills, slash-command, and workspace instruction docs now reference `L3-BEH-CORE-005` where context assembly or compaction is meant.

### F5. Approval Pipeline Ownership Was Duplicated

**Issue**: Both `L3-BEH-CORE-004` and `L3-BEH-SAFETY-002` defined approval pipeline behavior, caching, auto-reviewer behavior, and user prompt rules.

**Why unreasonable**: Duplicate normative definitions make implementation ambiguous and invite divergent behavior. Architecture says core owns permission evaluation and approval decisions; safety owns sandbox enforcement.

**Correction**: `L3-BEH-SAFETY-002` is now narrowed to approval safety integration: applying approved grants to sandbox enforcement, escalation provenance, and enforcement audit. `L3-BEH-CORE-004` remains the approval pipeline owner.

### F6. Tool Contract Ownership Was Duplicated

**Issue**: The core tool-handler L3 repeated the `ToolHandler` and `ToolSpec` contract as if it were normative.

**Why unreasonable**: `L3-BEH-TOOLS-001` is the contract boundary for the light `tools` crate. Repeating signatures in handler docs can create conflicts.

**Correction**: `L3-BEH-CORE-003` now states that `L3-BEH-TOOLS-001` is the source of truth and the core document owns only handler implementations and registry construction.

### F7. TUI L3 Was Not Implementable Against The Approved Visual Design

**Issue**: TUI L3 used an invented one-row top bar, emoji tool icons, `/plan`, incomplete status-line fields, and renderer assumptions that did not match the shared projection/style L2 documents.

**Why unreasonable**: The approved L2 TUI design requires a modern terminal-native shell, exact composer/status grammar, no emoji for core state, shared live/replay projection, `⏱` elapsed-time symbol, and approved slash-command catalog only.

**Correction**: `L3-BEH-TUI-001` and `L3-BEH-TUI-002` were corrected; new `L3-BEH-TUI-006`, `L3-BEH-TUI-007`, and `L3-BEH-TUI-008` define projection, style, and full transcript overlay behavior.

### F8. Traceability Links Were Stale

**Issue**: `specs/traceability/l2_to_l3.md` listed newly covered designs as pending and had inaccurate coverage counts. Many individual L2 files also kept embedded `specified-by TBD` rows even after corresponding L3 documents existed.

**Why unreasonable**: Engineers use the traceability matrix and per-file trace sections to decide whether L3 exists. Stale pending rows hide available implementation guidance and make real gaps harder to see.

**Correction**: The central matrix now maps all L2 artifacts to L3 `specified-by` coverage, and embedded L2 traceability rows have been updated away from `specified-by TBD`.

### F9. Configuration L3 Was Only An Architecture Placeholder

**Issue**: `L2-DES-APP-002` and `L2-DES-APP-005` were traced only to crate architecture, while their L2 text explicitly left source merge, schema validation, comment/unknown-section preservation, atomic write mechanics, and two-file `config.toml` plus `auth.json` recovery to L3.

**Why unreasonable**: Implementation cannot safely persist onboarding, `/model`, MCP, skill root, theme, logging, or credential changes from a crate boundary diagram. The risky behavior is not "which crate owns config"; it is how the program merges, validates, writes, and recovers configuration without leaking secrets or corrupting references.

**Correction**: `L3-BEH-APP-001` now defines source path resolution, independent source validation, effective merge behavior, safe inspection, write planning, atomic per-file commit order, conflict handling, and required tests.

### F10. Observability L3 Was Missing

**Issue**: `L2-DES-APP-004` had no L3, and `L2-DES-LLM-003` was only related to provider stream normalization.

**Why unreasonable**: Observability is cross-cutting. Without an implementation contract, each subsystem may log incompatible fields, omit correlation ids, expose sensitive content, or give clients inconsistent state projections.

**Correction**: `L3-BEH-APP-002` now defines the observability runtime, and `L3-BEH-PROVIDER-003` defines invocation usage normalization, context pressure, durable usage records, client usage projections, and trace-mode model stream records.

### F11. Model Resolution Weakened Configuration Semantics

**Issue**: The model-resolution L3 allowed missing binding display names to fall back silently, invalid reasoning effort to be clamped, and durable default selection to be written directly to user config.

**Why unreasonable**: L2 makes `display_name` a persisted binding field, requires invalid higher-priority configuration to produce actionable errors, and separates session model selection from durable provider/binding/default writes. Silent fallback or clamping hides bad config and can make replay or inspection disagree with persisted state.

**Correction**: `L3-BEH-PROVIDER-001` now requires enabled bindings to provide `display_name`, treats invalid reasoning effort as a configuration diagnostic, reads default selection from effective config, and delegates persistence writes to `L3-BEH-APP-001`.

### F12. L3 Implementation Notes Over-Constrained Code Placement

**Issue**: Several L3 documents used current `crates/` paths and migration wording as if the existing implementation were authoritative, including exact file names, line-count goals, and "already defined" type claims.

**Why unreasonable**: The current `crates` implementation is stale reference material. L3 should guide implementation from L2 behavior and architecture boundaries, not force developers to preserve stale modules or type shapes.

**Correction**: High-risk implementation-note sections now distinguish normative ownership from optional placement guidance. Existing names and paths may be reused only when they satisfy the L3 contracts.

### F13. Persistent Memory L3 Contradicted The L2 Pipeline

**Issue**: The persistent-memory L3 described Phase 1 as writing per-session raw JSON files, Phase 2 as directly collecting unconsolidated raw files, and ad-hoc memory requests as direct edits to consolidated memory files.

**Why unreasonable**: L2 requires Phase 1 to write structured `stage1_outputs` rows, Phase 2 to materialize selected rows into the git-backed memory workspace before spawning a sandboxed consolidation agent, and ad-hoc user memory requests to write small notes under `extensions/ad_hoc/notes/`. Direct writes to `MEMORY.md` or `memory_summary.md` from an ordinary chat turn would bypass the consolidation workflow, evidence routing, and safety checks.

**Correction**: `L3-BEH-CORE-007` now defines the startup coordinator, `stage1_outputs` and `jobs` schemas, Phase 1 claim/extract/no-output behavior, Phase 2 workspace sync, sandboxed consolidation agent, read-only memory tools, ad-hoc notes, retention, recovery, and the no-client-management boundary.

### F14. Deferred Tool Loading Advertised Incompatible Subagent Names

**Issue**: The deferred-tool L3 hardcoded `spawn_subagent`, `subagent_status`, and `subagent_result`, while the subagent L2/L3 surface defines `spawn_agent`, `send_message`, `followup_task`, `wait_agent`, `list_agents`, and `close_agent`.

**Why unreasonable**: Developers could implement two incompatible model-facing subagent APIs: one from the subagent design and another from ToolSearch examples. Deferred loading must advertise the canonical registry tool names, not maintain its own parallel naming scheme.

**Correction**: `L3-BEH-TOOLS-004` now requires deferred reminders to be generated from canonical `ToolSpec.name` values. Alternate names are treated as aliases only when they resolve to registered canonical tools.

### F15. Subagent L3 Lacked Durable Record And Replay Detail

**Issue**: The subagent L3 described runtime spawn, mailbox, and watcher behavior but did not define the durable record schemas, replay rules, or client event payloads needed to rebuild the agent tree after restart.

**Why unreasonable**: L2 requires subagents to be child sessions with persisted spawn relationships, resumable state, visible status, and replayable parent-child relationships. A runtime-only registry plus vague "agent graph store" reference would make crash recovery and client catch-up ambiguous.

**Correction**: `L3-BEH-SERVER-003` now defines durable subagent records, replay behavior, safe client events, and required tests. `L3-BEH-CORE-001` now includes the subagent record family in the durable JSONL model and replay hooks.

### F16. Interrupt/Resume L3 Was Inconsistent With Durable Record Vocabulary

**Issue**: The interrupt/resume L3 and core JSONL L3 disagreed about the durable record family. The server document referenced resume and interrupt records without field-level schemas, while the core durable enum omitted `turn_interrupt_requested`, `turn_resume_started`, and background-process update records.

**Why unreasonable**: L2 explicitly lists durable interrupt, resume, background-process, and terminal turn records. If L3 uses different names or omits them from the core durable model, implementation cannot know which records must be replayable and which events are merely client notifications.

**Correction**: `L3-BEH-SERVER-002` now defines `turn_interrupt_requested`, `turn_resume_started`, and `background_process_updated` records, plus the normal `TurnStarted(kind = Resume, resume_of_turn_id = ...)` resume turn. `L3-BEH-CORE-001` now includes those durable record families.

### F17. Session Forking L3 Did Not Protect Forks From Parent Deletion

**Issue**: The core JSONL L3 had only a `SessionForked` enum placeholder and no concrete inherited-history segment, deletion preflight, materialization, or replay behavior.

**Why unreasonable**: L1 and L2 explicitly require forked sessions to remain replayable after parent deletion. A `parent_session_id` plus `fork_turn_id` link is only provenance. If L3 does not define independent inherited-history storage and deletion policy, implementation may silently break fork replay when a parent is deleted or purged.

**Correction**: `L3-BEH-CORE-011` now defines fork admission, inherited segment construction, child session creation, fork replay, parent deletion preflight/commit, client projection, subagent fork usage, and tests. `L3-BEH-CORE-001` now defines the `SessionForkedRecord` fields and replay hook.

### F18. Immediate Message Editing Restore Was Too Vague

**Issue**: The turn/item L3 described immediate message editing with a generic "restore_result" record and a simple hash check, but L2 requires named durable restore records, branch-safe supersession, per-file restore outcomes, client event ordering, hidden checkpoint behavior, and explicit preservation of diverged current file state.

**Why unreasonable**: Implementation could restore after replacement execution, use client-visible diffs as the restore authority, overwrite user edits with a whole-workspace reset, or fail to replay which files were skipped. That would violate the L1 requirement that user-created changes after the superseded turn must not be silently discarded.

**Correction**: `L3-BEH-CORE-012` now defines edit eligibility, queued edits, completed-turn edits, durable edit/restore/supersession schemas, safe per-file restore predicates, hidden git checkpoint limits, replay projection, and tests. `L3-BEH-CORE-001` and `L3-BEH-CORE-006` now delegate the detailed behavior to that L3.

### F19. Protocol L3 Omitted Fork/Delete/Edit Request Semantics

**Issue**: The JSON-RPC L3 defined envelope handling, subscriptions, turn submission, and approval races, but did not define concrete request behavior for `session.fork`, `session.delete`, or `message.editPrevious`.

**Why unreasonable**: L2 gives these methods specific safety-critical response fields and semantics. Without L3 request handling, implementation could return a fork before inherited segments are durable, delete a parent before fork retention is protected, or let clients infer edit/restore ordering from optimistic UI state.

**Correction**: `L3-BEH-PROTOCOL-001` now defines request params, response results, error codes, and delegation points for fork, delete with fork retention, and immediate previous message editing.

## Remaining Known Gaps

- Some older L3 documents still need stronger field-level schemas and test matrices before implementation can proceed safely.
- The central L1-L2 gaps remain outside the current L3 pass and still need separate L2 design work.

## Traceability

| Source | Relationship |
|---|---|
| L2-DES-TRACE-001 | related-to |
| L3-DES-ARCH-001 | related-to |
| specs/traceability/l2_to_l3.md | related-to |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Initial L3 documentation audit and corrections. |
| 2 | 2026-05-27 | Assistant | Correction | Added configuration, observability, traceability, model-resolution, and stale-code-anchoring findings after dedicated L3 artifacts were created. |
| 3 | 2026-05-27 | Assistant | Correction | Added persistent-memory pipeline finding after aligning L3 with L2's stage1 output, workspace sync, sandboxed consolidation, and ad-hoc note design. |
| 4 | 2026-05-27 | Assistant | Correction | Added deferred-tool canonical-name finding after aligning ToolSearch behavior with the subagent tool surface. |
| 5 | 2026-05-27 | Assistant | Correction | Added subagent durability finding after specifying durable subagent records, replay hooks, client events, and tests. |
| 6 | 2026-05-27 | Assistant | Correction | Added interrupt/resume durable-record finding after aligning interrupt, resume, and background-process records with the JSONL model. |
| 7 | 2026-05-27 | Assistant | Correction | Added session-forking retention finding after specifying inherited-history segments, parent-deletion preflight, replay, and tests. |
| 8 | 2026-05-27 | Assistant | Correction | Added immediate-message-edit restore finding after specifying safe workspace restoration, superseded branch replay, and durable record schemas. |
| 9 | 2026-05-27 | Assistant | Correction | Added protocol request-semantics finding after specifying fork, delete, and message edit JSON-RPC behavior. |
