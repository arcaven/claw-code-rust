---
artifact_id: L3-BEH-SERVER-001
revision: 2
status: Draft
active_baseline: no
---

# L3-BEH-SERVER-001 — Server Runtime and Transport

## Purpose

Define the server crate's orchestration responsibilities: startup/bootstrap, WebSocket transport, client connection management, event broadcast with monotonic sequencing, turn execution loop that delegates to core, and interrupt propagation.

## Source Design

L2-DES-APP-003, L2-DES-AGENT-001, L2-DES-AGENT-002, L3-DES-ARCH-001

## 1. ServerRuntime

```rust
pub struct ServerRuntime {
    config: ServerConfig,
    store: Arc<dyn SessionStore>,          // from core
    tool_registry: Arc<dyn ToolRegistry>,   // from core (built by core::ToolRegistryBuilder)
    model_provider: Arc<dyn ModelProviderSDK>, // from provider
    sandbox: Arc<dyn Sandbox>,              // from safety
    client_registry: ClientRegistry,
    event_broadcaster: EventBroadcaster,
    session_cache: SessionCache,
}

pub struct ServerConfig {
    pub websocket_bind: SocketAddr,         // default 127.0.0.1:0 (OS-assigned)
    pub runtime_dir: PathBuf,
    pub max_clients: usize,                 // default 10
    pub event_buffer_capacity: usize,       // default 1000 per session
    pub shutdown_timeout: Duration,         // default 10s
}
```

## 2. Bootstrap Flow

```
1. Load effective config (calls core::resolve_config)
2. Build ToolRegistry (calls core::ToolRegistryBuilder::build)
3. Initialize ModelProviderSDK (from provider crate)
4. Initialize Sandbox (from safety crate)
5. Open SessionStore (calls core)
6. Bind WebSocket listener
7. Write endpoint descriptor to <runtime_dir>/server.json:
   { pid, websocket_url, auth_token, version, started_at }
8. Accept connections, spawn per-client handler task
```

## 3. Transport Trait

```rust
#[async_trait]
pub trait Transport: Send + Sync {
    async fn send_response(&self, response: SuccessResponse);
    async fn send_error(&self, error: ErrorResponse);
    async fn send_notification(&self, notification: NotificationEnvelope);
    async fn close(&self);
}

// WebSocket implementation
pub struct WebSocketTransport {
    tx: mpsc::UnboundedSender<String>,
    client_id: ClientId,
}
```

## 4. Client Connection Lifecycle

```
Connect ──► Handshake (server.initialize) ──► Registered
                                              │
                              ┌───────────────┤
                              ▼               ▼
                         Subscribed      Idle/Listing
                              │               │
                              ▼               │
                         Receiving       Disconnect ──► Removed
                         Events
                              │
                         Unsubscribe
                              │
                              ▼
                         Idle ──► Disconnect ──► Removed
```

### Handshake Rules

- `protocol_version` must be same major as server → else reject.
- `auth_token` validated against descriptor.
- `client_capabilities` stored for event filtering.
- `workspace_root` compared with server's; warn on mismatch.

## 5. Event Broadcast with Sequencing

```rust
pub struct EventBroadcaster {
    per_session: HashMap<SessionId, SessionEventState>,
}

struct SessionEventState {
    sequence: AtomicU64,
    buffer: RingBuffer<SessionEvent>,  // capacity: event_buffer_capacity
    subscribers: Vec<ClientId>,
}

pub struct SessionEvent {
    pub seq: u64,
    pub session_id: SessionId,
    pub turn_id: Option<TurnId>,
    pub item_id: Option<ItemId>,
    pub event_kind: EventKind,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}
```

**Sequence rules:**
- Monotonic per session. Incremented atomically on each event.
- Clients pass `from_sequence` on subscribe. Missed events replayed from buffer.
- If `from_sequence` older than buffer start → send `session_loaded` snapshot.
- Clients treat events as idempotent by (seq, event_kind, item_id).

**Broadcast rules:**
- `session.event` and `turn.event` → all subscribers of that session.
- `server.statusChanged`, `config.changed` → all connected clients.
- `approval.requested`, `question.requested` → all subscribers (first response wins).
- `search.updated` → requesting client only (connection-local).

## 6. Turn Execution Loop (Server Side)

```rust
async fn handle_turn_submit(
    &self,
    session_id: SessionId,
    params: TurnSubmitParams,
    client_id: ClientId,
) -> Result<TurnSubmitResult, ProtocolError> {
    // 1. Load session via core
    let mut session = self.store.load(session_id).await?;

    // 2. Admit turn — core validates and persists
    let turn = core::admit_turn(&self.store, &session, params).await?;

    // 3. Acquire session execution lock (serializes turns per session)
    let lock = self.acquire_turn_lock(session_id).await;

    // 4. Run execution loop
    let cancel_token = CancellationToken::new();
    self.register_cancel_token(turn.turn_id, cancel_token.clone());

    let outcome = self.execute_turn_loop(
        &session, &turn, cancel_token,
    ).await;

    // 5. Release lock, clean up
    drop(lock);
    self.unregister_cancel_token(turn.turn_id);

    outcome
}
```

**Server does NOT:** assemble context, compact context, normalize context, evaluate permissions, make approval decisions, execute tool logic, decide persistence format.

**Server DOES:** load/save via store, call `core::query()`, call `core::execute_tool()`, call `core::authorize_tool_request()`, broadcast events, manage connections, propagate interrupts.

## 7. Interrupt Propagation

```rust
async fn handle_interrupt(&self, session_id: SessionId, turn_id: TurnId) -> Result<InterruptResult> {
    // 1. Look up the active CancellationToken for this turn
    let token = self.cancel_tokens.get(&turn_id)
        .ok_or(ProtocolError::NoActiveTurn)?;

    // 2. Signal cancellation
    token.cancel();

    // 3. Core's query() and execute_tool() check the token
    //    at cooperative yield points and return QueryErrorCode::Cancelled

    // 4. Do NOT wait for cleanup — return immediately
    Ok(InterruptResult {
        turn_id,
        status: TurnStatus::Interrupted,
        interrupt_state: InterruptState::Requested,
    })
}
```

## 8. Async Behavior

| Operation | Timeout | Retries | Cancel |
|---|---|---|---|
| WebSocket accept | None | N/A | Shutdown signal |
| Client handshake | 30s | None | Connection close |
| Turn execution loop | None (runs to completion or interrupt) | N/A | CancellationToken |
| Event broadcast to client | 5s per client | 0 (drop slow client) | N/A |
| Shutdown | 10s grace period | N/A | Force close after timeout |

## Traceability

| L2 Source | Relationship |
|---|---|
| L2-DES-APP-003 | specified-by |
| L2-DES-AGENT-001 | specified-by |
| L2-DES-AGENT-002 | specified-by |
| L3-DES-ARCH-001 | specified-by |

## Implementation Placement Guidance

- Server remains a thin orchestration layer: transport, connection ownership, event fan-out, request routing, turn task spawning, and cancellation token wiring.
- Business decisions remain in core: context assembly, permission decisions, approval decisions, model resolution, persistence decisions, and tool dispatch policy.
- Existing server runtime modules may be split or retained as needed, but they must not continue owning decisions assigned to core by this L3 set.
- Use `tokio::sync::broadcast` for event fan-out to multiple subscribers per session.
