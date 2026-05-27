---
artifact_id: L3-BEH-TUI-008
revision: 1
status: Draft
active_baseline: no
---

# L3-BEH-TUI-008 — Full Transcript Alternate Screen

## Purpose

Define the concrete `Ctrl+T` full transcript alternate-screen behavior, including entry, rendering, scrolling, live-tail synchronization, previous-message selection, and terminal cleanup.

## Source Design

L2-DES-TUI-006 (Full Transcript Alternate Screen), L2-DES-TUI-007 (Session Rendering Consistency), L2-DES-TUI-005 (Terminal Lifecycle Safety)

## Behavior Specification

### B1. Entry Guard

- **Trigger**: User presses `Ctrl+T` in the inline TUI.
- **Preconditions**: No modal or alternate-screen surface is active, and the resume/session browser is not open.
- **Algorithm / Flow**:
  1. Read current terminal width.
  2. Build overlay cells from the current `TranscriptProjection` defined by `L3-BEH-TUI-006`.
  3. Enter terminal alternate screen.
  4. Initialize scroll offset to the bottom.
  5. Route draw and key events to the overlay until it closes.
- **Postconditions**: Inline transcript, composer, and status line stop drawing while the overlay is active.

### B2. Layout

The overlay owns the full terminal area:

```text
/ T R A N S C R I P T
<transcript content>
~
~
 ↑/↓ to scroll   pgup/pgdn to page   home/end to jump        100%
 q to quit   esc/← to edit prev   → to edit next   enter to edit message
```

Rules:

- Header is dim and starts with `/ T R A N S C R I P T`.
- Content begins one row below the header and ends above the two-line footer.
- Empty content rows render `~`.
- Footer row one shows scroll hints and right-aligned percentage.
- Footer row two shows close and previous-message edit hints.

### B3. Scrolling

- `Up`/`k`: one line up.
- `Down`/`j`: one line down.
- `PageUp`/`Ctrl+B`: one page up.
- `PageDown`/`Ctrl+F`/`Space`: one page down.
- `Shift+Space`: one page up.
- `Ctrl+D`: half page down.
- `Ctrl+U`: half page up.
- `Home`: top.
- `End`: bottom.

The page height is the current content viewport height.

### B4. Live Tail Synchronization

- **Trigger**: New live events arrive while the overlay is open.
- **Preconditions**: The session subscription remains active.
- **Algorithm / Flow**:
  1. Apply live events to `TranscriptProjection`.
  2. Rebuild overlay rows when projection revision, terminal width, or live-tail key changes.
  3. If the user is already at the bottom, keep the overlay pinned to the bottom.
  4. If the user has scrolled away, preserve the current review position and show updated scroll percentage.
- **Postconditions**: The overlay can review history while active work continues.

### B5. Previous Message Selection

- `Esc` or `Left`: select previous user message.
- `Right`: select next user message.
- Initial selection starts at the latest user message.
- Selection scrolls into view and uses the selected user-message style.
- `Enter` with a selected user message closes the overlay and restores that message into the composer for edit flow.
- `Enter` with no selected user message has no edit effect.

### B6. Exit And Cleanup

- Close keys: `Ctrl+T`, `q`, `Ctrl+C`.
- Exit always leaves alternate screen, clears overlay state, schedules an inline frame, and restores normal key routing.
- `Esc` is not a close key because it is reserved for previous-message selection.
- Overlay stacking is forbidden; `Ctrl+T` is ignored when another alternate-screen surface is active.

## Required Tests

- Entry/exit restores inline terminal state.
- Scroll keys update offset and percentage correctly.
- Live events update the overlay without forcing scroll when the user is not at bottom.
- Previous-message selection restores composer content without creating a transcript item.
- Width changes rebuild rows from `TranscriptProjection`.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-TUI-006 | specified-by |
| L2-DES-TUI-007 | related-to |
| L2-DES-TUI-005 | specified-by |

## Implementation Notes

- Do not send a server request when opening the overlay.
- Do not persist overlay scroll offset, selection state, or animation frames.
- Reuse the same cell renderers as inline transcript rendering.
