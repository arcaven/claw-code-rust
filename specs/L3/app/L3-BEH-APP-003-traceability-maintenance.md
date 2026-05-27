---
artifact_id: L3-BEH-APP-003
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Assistant
last_updated: 2026-05-27
---

# L3-BEH-APP-003 - Traceability Maintenance

## Purpose

Define implementation behavior for maintaining and validating specification traceability matrices, with initial focus on `L2 -> L3` coverage.

## Source Design

- `L2-DES-TRACE-001` defines the traceability system, matrix schemas, relationship types, and planned gap detection scripts.
- `specs/traceability/l2_to_l3.md` is the central source of truth for L2 to L3 relationships.

## Core Types

```rust
pub struct SpecArtifact {
    pub artifact_id: String,
    pub revision: u32,
    pub path: PathBuf,
    pub title: String,
}

pub struct TraceLink {
    pub source_id: String,
    pub source_path: PathBuf,
    pub target_id: String,
    pub target_path: PathBuf,
    pub relationship: TraceRelationship,
    pub rationale: String,
}

pub enum TraceRelationship {
    RefinedBy,
    SpecifiedBy,
    RealizedBy,
    Verifies,
    RelatedTo,
}

pub struct TraceabilityGapReport {
    pub source_total: usize,
    pub primary_linked: Vec<SpecArtifact>,
    pub related_only: Vec<SpecArtifact>,
    pub unlinked: Vec<SpecArtifact>,
    pub stale_sources: Vec<String>,
    pub stale_targets: Vec<String>,
    pub duplicate_rows: Vec<TraceLink>,
}
```

The implementation language may be Python for repository tooling, but these types define the data model the tooling must preserve.

## B1. Parse Spec Artifacts

- **Trigger**: A traceability validation script starts.
- **Preconditions**: The repository root is known.
- **Algorithm / Flow**:
  1. Scan the source spec directory for `*.md`.
  2. Read YAML frontmatter.
  3. Prefer `artifact_id` from frontmatter.
  4. Fall back to filename ID only for warning diagnostics.
  5. Extract revision and title.
  6. Reject duplicate artifact ids.
- **Postconditions**: The script has a map of authoritative spec artifacts keyed by id.
- **Errors**: Missing source directory, unreadable files, duplicate ids, and missing artifact ids are reported clearly.

## B2. Parse Matrix Files

- **Trigger**: Source artifacts have been parsed.
- **Preconditions**: The expected matrix file exists.
- **Algorithm / Flow**:
  1. Parse Markdown table rows.
  2. Ignore header and separator rows.
  3. Validate required columns for the matrix kind.
  4. Validate relationship values.
  5. Normalize relative paths.
  6. Report malformed rows as warnings with line numbers.
- **Postconditions**: The script has normalized trace links.
- **Errors**: Missing matrix file is fatal. Malformed rows do not hide other valid rows.

## B3. Validate L2 To L3 Coverage

- **Trigger**: `l2_l3_traceability_gaps.py` runs.
- **Preconditions**: L2 artifacts, L3 artifacts, and `l2_to_l3.md` links are parsed.
- **Algorithm / Flow**:
  1. For each L2 artifact, collect links where `source_id` matches.
  2. Classify:
     - `primary_linked`: at least one `specified-by` link to an existing L3 target.
     - `related_only`: at least one valid `related-to` link but no valid `specified-by`.
     - `unlinked`: no valid links.
  3. Report stale sources: matrix source ids not found in L2 artifacts.
  4. Report stale targets: matrix target ids not found in L3 artifacts.
  5. Report duplicate source-target-relationship rows.
  6. Emit both text and JSON output.
- **Postconditions**: Coverage counts distinguish primary coverage from secondary impact links.

## B4. Synchronize Embedded Traceability Sections

- **Trigger**: Central matrix validation runs, or a dedicated embedded-trace check runs.
- **Preconditions**: Matrix links and spec file contents are available.
- **Algorithm / Flow**:
  1. Treat central matrix files as authoritative.
  2. Scan each L2 spec's `Traceability` section for `specified-by` rows.
  3. If the central matrix has a `specified-by` L3 row but the L2 file still says `TBD`, report `embedded_trace_stale`.
  4. If an embedded row points to an L3 artifact not present in the central matrix, report `embedded_trace_extra`.
  5. The tool may offer a machine-readable patch suggestion, but it must not rewrite files automatically unless a later workflow explicitly enables autofix.
- **Postconditions**: Developers can detect drift between central matrix and embedded trace sections.
- **Rationale**: Individual spec files are useful for reading context, but centralized matrices remain the source of truth.

## B5. Exit Codes

- **Trigger**: Validation completes.
- **Preconditions**: A gap report exists.
- **Algorithm / Flow**:
  1. Exit with `0` when there are no unlinked artifacts, no related-only artifacts, no stale links, and no duplicate rows.
  2. Exit with `1` when any primary coverage gap exists.
  3. Exit with `2` for script usage errors, missing matrix files, or duplicate artifact ids.
  4. In advisory mode, always exit `0` but include the same JSON counts.
- **Postconditions**: CI can choose advisory or blocking behavior without changing report semantics.

## B6. Required Scripts

Initial scripts:

- `specs/l1_l2_traceability_gaps.py`: existing L1 to L2 validator.
- `specs/l2_l3_traceability_gaps.py`: required L2 to L3 validator.

Future scripts:

- `specs/l3_impl_traceability_gaps.py`
- `specs/verification_gaps.py`

Shared parsing code may be extracted only after at least two scripts need it. Until then, duplication is acceptable if behavior stays clear and tested.

## B7. Required Tests

- Duplicate artifact ids cause fatal validation failure.
- L2 artifact with no row is reported as unlinked.
- L2 artifact with only `related-to` rows is reported as related-only.
- `specified-by` row with missing L3 target is stale, not valid coverage.
- Matrix rows pointing at removed L2 ids are stale sources.
- Duplicate rows are reported.
- JSON output includes counts and artifact lists.
- Embedded `specified-by TBD` is reported when central matrix has a real L3 target.
- Advisory mode preserves report content while returning exit code 0.

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| specifies | L2-DES-TRACE-001 | 1 | specs/L2/traceability/L2-DES-TRACE-001-traceability-system.md | Implements matrix parsing, L2-L3 gap detection, stale link detection, embedded trace drift checks, and validation exit semantics. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-27 | Assistant | Initial | Initial L3 traceability maintenance behavior. |
