import { describe, expect, test } from "bun:test"
import {
	projectMenuContentClass,
	rowMenuItemClass,
	sessionMenuContentClass,
} from "./sidebar-menu-styles"

function classList(className: string): string[] {
	return className.split(/\s+/)
}

describe("sidebar menu styles", () => {
	test("uses visible hover and focus states in dark mode", () => {
		expect(classList(rowMenuItemClass)).toEqual(
			expect.arrayContaining([
				"focus:bg-accent",
				"dark:focus:bg-white/[0.08]",
				"dark:data-[highlighted]:bg-white/[0.08]",
				"dark:hover:bg-white/[0.08]",
			]),
		)
	})

	test("keeps project menus wide and narrows session action menus", () => {
		expect(classList(projectMenuContentClass)).toContain("w-[232px]")
		expect(classList(sessionMenuContentClass)).toContain("w-40")
		expect(classList(sessionMenuContentClass)).not.toContain("w-[232px]")
	})
})
