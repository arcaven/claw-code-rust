import { describe, expect, test } from "bun:test"
import type { ChatTurn } from "../atoms/derived/session-chat"
import { computeTurnWorkTime, computeTurnWorkTimeSplit } from "./session-metrics"

function turnWith(assistantMessages: ChatTurn["assistantMessages"]): ChatTurn {
	return {
		id: "u1",
		userMessage: {
			info: { id: "u1", role: "user", time: { created: 1_000 } },
			parts: [],
		},
		assistantMessages,
	} as ChatTurn
}

describe("turn duration metrics", () => {
	test("computes completed turn duration from user message to assistant completion", () => {
		const turn = turnWith([
			{
				info: { id: "a1", role: "assistant", time: { created: 2_000, completed: 61_000 } },
				parts: [],
			},
		] as ChatTurn["assistantMessages"])

		expect(computeTurnWorkTime(turn)).toBe(60_000)
	})

	test("falls back to latest part timestamp when assistant completion is missing", () => {
		const turn = turnWith([
			{
				info: { id: "a1", role: "assistant", time: { created: 2_000 } },
				parts: [
					{
						id: "tool-1",
						type: "tool",
						state: { status: "completed", time: { start: 3_000, end: 9_000 } },
					},
				],
			},
		] as ChatTurn["assistantMessages"])

		expect(computeTurnWorkTime(turn, { now: () => 99_000 })).toBe(8_000)
	})

	test("uses Date.now only for active turns", () => {
		const turn = turnWith([
			{
				info: { id: "a1", role: "assistant", time: { created: 2_000 } },
				parts: [],
			},
		] as ChatTurn["assistantMessages"])

		expect({
			completed: computeTurnWorkTime(turn, { now: () => 99_000 }),
			active: computeTurnWorkTime(turn, { active: true, now: () => 11_000 }),
			split: computeTurnWorkTimeSplit(turn),
		}).toEqual({
			completed: 1_000,
			active: 10_000,
			split: { completedMs: 0, activeStartMs: 1_000 },
		})
	})

	test("drops implausible completed duration from incompatible historical timestamps", () => {
		const turn = turnWith([
			{
				info: { id: "a1", role: "assistant", time: { created: 2_000 } },
				parts: [
					{
						id: "tool-1",
						type: "tool",
						state: { status: "completed", time: { start: 3_000, end: 200_000_000 } },
					},
				],
			},
		] as ChatTurn["assistantMessages"])

		expect(computeTurnWorkTime(turn)).toBe(0)
	})
})
