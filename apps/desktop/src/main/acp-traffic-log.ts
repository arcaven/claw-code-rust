import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import path from "node:path"

export const PROTOCOL_TRACE_ENV = "DEVO_PROTOCOL_TRACE"
export const PROTOCOL_TRACE_FILE_ENV = "DEVO_PROTOCOL_TRACE_FILE"
export const DEVO_HOME_ENV = "DEVO_HOME"

export type AcpTrafficDirection = "desktop-to-server" | "server-to-desktop" | "system"
export type AcpTrafficKind = "request" | "response" | "notification" | "invalid" | "closed"
export type AcpTrafficJsonRpcId = number | string

export interface AcpTrafficLogState {
	enabled: boolean
	path: string | null
}

export interface AcpTrafficLogRecord {
	direction: AcpTrafficDirection
	kind: AcpTrafficKind
	id?: AcpTrafficJsonRpcId
	method?: string
	payload?: unknown
}

export interface AcpTrafficLogger {
	getState(): AcpTrafficLogState
	record(entry: AcpTrafficLogRecord): void
}

interface CreateAcpTrafficLoggerOptions {
	env?: Record<string, string | undefined>
	clock?: () => Date
	pid?: number
}

export function isProtocolTraceEnabled(value: string | undefined): boolean {
	if (!value?.trim()) return false
	const normalized = value.trim()
	return normalized === "1" || normalized.toLowerCase() === "true"
}

export function findDevoHome(env: Record<string, string | undefined> = process.env): string {
	const explicit = env[DEVO_HOME_ENV]?.trim()
	if (explicit) {
		const resolved = path.resolve(explicit)
		const stat = statSync(resolved, { throwIfNoEntry: false })
		if (!stat?.isDirectory()) {
			throw new Error(`DEVO_HOME points to ${explicit}, but that path is not a directory`)
		}
		return resolved
	}
	return path.join(homedir(), ".devo")
}

export function formatProtocolTraceTimestamp(date: Date): string {
	return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

export function resolveProtocolTracePath({
	env = process.env,
	clock = () => new Date(),
	pid = process.pid,
}: {
	env?: Record<string, string | undefined>
	clock?: () => Date
	pid?: number
} = {}): string | null {
	if (!isProtocolTraceEnabled(env[PROTOCOL_TRACE_ENV])) return null

	const explicit = env[PROTOCOL_TRACE_FILE_ENV]?.trim()
	if (explicit) {
		const resolved = path.resolve(explicit)
		mkdirSync(path.dirname(resolved), { recursive: true })
		return resolved
	}

	const fileName = `protocol-${pid}-${formatProtocolTraceTimestamp(clock())}.ndjsonl`

	try {
		const base = path.join(findDevoHome(env), "traces")
		mkdirSync(base, { recursive: true })
		return path.join(base, fileName)
	} catch {
		const base = path.join(tmpdir(), "devo-traces")
		mkdirSync(base, { recursive: true })
		return path.join(base, fileName)
	}
}

export function createAcpTrafficLoggerFromEnv({
	env = process.env,
	clock = () => new Date(),
	pid = process.pid,
}: CreateAcpTrafficLoggerOptions = {}): AcpTrafficLogger {
	const logPath = resolveProtocolTracePath({ env, clock, pid })
	return new AcpTrafficFileLogger({ enabled: logPath !== null, path: logPath }, clock)
}

class AcpTrafficFileLogger implements AcpTrafficLogger {
	constructor(
		private readonly state: AcpTrafficLogState,
		private readonly clock: () => Date,
	) {
		if (this.state.enabled && this.state.path) {
			mkdirSync(path.dirname(this.state.path), { recursive: true })
			writeFileSync(this.state.path, "", "utf-8")
		}
	}

	getState(): AcpTrafficLogState {
		return { ...this.state }
	}

	record(entry: AcpTrafficLogRecord): void {
		if (!this.state.enabled || !this.state.path) return

		appendFileSync(
			this.state.path,
			`${JSON.stringify({ timestamp: this.clock().toISOString(), ...entry })}\n`,
			"utf-8",
		)
	}
}
