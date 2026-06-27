import { readFileSync } from "node:fs"
import { describe, expect, test } from "bun:test"

const source = readFileSync(new URL("./session-metrics-bar.tsx", import.meta.url), "utf8")
const agentDetailSource = readFileSync(new URL("./agent-detail.tsx", import.meta.url), "utf8")

describe("SessionMetricsBar top timer wiring", () => {
	test("uses current chat turns for the inline timer instead of cumulative session work time", () => {
		expect({
			acceptsTurnsProp: source.includes("turns: ChatTurn[]"),
			acceptsIsWorkingProp: source.includes("isWorking: boolean"),
			usesLatestTurnTimer: source.includes("computeLatestTurnTimerSplit(turns"),
			omitsCompletedSessionWorkTime: !source.includes("completedMs={metrics.completedWorkTimeMs}"),
			exportsOverviewButton: source.includes("export function SessionMetricsOverviewButton"),
			headerUsesOverviewButton: agentDetailSource.includes("<SessionMetricsOverviewButton"),
		}).toEqual({
			acceptsTurnsProp: true,
			acceptsIsWorkingProp: true,
			usesLatestTurnTimer: true,
			omitsCompletedSessionWorkTime: true,
			exportsOverviewButton: true,
			headerUsesOverviewButton: true,
		})
	})

	test("session header keeps Open in and ends with the three transcript controls", () => {
		const openInIndex = agentDetailSource.indexOf("<OpenInButton")
		const overviewIndex = agentDetailSource.indexOf("<SessionMetricsOverviewButton")
		const terminalIndex = agentDetailSource.indexOf("<TerminalToggleButton")
		const changesIndex = agentDetailSource.indexOf("<ChangesPanelToggleButton")

		expect({
			keepsOpenInButton: openInIndex !== -1,
			removesCloseSessionIcon: !agentDetailSource.includes("XIcon"),
			exposesChangesPanelButton:
				agentDetailSource.includes("function ChangesPanelToggleButton") &&
				agentDetailSource.includes("onToggleReviewPanel"),
			exposesTerminalButton: agentDetailSource.includes("function TerminalToggleButton"),
			rightControlOrder:
				openInIndex !== -1 &&
				overviewIndex !== -1 &&
				terminalIndex !== -1 &&
				changesIndex !== -1 &&
				openInIndex < overviewIndex &&
				overviewIndex < terminalIndex &&
				terminalIndex < changesIndex,
		}).toEqual({
			keepsOpenInButton: true,
			removesCloseSessionIcon: true,
			exposesChangesPanelButton: true,
			exposesTerminalButton: true,
			rightControlOrder: true,
		})
	})

	test("session header panel toggles use panel icons", () => {
		expect({
			usesBottomPanelIcon: agentDetailSource.includes("BottomPanelIcon"),
			usesRightPanelIcon: agentDetailSource.includes("RightPanelIcon"),
			replacesLucideTerminalIcon: !agentDetailSource.includes("TerminalIcon"),
			replacesLucidePanelRightIcon: !agentDetailSource.includes("PanelRightIcon"),
		}).toEqual({
			usesBottomPanelIcon: true,
			usesRightPanelIcon: true,
			replacesLucideTerminalIcon: true,
			replacesLucidePanelRightIcon: true,
		})
	})
})
