import { atom } from "jotai"
import { atomFamily } from "jotai-family"

export type SessionCompactionStatus = "started" | "completed"

export const compactionStatusFamily = atomFamily((_sessionId: string) =>
	atom<SessionCompactionStatus | null>(null),
)
