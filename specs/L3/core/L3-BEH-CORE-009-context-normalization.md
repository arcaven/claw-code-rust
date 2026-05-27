---
artifact_id: L3-BEH-CORE-009
revision: 1
status: Draft
active_baseline: no
---

# L3-BEH-CORE-009 — Context Normalization

## Purpose

Define the concrete behavior for the final context normalization pass: modality filtering against model capabilities, item size bounding with truncation indicators, token-budget enforcement, and tool-call pairing integrity preservation.

## Source Design

L2-DES-CONTEXT-003 (Context Normalization)

## Behavior Specification

### B1. Modality Filter Pass

- **Trigger**: Context is assembled and ready for provider serialization.
- **Preconditions**: The resolved model profile's `modalities` field is known.
- **Algorithm / Flow**:
  1. For each content part in the assembled context:
     a. If the part kind is `image_ref` and model does not support `image` modality: drop the part. If the part is the sole content of a user message, replace with a text note: "[Image attachment omitted — current model does not support image input]".
     b. If `audio_ref` and no audio support: drop with similar replacement.
     c. If `video_ref` and no video support: drop with similar replacement.
  2. The drop is deterministic: given the same model profile and the same context, the same parts are dropped.
- **Postconditions**: No modality-incompatible content parts are sent to the model.

### B2. Item Size Bounding Pass

- **Trigger**: After modality filter.
- **Preconditions**: Item size limits are configured (`max_item_content_chars`, default 100000).
- **Algorithm / Flow**:
  1. For each transcript item in the context:
     a. If the item's total content length exceeds `max_item_content_chars`:
        - Truncate to `max_item_content_chars` characters.
        - Append a visible truncation indicator: `"\n\n[... content truncated at N characters ...]"`.
     b. The truncation indicator is included in the item's content sent to the model.
  2. Tool-call pairing integrity:
     a. A `ToolCall` item and its corresponding `ToolResult` item must both be present or both absent.
     b. If truncation would remove a `ToolResult` but keep its `ToolCall`: keep both or remove both. Prefer keeping both with the result truncated.
     c. If a `ToolCall` is truncated out but its `ToolResult` remains: remove the orphaned result.
- **Postconditions**: No single item exceeds the size limit. Tool call/result pairs are preserved or removed together.

### B3. Token-Budget Enforcement Pass

- **Trigger**: After modality filter and item size bound, before provider serialization.
- **Preconditions**: The model's `effective_context_window` is known. Total estimated tokens are computed.
- **Algorithm / Flow**:
  1. Compute total estimated token count of the normalized context.
  2. If total ≤ `effective_context_window`: pass through unchanged.
  3. If total > `effective_context_window`:
     a. Preserve (do not touch): base instructions, tool schemas, persona/mode instructions, hidden goal context, change-signal message, current user input.
     b. Reduce transcript items working backward from the oldest:
        - Drop the oldest turn (entire turn: user input + all assistant/tool items for that turn).
        - Re-check token estimate.
        - Repeat until total ≤ `effective_context_window` or only the current turn + reserved recent turns remain.
     c. If still over budget after removing all eligible turns: truncate individual items within remaining turns (shorter truncation limit).
     d. If STILL over budget: emit `ContextLimitExceeded` error. Do not send the request.
  4. Record a note in the context snapshot: how many turns were dropped, final token estimate.
- **Postconditions**: The context sent to the provider fits within the model's effective window. Dropped turns are logged.
- **Edge Cases**: The current turn's user input alone exceeds the model's context window → fail the turn with `ContextLimitExceeded`. Compaction should have run before normalization; if it hasn't, normalization applies budget enforcement as a last resort.

### B4. Model-Switching Safety

- **Trigger**: User changes the active model mid-session.
- **Preconditions**: The new model may have different modalities, context window size, or tool support.
- **Algorithm / Flow**:
  1. On model change: re-run full normalization for the next turn using the new model's profile.
  2. Modality filter may drop previously-included content parts → the drop is silent (no user-facing warning for parts that were in prior turns).
  3. New tool availability is resolved (some tools may not be available under the new model).
  4. If the new model has a smaller context window: normalization's budget enforcement may drop older turns.
  5. If the dropped content is significant, include a note in the change-signal message: "Model changed to <new_model>. Context window reduced; N earlier turns were omitted from the current context."
- **Postconditions**: The model switch is safe. No incompatible content is sent.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-CONTEXT-003 | specified-by |
| L2-DES-CONTEXT-001 | specified-by |

## Implementation Notes

- Normalization is a pure function: `(AssembledContext, ResolvedModelProfile) → NormalizedContext`. This enables deterministic replay.
- Item truncation uses character count (not byte count) for the indicator message, but the truncation itself is at byte boundaries valid for UTF-8.
- Token-budget reduction keeps the immutable prefix intact — it only removes transcript turns.
- Tool-call pairing is verified AFTER item size bounding to ensure truncation didn't break a pair.
