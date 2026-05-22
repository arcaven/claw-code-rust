---
artifact_id: L2-DES-APP-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Assistant
last_updated: 2026-05-22
---

# L2-DES-APP-002 — Configuration Precedence

## Purpose

Refine configuration requirements into a source-precedence and persistence design for user-scoped and project-scoped configuration.

## Background / Context

The program has durable configuration at two scopes. User-scoped configuration carries personal defaults across projects. Project-scoped configuration carries settings that should apply when working inside a specific project directory.

Onboarding creates durable model invocation configuration. That setup can include user providers, provider credentials or credential references, provider-specific model names, invocation methods, and reasoning effort defaults. These values must be saved before onboarding is considered complete.

## Source Requirements

- `L1-REQ-APP-010` requires persistent configuration, specific configuration file locations, and project-over-user precedence.
- `L1-REQ-MODEL-001` requires persisted invocable model configuration.
- `L1-REQ-MODEL-002` requires persisted provider configuration.
- `L1-REQ-MODEL-003` requires onboarding-created model and provider configuration to be restorable.
- `L1-REQ-TUI-010` requires the TUI to submit successful onboarding results for persistence.
- `L1-REQ-APP-012` requires safe credential handling and routine client views that do not expose plaintext credentials by default.

## Design Requirement

The program should compute an effective configuration from available configuration sources while preserving source identity for diagnostics and inspection.

Configuration source priority is:

1. Project-scoped configuration: `project_directory/.dev/config.toml`
2. User-scoped configuration:
   - Windows: `C:\Users\username\.devo\config.toml`
   - macOS and Linux: `~/.devo/config.toml`

When both sources define overlapping settings, the project-scoped value takes precedence.

## Effective Configuration

Effective configuration is resolved conceptually as:

```text
User config
        +
Project config
        ↓
EffectiveConfig
```

Resolution rules:

- Missing configuration sources are allowed.
- User-scoped configuration provides the base values.
- Project-scoped configuration overlays user-scoped configuration for overlapping settings.
- Non-overlapping settings from both sources may contribute to the effective configuration.
- Effective configuration should retain enough source metadata to explain which source supplied a value when users inspect configuration or when errors occur.
- Invalid higher-priority configuration should produce an actionable error instead of silently falling back to lower-priority configuration for the same setting.

For keyed collections such as providers or model-provider bindings:

- Stable identifiers are used to detect overlapping records.
- A project-scoped record with the same stable identifier as a user-scoped record overrides the user-scoped record.
- User-scoped records that do not overlap project-scoped records remain available unless project-scoped configuration explicitly disables or replaces the relevant collection according to a later schema rule.

For selected defaults:

- A project-scoped default model binding overrides a user-scoped default model binding.
- A project-scoped default reasoning effort overrides a user-scoped default reasoning effort for the same effective binding.

## Onboarding Persistence

Successful onboarding model setup produces durable configuration data:

- Selected supported model slug.
- Selected existing provider or newly created provider.
- Provider name, base URL, and credential material or credential reference when a provider is added.
- Provider-specific model name.
- Invocation method.
- Reasoning effort when the selected supported model permits reasoning.
- Default binding or default reasoning selection where required by the onboarding flow.

The program should persist onboarding output before normal model invocation begins. If persistence fails, onboarding should report a recoverable configuration error rather than allowing the user to believe setup is durable.

Until a dedicated target selector is specified, the default persistence target should be deterministic:

- If onboarding runs with an active project directory, persist to `project_directory/.dev/config.toml`.
- If onboarding runs without an active project directory, persist to the user-scoped configuration file for the current operating system.

When the persistence target affects visibility, sharing, or credential placement, the program should make the target understandable to the user through confirmation, inspection, or error output.

## Credential Handling

Credential entry during onboarding is an explicit credential-handling flow. The persistent configuration may store credential material directly or store a credential reference, depending on the later credential-storage design.

Regardless of storage backend:

- Routine client model lists, provider lists, and model switchers should show credential status rather than plaintext credential values by default.
- Errors should identify the affected provider and configuration source without printing plaintext credentials by default.
- If credential material is stored in a project-scoped configuration file, the program should make the project-scoped persistence target understandable to the user.

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refines | L1-REQ-APP-010 | 1 | specs/L1/L1-REQ-APP-010-configuration.md | Defines configuration sources, precedence, and persistence target behavior. |
| related-to | L1-REQ-MODEL-001 | 1 | specs/L1/L1-REQ-MODEL-001-config.md | Model provider bindings are durable configuration records. |
| related-to | L1-REQ-MODEL-002 | 1 | specs/L1/L1-REQ-MODEL-002-provider.md | Provider records are durable configuration records. |
| related-to | L1-REQ-MODEL-003 | 1 | specs/L1/L1-REQ-MODEL-003-onboard.md | Onboarding creates configuration that must be persisted. |
| related-to | L1-REQ-TUI-010 | 1 | specs/L1/L1-REQ-TUI-010-onboarding-ui.md | TUI onboarding submits setup results for persistence. |
| related-to | L1-REQ-APP-012 | 1 | specs/L1/L1-REQ-APP-012-privacy-data-ownership.md | Credential persistence and projection behavior must follow privacy expectations. |
| specified-by | TBD | TBD | specs/L3/app/TBD.md | L3 behavior has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-22 | Assistant | Initial | Initial configuration precedence and onboarding persistence design. |
