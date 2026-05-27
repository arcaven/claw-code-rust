---
artifact_id: L3-BEH-TOOLS-004
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-TOOLS-004 — Deferred Tool Loading (ToolSearch)

## Purpose

Define the concrete behavior for the ToolSearch deferred tool loading mechanism: classification of tools into pre-loaded/deferred/hidden groups, the ToolSearch tool executor, session loaded-tool tracking, prompt assembly integration, alias resolution, and token savings measurement.

## Source Design

L2-DES-TOOL-003 (Deferred Tool Loading)

## Behavior Specification

### B0. Canonical Tool Names

- **Trigger**: Tool registry is built, and deferred loading classification needs model-facing names.
- **Preconditions**: Built-in tools, optional subagent tools, MCP tools, and feature-gated tools have been registered.
- **Algorithm / Flow**:
  1. Use the registry's canonical `ToolSpec.name` as the only name advertised in the model prompt and deferred reminder.
  2. Do not invent compatibility names in the deferred reminder.
  3. For subagent tools, use the canonical tool surface defined by `L2-DES-AGENT-003` and `L3-BEH-SERVER-003`: `spawn_agent`, `send_message`, `followup_task`, `wait_agent`, `list_agents`, and `close_agent`, unless the registry has intentionally chosen a different canonical name under a later approved design.
  4. Names such as `spawn_subagent`, `subagent_status`, `subagent_result`, `subagent`, or `delegate` may exist only as aliases that resolve to registered canonical tools. They must not appear in the deferred reminder unless they are actual canonical registry entries.
- **Postconditions**: The model sees one canonical name per tool. Alias handling cannot create a second incompatible tool surface.

### B1. Tool Classification at Session Start

- **Trigger**: Prompt assembly runs for the first turn of a session (or effective config changes).
- **Preconditions**: The tool registry is populated. Effective config, session mode, and feature flags are resolved.
- **Algorithm / Flow**:
  1. For every registered tool, resolve its `prompt_loading_policy`:
     - Check config `[tools.deferred_loading]`: if tool is in `preloaded` list → `Preloaded`. If in `deferred` list → `Deferred`. If in `hidden` list → `Hidden`.
     - Default policy: `defer_optional` (tools not in preloaded list default to deferred).
     - Tools gated by disabled feature flags → `Hidden`.
     - Tools blocked by current session mode → `Hidden`.
  2. Classify into three groups:
     - **Pre-loaded (core)**: `read`, `grep`, `glob`, `ls`, `write`, `apply_patch`, `shell`, `plan`, `approval`, `ToolSearch`, and `question` (only when in Plan Mode).
     - **Deferred**: `web_search`, `fetch_url`, `skill`, `multi_tool_use`, `goal_update`, enabled subagent tools using their canonical registry names, and `mcp__*` tools.
     - **Hidden**: blocked-mode tools, disabled-feature tools, internal lifecycle tools.
  3. Store the classification in the session deferred tool catalog.
- **Postconditions**: Every tool has a loading policy. The session catalog is ready for prompt assembly.

### B2. ToolSearch Executor

- **Trigger**: Model calls `ToolSearch` with query `"select:<name>[,<name>...]"`.
- **Preconditions**: The session deferred tool catalog is populated. The tool call passes normal validation.
- **Algorithm / Flow**:
  1. **Parse query**: extract tool names from `select:...` prefix. If not matching, return error with expected format.
  2. **Resolve aliases**: for each name, check the server alias map. Map case variants (e.g., `WebSearch` → `web_search`), legacy names (e.g., `bash` → `shell`), kebab-case (e.g., `fetch-url` → `fetch_url`), common synonyms (e.g., `subagent` or `delegate` → `spawn_agent` when that canonical tool is registered). If no alias match, use name as-is.
  3. **Classify each requested tool**:
     - Found in deferred list AND not yet loaded → **Loaded**: add to loaded-tool set.
     - Found in deferred list AND already loaded → **Already loaded**: report, no action.
     - NOT in deferred list (it's pre-loaded) → **Already available**: report.
     - NOT in any catalog → **Not found**: report.
  4. If ALL requested tools are "not found" and zero tools loaded → return error "Only request exact tool names from the Deferred tools list."
  5. Return summary: "Loaded N tool(s): ... Already loaded M tool(s): ... Already available K tool(s): ..."
- **Postconditions**: Loaded tools have their schemas included in all subsequent turns. Already-loaded and already-available tools are enumerated for model awareness.

### B3. Session Loaded-Tool Tracking

- **Trigger**: `ToolSearch` successfully loads a tool, or prompt assembly runs.
- **Preconditions**: Session loaded-tool set is initialized (empty at session start).
- **Algorithm / Flow**:
  1. `mark_loaded(session_id, tool_name)`: insert canonical tool name into the loaded set. This is a `HashSet<String>` keyed by session_id.
  2. `is_loaded(session_id, tool_name)`: O(1) lookup in the set.
  3. `list_loaded(session_id)`: return all loaded tool names for prompt assembly.
  4. Once loaded, a tool's schema persists for the remainder of the session — it cannot be "unloaded."
  5. The loaded set is durable: persisted in session metadata so reconnection/restart preserves loaded state.
- **Postconditions**: Prompt assembly always includes previously-loaded deferred tool schemas.

### B4. Prompt Assembly Integration

- **Trigger**: Every turn's context assembly, after tool availability is resolved.
- **Preconditions**: Tool classification is complete. Loaded-tool set is current.
- **Algorithm / Flow**:
  1. Get loaded deferred tools: `loaded = LoadedDeferredTools.list_loaded(session_id)`.
  2. Build exposed tool list: `exposed = preloaded_tools + loaded_deferred_tools`.
  3. Build `<system-reminder>` block: list each non-loaded deferred tool with `tool_name` and one-line `description`. Format:
     ```
     <system-reminder>
     The following deferred tools are available via ToolSearch. Use query "select:<name>[,<name>...]" to load them.
     Deferred tools:
       web_search: Performs a web search...
       fetch_url: Fetches and summarizes URL content...
       ...
     </system-reminder>
     ```
  4. Annotate the last exposed tool's description with a reminder instruction: "To load additional tools, use the ToolSearch tool."
  5. Compute token metrics (see B5).
- **Postconditions**: The model prompt contains only pre-loaded and previously-loaded tool schemas plus a compact deferred reminder.

### B5. Token Savings Measurement

- **Trigger**: Prompt assembly completes tool list construction.
- **Preconditions**: All tool schemas and the deferred reminder are serialized.
- **Algorithm / Flow**:
  1. `baseline_tokens`: tokenize all tool schemas if none were deferred.
  2. `exposed_tokens`: tokenize pre-loaded + loaded-deferred tool schemas.
  3. `reminder_tokens`: tokenize the `<system-reminder>` block.
  4. `net_cost = exposed_tokens + reminder_tokens`.
  5. `savings = baseline_tokens - exposed_tokens`.
  6. Report metrics: `exposedToolCount`, `hiddenToolCount`, `loadedDeferredToolCount`, `estimatedTokensSaved`.
- **Postconditions**: Token savings are measurable and reportable for diagnostics.

### B6. Alias Resolution Map

- **Trigger**: `ToolSearch` executor step 2.
- **Preconditions**: The alias map is compiled at server startup.
- **Algorithm / Flow**:
  1. The alias map is a `HashMap<String, String>` (alias → canonical).
  2. Categories: case variants (all lowercase/kebab variants), legacy names (`bash` → `shell`), kebab-case variants (`fetch-url` → `fetch_url`), common synonyms (`subagent`, `delegate`, `task_tool`, `sub_agent` → registered subagent spawn tool such as `spawn_agent`), shorthand (`rg` → `grep`).
  3. Lookup is case-normalized: lowercase the input, then check the map.
  4. If no match, use the raw input as-is for lookup.
  5. Alias targets must be registered canonical names. If an alias target is unavailable because a feature is disabled, the alias is ignored and the requested name is treated as not found.
  6. The model is always instructed to use exact names from the deferred reminder; the alias map is a safety net.
- **Postconditions**: Common naming variations resolve correctly without the model needing to guess.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TOOL-003 | specified-by |
| L2-DES-AGENT-003 | related-to |

## Implementation Notes

- `ToolSearch` is a built-in tool registered with `tool_category: Internal`, `execution_mode: Internal`.
- Loaded-tool set is persisted in session metadata JSONL as `loaded_deferred_tools: ["web_search", "fetch_url"]`.
- The `<system-reminder>` is regenerated each turn to reflect only still-unloaded tools.
- Deferred tools never bypass permission, approval, sandbox, or mode gates just because they were loaded.
- Deferred reminders must be generated from registry canonical names, not hand-maintained example names.

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Initial ToolSearch deferred-loading behavior. |
| 2 | 2026-05-27 | Assistant | Correction | Added canonical-name rules so deferred loading does not advertise incompatible subagent tool names. |
