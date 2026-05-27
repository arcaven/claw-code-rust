---
artifact_id: L3-BEH-APP-001
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Assistant
last_updated: 2026-05-27
---

# L3-BEH-APP-001 - Configuration Resolution And Persistence

## Purpose

Define implementation behavior for loading, validating, merging, inspecting, and persisting the user-scoped and project-scoped `config.toml` plus companion `auth.json` files.

## Source Design

- `L2-DES-APP-002` defines source precedence and persistence targets.
- `L2-DES-APP-005` defines the `config.toml` and `auth.json` schemas.
- `L2-DES-MODEL-001` defines provider and model binding semantics.
- `L2-DES-APP-004` defines diagnostics, privacy, and redaction expectations.

## Core Types

```rust
pub enum ConfigScope {
    User,
    Project { workspace_root: PathBuf },
}

pub struct ConfigSourcePaths {
    pub scope: ConfigScope,
    pub config_path: PathBuf,
    pub auth_path: PathBuf,
}

pub struct LoadedConfigSource {
    pub paths: ConfigSourcePaths,
    pub config: Option<ConfigDocument>,
    pub auth: Option<AuthDocument>,
    pub diagnostics: Vec<ConfigDiagnostic>,
}

pub struct EffectiveConfig {
    pub defaults: EffectiveDefaults,
    pub providers: BTreeMap<ProviderId, EffectiveProvider>,
    pub model_bindings: BTreeMap<ModelBindingId, EffectiveModelBinding>,
    pub mcp_servers: BTreeMap<McpServerId, EffectiveMcpServer>,
    pub skill_roots: BTreeMap<SkillRootId, EffectiveSkillRoot>,
    pub tool_config: EffectiveToolConfig,
    pub workspace_instructions: EffectiveWorkspaceInstructionConfig,
    pub tui: EffectiveTuiConfig,
    pub logging: EffectiveLoggingConfig,
    pub telemetry: EffectiveTelemetryConfig,
    pub provenance: ConfigProvenance,
}

pub struct ConfigProvenance {
    pub values: BTreeMap<ConfigPath, ConfigValueSource>,
}

pub struct ConfigValueSource {
    pub scope: ConfigScope,
    pub file: PathBuf,
    pub table_path: String,
    pub field: Option<String>,
}
```

Implementation may use concrete TOML and JSON libraries of choice, but the public behavior must preserve source identity and avoid losing unrelated user-editable content.

## B1. Resolve Source Paths

- **Trigger**: CLI startup, server startup, `config.inspect`, onboarding persistence, `/model` persistence, or config refresh.
- **Preconditions**: The current workspace root is known or absent.
- **Algorithm / Flow**:
  1. Resolve the user-scoped configuration directory:
     - Windows: `C:\Users\username\.devo`
     - macOS and Linux: `~/.devo`
  2. Resolve user paths:
     - `config.toml`
     - `auth.json`
  3. If an active project directory exists, resolve project paths:
     - `project_directory/.dev/config.toml`
     - `project_directory/.dev/auth.json`
  4. Return sources in precedence order for loading: user first, then project.
- **Postconditions**: The resolver never uses `~/.config/devo` or project `.devo` as the configured path for this schema.
- **Errors**: Nonexistent files are not errors. Unreadable existing files produce source diagnostics.

## B2. Load And Parse Sources

- **Trigger**: Source paths are available.
- **Preconditions**: File access is available.
- **Algorithm / Flow**:
  1. Read each existing `config.toml` as UTF-8 text.
  2. Parse TOML into a syntax-preserving document when the implementation can do so; otherwise preserve unknown extension sections in a separate raw map.
  3. Read each existing `auth.json` as UTF-8 JSON.
  4. Parse `auth.json` into `AuthDocument`.
  5. Attach `ConfigDiagnostic` records to the affected source instead of panicking.
- **Postconditions**: Missing sources are represented as empty sources. Malformed sources remain visible in diagnostics.
- **Errors**: Malformed higher-priority configuration blocks effective resolution of the affected setting; it must not silently fall back to lower-priority values for the same setting.

## B3. Validate Each Source Independently

- **Trigger**: A source has been parsed.
- **Preconditions**: Schema version is available or absent.
- **Algorithm / Flow**:
  1. Validate `schema_version`.
  2. Validate field types in known sections.
  3. Validate enabled keyed records contain required fields.
  4. Preserve unknown top-level extension sections under `[x.<namespace>]`.
  5. Produce diagnostics for unsupported fields under known sections.
  6. Validate `auth.json` credential shape without printing credential values.
- **Postconditions**: Source diagnostics identify path, table, field, severity, and recovery hint.
- **Errors**: Unsupported schema versions are fatal for that source.

## B4. Merge Sources Into EffectiveConfig

- **Trigger**: Source validation has completed.
- **Preconditions**: User and optional project sources are available.
- **Algorithm / Flow**:
  1. Start with user-scoped non-secret configuration and user-scoped auth.
  2. Overlay project-scoped non-secret configuration and project-scoped auth.
  3. For scalar settings, project value replaces user value only when present.
  4. For keyed records, the TOML table key is the identity:
     - Same key in project source replaces the whole user record.
     - `enabled = false` in project source disables the effective record.
     - New project key adds a record.
     - Unmentioned user keys remain effective.
  5. For auth records, project credential ids replace user credential ids with the same key.
  6. Record provenance for every effective value and record.
- **Postconditions**: Effective configuration is deterministic and explainable.
- **Errors**: Partial record merging across scopes is forbidden because it may accidentally combine a user provider endpoint with a project model or credential.

## B5. Validate Effective Configuration

- **Trigger**: Effective configuration has been built.
- **Preconditions**: Built-in supported model catalog and known invocation methods are available.
- **Algorithm / Flow**:
  1. Validate defaults reference enabled effective records.
  2. Validate each provider has a valid base URL and credential reference.
  3. Validate each model binding references:
     - An enabled provider.
     - A supported `model_slug`.
     - A valid `invocation_method`.
     - A valid `default_reasoning_effort` when present.
  4. Validate `display_name` is present for enabled model bindings.
  5. Validate MCP server transport-specific fields.
  6. Validate skill root path syntax but defer expensive filesystem scans to skill discovery.
  7. Validate credential references against effective auth data.
- **Postconditions**: The server receives either an `EffectiveConfig` or a structured error set.
- **Errors**: Missing credentials, invalid higher-priority overrides, disabled providers, and invalid reasoning values are actionable configuration errors.

## B6. Inspect Configuration Safely

- **Trigger**: `config.inspect`, `/status`, model picker setup, provider diagnostics, or onboarding repair flow.
- **Preconditions**: Effective configuration or diagnostics are available.
- **Algorithm / Flow**:
  1. Build a client projection from `EffectiveConfig`.
  2. Include source scope, source path, enabled status, display names, provider names, model slugs, model names, invocation methods, and credential status.
  3. Exclude plaintext credential values.
  4. Include diagnostics and recovery hints.
  5. Mark whether values came from user scope or project scope when behavior differs.
- **Postconditions**: Clients can explain configuration without exposing secrets.

## B7. Plan Persistence Writes

- **Trigger**: Onboarding completes, `/model` creates or repairs a binding, a default is changed before first user message, graceful server exit persists reasoning effort, theme changes, permission policy changes, MCP setup changes, or skill root changes.
- **Preconditions**: The caller specifies a write intent and target scope.
- **Algorithm / Flow**:
  1. Convert the user action into a `ConfigWritePlan`.
  2. Resolve the target paths from B1.
  3. Classify changes:
     - `auth_only`
     - `config_only`
     - `auth_then_config`
  4. Validate that plaintext secret values appear only in the auth write candidate.
  5. Read the latest files again and rebase the intended change on the latest parsed documents.
  6. Validate the final candidate documents before writing.
- **Postconditions**: The write plan is explicit about target files, affected records, and whether credentials are involved.
- **Errors**: A plan that would write plaintext credentials to `config.toml` is rejected before disk write.

## B8. Commit Writes Atomically Per File

- **Trigger**: A valid write plan is ready.
- **Preconditions**: Parent directory can be created or already exists.
- **Algorithm / Flow**:
  1. Acquire a source-scope lock, such as `.dev/config.lock` or `.devo/config.lock`.
  2. Create parent directories with user-only permissions where the platform supports them.
  3. If `auth.json` is changing:
     - Write `auth.json.tmp` with restrictive file permissions.
     - Flush and rename it over `auth.json`.
  4. Revalidate the final `config.toml` candidate against the final auth view.
  5. If `config.toml` is changing:
     - Write `config.toml.tmp`.
     - Flush and rename it over `config.toml`.
  6. Release the lock.
  7. Emit `config.changed` and structured observability records.
- **Postconditions**: Each file replacement is atomic. Final `config.toml` must not reference a credential id absent from the final `auth.json`.
- **Recovery**: If auth succeeds but config fails, the result may contain an unused credential; that is safer than a config record referencing a missing credential. A later cleanup flow may remove unused credentials after user confirmation.
- **Errors**: On failure, report target path, scope, affected record id, and recovery hint without printing secret values.

## B9. Concurrent Edit Handling

- **Trigger**: A write plan is prepared while another process or editor may modify the files.
- **Preconditions**: Latest file hashes or timestamps are available.
- **Algorithm / Flow**:
  1. Capture base hash before editing.
  2. Re-read before commit.
  3. If unrelated edits can be merged by schema path, rebase and continue.
  4. If the same record or field changed externally, abort with `config_conflict`.
  5. Keep the user's file content unchanged on conflict.
- **Postconditions**: The program avoids overwriting user edits it cannot safely merge.

## B10. Required Tests

- Missing user and project files produce empty effective configuration plus no fatal error.
- Project scalar values override user scalar values.
- Project keyed records replace whole user records with the same id.
- `enabled = false` in project config disables the user record with that id.
- Invalid project override blocks fallback for the same setting.
- `config.inspect` never returns plaintext credential values.
- Onboarding write creates `config.toml` and `auth.json` in the correct scope.
- `auth_then_config` never leaves final config referencing a missing credential id.
- Conflicting concurrent edits abort without overwriting user changes.
- Unknown extension sections are preserved after unrelated writes.

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| specifies | L2-DES-APP-002 | 1 | specs/L2/app/L2-DES-APP-002-configuration-precedence.md | Implements source path resolution, precedence, effective config, inspection, and persistence target rules. |
| specifies | L2-DES-APP-005 | 1 | specs/L2/app/L2-DES-APP-005-config-toml-schema.md | Implements schema validation, safe projections, and atomic per-file writes for `config.toml` and `auth.json`. |
| related-to | L2-DES-MODEL-001 | 1 | specs/L2/model/L2-DES-MODEL-001-model-provider-binding.md | Validates provider and model binding records. |
| related-to | L2-DES-APP-004 | 1 | specs/L2/app/L2-DES-APP-004-observability-architecture.md | Emits configuration diagnostics and redacted change records. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Initial L3 configuration resolution, validation, inspection, and persistence behavior. |
