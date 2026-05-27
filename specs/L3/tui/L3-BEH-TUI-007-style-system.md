---
artifact_id: L3-BEH-TUI-007
revision: 1
status: Draft
active_baseline: no
---

# L3-BEH-TUI-007 — TUI Style System Implementation

## Purpose

Define the concrete style-token, symbol, spinner, popup, and component contracts that implement `L2-DES-TUI-008`.

## Source Design

L2-DES-TUI-008 (TUI Style System), L2-DES-TUI-002 (Modern TUI Shell Layout), L2-DES-TUI-003 (Composer and Input Modes), L2-DES-TUI-004 (Streaming Transcript and State)

## Behavior Specification

### B1. Theme Data Model

```rust
pub struct Theme {
    pub name: String,
    pub appearance: ThemeAppearance,
    pub core: CoreTokens,
    pub text: TextTokens,
    pub surface: SurfaceTokens,
    pub mode: ModeTokens,
    pub tool: ToolTokens,
    pub diff: DiffTokens,
    pub markdown: MarkdownTokens,
    pub terminal: TerminalTokens,
}
```

Rules:

- Built-in themes are `devo-dark` and `devo-light`.
- Component code must request semantic tokens, not hardcoded colors.
- Missing required tokens fail closed to `devo-dark` or `devo-light` and emit a diagnostic.
- Runtime theme switching repaints the frame without mutating session projection state.

### B2. Symbol Constants

The TUI crate should expose a central symbol table:

```rust
pub struct Symbols {
    pub transcript_marker: &'static str, // "┃"
    pub relation_marker: &'static str,   // "┗"
    pub focused: &'static str,           // ">"
    pub enabled: &'static str,           // "●"
    pub completed_turn: &'static str,    // "▣"
    pub progress_filled: &'static str,   // "▰"
    pub progress_empty: &'static str,    // "▱"
    pub timer: &'static str,             // "⏱"
}
```

Rules:

- Avoid emoji for core state symbols because terminal display width is inconsistent.
- `┃` is a single marker, not a full cell rail.
- User and composer content lines may repeat `┃`; padding rows do not.
- Navigable lists reserve independent focus and enabled marker columns.

### B3. Spinner

```rust
pub const SPINNER_FRAMES: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
```

Rules:

- Frame interval: 80-120ms.
- Active-work label format: `<frame> <label> · ⏱ <duration>`.
- Restored history never animates; it renders terminal states only.

### B4. Popup and Navigable List Rendering

- The popup content must not include the word "popup".
- Search/focus rows use two marker columns:
  - `> ● high` means focused and enabled.
  - `>   medium` means focused but not enabled.
  - `  ● high` means enabled but not focused.
- Focused row label and description use `core.primary`.
- Non-focused labels use `text.primary`; descriptions use `text.muted`.
- Do not insert blank rows between different result types unless a required heading creates a true segment.

### B5. Component Style Contracts

- Header: `core.primary` wordmark, `core.border` border, muted labels, primary values.
- User band: `surface.userBand`, primary `┃`, primary text.
- Composer band: `surface.inputBand`, muted empty hint, primary typed text.
- Assistant cell: primary reply text, muted reasoning body, italic `Thinking:` or `Thought:` label where supported.
- Tool cell: single `┃`, `Explore`/`Create`/`Edit`/`Running`/`Run` labels, folded output counts, diff tokens for patches.
- Plan cell: `○` pending, `●` in progress, `✓` completed, `⚠` blocked.
- Completed-turn summary: `▣ Build · <model display name> · <duration>`.

## Required Tests

- Built-in themes resolve all required tokens.
- Every transcript cell renderer can render without color and still conveys state through text or symbols.
- Navigable list marker combinations match the four focus/enabled cases.
- Spinner labels include `⏱` before elapsed time.
- Golden frames at narrow and wide terminal widths do not overlap composer, transcript, or popup content.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TUI-008 | specified-by |
| L2-DES-TUI-002 | specified-by |
| L2-DES-TUI-003 | specified-by |
| L2-DES-TUI-004 | specified-by |

## Implementation Notes

- Store user-selected theme name in the `[tui]` section defined by `L2-DES-APP-005`.
- OSC terminal color override is optional and must use the restoration behavior in `L3-BEH-TUI-003`.
- Rich terminal widgets must be renderer-owned; model output cannot directly instantiate arbitrary widgets.
