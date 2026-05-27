---
artifact_id: L3-BEH-PROVIDER-002
revision: 1
status: Draft
active_baseline: no
---

# L3-BEH-PROVIDER-002 — Provider Stream Normalization

## Purpose

Define the concrete behavior for consuming provider-specific streaming responses (SSE, streaming JSON), normalizing them into internal runtime events, coalescing deltas for durable storage, and generating live client events.

## Source Design

L2-DES-MODEL-001 (Model Provider Binding), L2-DES-APP-003 (Client Server Protocol), L2-DES-CONV-001 (Session JSONL Data Model)

## Behavior Specification

### B1. Provider Stream Consumption

- **Trigger**: The provider returns an HTTP response with a streaming content type (SSE or streaming JSON).
- **Preconditions**: The provider request was accepted. The response status is 2xx.
- **Algorithm / Flow**:
  1. Based on the provider type, create a stream parser:
     - OpenAI: SSE lines prefixed with `data: ` containing JSON objects with `type` field.
     - Anthropic: SSE lines with `data: ` containing JSON objects with `type` field (message_start, content_block_start, content_block_delta, content_block_stop, message_delta, message_stop).
  2. Read the HTTP response body as a byte stream. Split on `\n\n` (SSE event boundary).
  3. For each event:
     a. Parse the `data:` line as JSON.
     b. Extract the event `type`.
     c. Map to an internal `ProviderEvent` variant (see B2).
     d. Push the event to a broadcast channel for consumers (execution engine, client event emitter).
  4. Stream ends when the HTTP body is exhausted or the connection closes.
- **Postconditions**: Provider-specific events are converted to internal events. The raw provider format is not exposed beyond this layer.
- **Error Handling**: Invalid JSON in a data line → skip the event, log warning. Connection drops mid-stream → emit `llm_request_failed` with error.

### B2. Provider Event Normalization

- **Trigger**: A raw provider event is parsed.
- **Preconditions**: The provider type is known (OpenAI or Anthropic).
- **Algorithm / Flow**: Map provider events to internal `ProviderEvent` enum variants:

  | Internal Event | OpenAI Source | Anthropic Source |
   |---|---|---|
   | `LlmRequestStarted` | First event | `message_start` |
   | `ReasoningStarted` | `response.reasoning_text.delta` (first) | `content_block_start` with thinking |
   | `ReasoningDelta` | `response.reasoning_text.delta` | `content_block_delta` with thinking |
   | `ReasoningCompleted` | After last reasoning delta | `content_block_stop` for thinking |
   | `AssistantResponseStarted` | `response.output_text.delta` (first) | `content_block_start` with text |
   | `AssistantResponseDelta` | `response.output_text.delta` | `content_block_delta` with text |
   | `AssistantResponseCompleted` | After last text delta | `content_block_stop` for text |
   | `ToolCallStarted` | `response.tool_call_started` or first `function_call_arguments.delta` | `content_block_start` with tool_use |
   | `ToolCallArgumentsDelta` | `response.function_call_arguments.delta` | `content_block_delta` with tool_use input_json |
   | `ToolCallCompleted` | After last tool args delta | `content_block_stop` for tool_use |
   | `UsageReceived` | `response.completed` or `usage` field | `message_delta` or `message_stop` |
   | `LlmRequestCompleted` | `response.completed` | `message_stop` |
   | `LlmRequestFailed` | Error event or connection error | Error event or `message_stop` with error |

  3. Preserve provider-specific fields in a `provider_metadata` payload for debugging.

### B3. Delta Coalescence for Durable Storage

- **Trigger**: `ReasoningDelta`, `AssistantResponseDelta`, or `ToolCallArgumentsDelta` events are emitted.
- **Preconditions**: An `item_started` durable record has been written for the current logical item.
- **Algorithm / Flow**:
  1. Buffer deltas in memory, keyed by item and content part index.
  2. Coalesce deltas into `item_content_appended` durable records using the thresholds from L3-BEH-CORE-005 B4:
     - 4096 bytes accumulated per content part.
     - 500ms elapsed since last append for this item.
     - Semantic boundary (end of reasoning, tool call completed, final assistant text).
  3. On semantic boundary: flush ALL buffered deltas for the item regardless of byte/time thresholds.
  4. Write `item_content_appended` record with: `item_id`, `content_part`, `offset`, `content_kind`, `content`.
- **Postconditions**: Content is durable at coalescence granularity. Replay reconstructs the full content.

### B4. Live Client Event Generation

- **Trigger**: Provider events are normalized and coalesced.
- **Preconditions**: At least one client is subscribed to the session.
- **Algorithm / Flow**:
  1. From the coalesced content updates, generate `item_content_update` server-client events.
  2. Throttle client events: at most one `item_content_update` per item per 100ms (configurable). If multiple deltas accumulate, send one coalesced update with the accumulated delta.
  3. For structural events (`ToolCallStarted`, `ToolCallCompleted`), send immediately (no throttling).
  4. Include enough context for clients to render: `session_id`, `turn_id`, `item_id`, `content_part_index`, `operation` (Append or Replace), `text`, `is_coalesced`.
- **Postconditions**: Clients receive responsive but not overwhelming live updates. Throttled events are combined.

### B5. Stream Cancellation

- **Trigger**: Turn interruption is requested during model invocation.
- **Preconditions**: A provider HTTP stream is active.
- **Algorithm / Flow**:
  1. On interrupt signal (CancellationToken):
     a. Abort the HTTP request future (drop the response body stream).
     b. Flush any remaining buffered deltas to durable storage.
     c. Record partial usage if available.
     d. Emit `llm_request_failed` with `interrupted` status.
  2. If the provider connection cannot be cleanly aborted (network state): stop reading further events, close the connection.
- **Postconditions**: Partial content is preserved. The turn transitions to `Interrupted`.

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-MODEL-001 | specified-by |
| L2-DES-APP-003 | specified-by |
| L2-DES-CONV-001 | specified-by |

## Implementation Placement Guidance

- Stream parsers belong in the provider crate and should be organized by provider family or protocol format.
- Normalization produces `ProviderEvent` which is consumed by the execution engine's event loop.
- Client event throttling uses a per-item timer (`tokio::time::interval`) to batch updates.
