---
artifact_id: L2-DES-TUI-006
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Assistant
last_updated: 2026-05-25
---

# L2-DES-TUI-006 — Full Transcript Alternate Screen

## Purpose

Define the current TUI behavior for the `Ctrl+T` full transcript alternate-screen overlay.

## Current Implementation Contract

- Trigger: `Ctrl+T` from the normal inline TUI event loop.
- Rendering mode: terminal alternate screen.
- Data source: the current `ChatWidget` history plus the active live tail, projected through transcript overlay cells.
- Server effect: no server command is sent when the overlay opens.
- Transcript effect: opening, scrolling, and closing the overlay do not create transcript items.
- Blocking rule: `Ctrl+T` does not open the transcript overlay while the `/resume` browser is loading or open.

The host owns alternate-screen lifecycle through the overlay state. The transcript overlay owns pager rendering, scrolling, user-message selection, and close detection. The chat widget owns conversion from current history and live state into renderable transcript cells.

## Entry And Exit

Opening the overlay follows this sequence:

1. The host receives a `Ctrl+T` key event while no overlay is active and no resume browser is open.
2. The host reads the current terminal width and enters the alternate screen.
3. The overlay is initialized from `transcript_overlay_cells(width)`.
4. The initial scroll offset is set to the bottom of the transcript.
5. A new frame is scheduled and all subsequent draw/key events are routed to the overlay until it closes.

Close keys:

| Key | Behavior |
|---|---|
| `Ctrl+T` | Close the transcript overlay and return to inline TUI rendering. |
| `q` | Close the transcript overlay and return to inline TUI rendering. |
| `Ctrl+C` | Close the transcript overlay and return to inline TUI rendering. |

`Esc` does not close the transcript overlay. It selects the previous user message for edit preview, matching the footer hint.

When the overlay is done, the host clears the overlay, leaves alternate screen, schedules a frame, and resumes normal inline drawing.

## Layout

The overlay uses the full terminal area.

```text
/ T R A N S C R I P T
<transcript content>
~
~
 ↑/↓ to scroll   pgup/pgdn to page   home/end to jump        100%
 q to quit   esc/← to edit prev   → to edit next   enter to edit message
```

Rules:

- The header line is dim and starts with `/ T R A N S C R I P T`.
- The content area starts one row below the header and ends above the two-line bottom bar.
- Empty content rows after the rendered transcript are filled with `~`.
- The bottom bar occupies two rows.
- Both bottom-bar rows are initialized as dim separator rows, then overwritten with hint text.
- The first bottom-bar row shows scroll hints and a right-aligned scroll percentage.
- The second bottom-bar row shows close and edit-selection hints.

Footer hint text:

```text
 ↑/↓ to scroll   pgup/pgdn to page   home/end to jump
 q to quit   esc/← to edit prev   → to edit next   enter to edit message
```

## Transcript Projection

Committed transcript content is projected from the widget's current history:

- Each history cell becomes a transcript overlay cell using `transcript_lines(width)`.
- User history cells also carry an editable `UserMessage` payload containing text, text elements, local image paths, and remote image URLs.
- Stream-continuation cells are marked so the overlay can avoid inserting a visual gap before continuation content.
- Non-user cells render as wrapped paragraphs.
- User-message cells render as a background-band surface using the user-message style.
- A selected user-message cell uses a stronger highlighted background and foreground.
- Non-continuation cells after the first rendered cell receive a one-row top inset.

Live turn content is projected as a live tail:

- The overlay considers a live tail present when the widget has an active cell, active text items, active tool calls, or pending tool calls.
- The live tail key includes width, active-cell revision, stream-continuation status, and optional animation tick.
- If the overlay is scrolled to the bottom, committed-cell replacement or live-tail updates keep it at the bottom.
- If the overlay is not scrolled to the bottom, live updates do not force the user away from the current review position.
- Active animation ticks schedule follow-up frames while the overlay is at the bottom.

On every draw, the host synchronizes the overlay with the current widget:

- If terminal width or committed cell count changed, committed cells are rebuilt.
- The live tail is refreshed when its key changed.
- The overlay then renders using the latest synchronized content.

## Scrolling

The pager supports press and repeat key events.

| Key | Behavior |
|---|---|
| `Up` / `k` | Scroll one line up. |
| `Down` / `j` | Scroll one line down. |
| `PageUp` / `Ctrl+B` | Scroll one page up. |
| `PageDown` / `Ctrl+F` | Scroll one page down. |
| `Space` | Scroll one page down. |
| `Shift+Space` | Scroll one page up. |
| `Ctrl+D` | Scroll half a page down. |
| `Ctrl+U` | Scroll half a page up. |
| `Home` | Jump to the top. |
| `End` | Jump to the bottom. |

The page height is derived from the last rendered content area height, falling back to the current viewport-derived content height before the first render.

## Previous Message Editing

The full transcript overlay also hosts the current previous-message edit preview behavior.

Selection behavior:

- `Esc` or `Left` selects the previous user message cell.
- `Right` selects the next user message cell.
- If no user message is selected yet, selection starts at the latest user message.
- The selected user message is scrolled into view and highlighted.
- If there are no user messages, selection remains empty.

Edit confirmation:

- Pressing `Enter` while a user message is selected is intercepted by the host before normal overlay key handling.
- The chat widget truncates visible history to include user turns through the selected user message.
- The selected message is restored into the composer with its text, text elements, local image paths, and remote image URLs.
- The overlay closes, alternate screen is left, and the status message becomes `Previous message loaded`.
- Pressing `Enter` without a selected user message has no edit effect.

## Terminal Lifecycle

While the overlay is active, it takes precedence over normal inline TUI key handling and drawing. The inline transcript, composer, and status line are not rendered into the alternate screen.

Lifecycle rules:

- Alternate-screen entry happens only after reading terminal width for the initial transcript projection.
- Overlay draw uses `tui.draw(u16::MAX, ...)`, so it owns the full viewport height.
- Closing the overlay always routes through the overlay state cleanup path, which leaves alternate screen and schedules a new inline frame.
- Resize is handled by the normal draw synchronization path because width changes rebuild committed overlay cells.
- If another alternate-screen surface such as `/resume` is open, `Ctrl+T` is ignored rather than stacking overlays.

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refines | L1-REQ-TUI-003 | 1 | specs/L1/L1-REQ-TUI-003-transcript.md | Defines full-screen transcript review, scrolling, live-tail sync, and previous-message selection behavior. |
| related-to | L1-REQ-TUI-005 | 1 | specs/L1/L1-REQ-TUI-005-terminal-lifecycle-safety.md | Uses alternate-screen entry, cleanup, resize, and restore behavior. |
| related-to | L1-REQ-TUI-007 | 1 | specs/L1/L1-REQ-TUI-007-responsive-layout-readability.md | Rebuilds transcript projection when width changes and provides pager controls for narrow or long content. |
| related-to | L1-REQ-CONV-005 | 1 | specs/L1/L1-REQ-CONV-005-immediate-message-editing.md | Hosts previous-message selection and composer restore behavior. |
| related-to | L2-DES-TUI-002 | 1 | specs/L2/tui/L2-DES-TUI-002-modern-tui-shell-layout.md | Complements the inline transcript viewport with an alternate-screen review surface. |
| related-to | L2-DES-TUI-004 | 1 | specs/L2/tui/L2-DES-TUI-004-streaming-transcript-and-state.md | Reuses transcript cell projection, live overlay state, and full-output review semantics. |
| related-to | L2-DES-TUI-005 | 1 | specs/L2/tui/L2-DES-TUI-005-terminal-lifecycle-safety.md | Depends on alternate-screen lifecycle safety and restore behavior. |
| specified-by | TBD | TBD | specs/L3/tui/TBD.md | L3 behavior has not been authored yet. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-25 | Human | Initial | Requested a design document for `Ctrl+T` full transcript alternate-screen behavior according to current `crates/tui` implementation. |
| 1 | 2026-05-25 | Assistant | Initial | Documented current entry, exit, rendering, scrolling, live sync, previous-message edit preview, and terminal lifecycle behavior. |
