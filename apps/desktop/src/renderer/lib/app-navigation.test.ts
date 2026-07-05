import { describe, expect, test } from "bun:test"
import {
	isOverlayRoute,
	isSettingsRoute,
	resolveSettingsBackTarget,
	shouldClearBackgroundSession,
	shouldTrackAppRoute,
} from "./app-navigation"

describe("app navigation", () => {
	test("shouldTrackAppRoute ignores overlay routes", () => {
		expect(shouldTrackAppRoute("/")).toBe(true)
		expect(shouldTrackAppRoute("/project/foo/session/bar")).toBe(true)
		expect(shouldTrackAppRoute("/settings")).toBe(false)
		expect(shouldTrackAppRoute("/settings/general")).toBe(false)
		expect(shouldTrackAppRoute("/automations")).toBe(false)
		expect(shouldTrackAppRoute("/automations/foo/runs/bar")).toBe(false)
	})

	test("isSettingsRoute matches settings paths only", () => {
		expect(isSettingsRoute("/settings")).toBe(true)
		expect(isSettingsRoute("/settings/servers")).toBe(true)
		expect(isSettingsRoute("/automations")).toBe(false)
		expect(isSettingsRoute("/project/foo/session/bar")).toBe(false)
	})

	test("isOverlayRoute matches settings and automations", () => {
		expect(isOverlayRoute("/settings/general")).toBe(true)
		expect(isOverlayRoute("/automations/foo")).toBe(true)
		expect(isOverlayRoute("/project/foo/session/bar")).toBe(false)
	})

	test("resolveSettingsBackTarget restores last route or home", () => {
		expect(resolveSettingsBackTarget("/project/foo/session/bar")).toEqual({
			to: "/project/foo/session/bar",
		})
		expect(resolveSettingsBackTarget(null)).toEqual({ to: "/" })
	})

	test("shouldClearBackgroundSession clears on non-session app routes", () => {
		expect(shouldClearBackgroundSession("/", undefined)).toBe(true)
		expect(shouldClearBackgroundSession("/project/foo", undefined)).toBe(true)
		expect(shouldClearBackgroundSession("/project/foo/", undefined)).toBe(true)
		expect(shouldClearBackgroundSession("/settings/general", undefined)).toBe(false)
		expect(shouldClearBackgroundSession("/project/foo/session/bar", "bar")).toBe(false)
	})
})
