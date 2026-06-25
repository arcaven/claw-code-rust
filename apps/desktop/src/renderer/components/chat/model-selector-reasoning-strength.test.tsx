import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
	ModelSelectorReasoningStrength,
	ModelSelectorReasoningStrengthMobileView,
	ModelSelectorVariantOptions,
} from "./model-selector-reasoning-strength"

function checkSlotClassLists(html: string): string[][] {
	return Array.from(
		html.matchAll(/<span[^>]*data-slot="model-selector-variant-check-slot"[^>]*class="([^"]+)"/g),
		(match) => match[1].split(/\s+/),
	)
}

function effortSlotClassList(html: string): string[] {
	const match = html.match(
		/<span[^>]*data-slot="model-selector-effort-check-slot"[^>]*class="([^"]+)"/,
	)
	return match ? match[1].split(/\s+/) : []
}

function buttonClassListWithSlot(html: string, slot: string): string[] {
	const match = html.match(
		new RegExp(`<button[^>]*class="([^"]+)"[^>]*>[\\s\\S]*?data-slot="${slot}"`),
	)
	return match ? match[1].split(/\s+/) : []
}

function variantValueClassList(html: string, label: string): string[] {
	const match = html.match(new RegExp(`<span class="([^"]+)">${label}</span>`))
	return match ? match[1].split(/\s+/) : []
}

describe("ModelSelectorVariantOptions", () => {
	test("reserves the same leading check slot for selected and unselected variants", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorVariantOptions
				variants={["disabled", "low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				onSelectVariant={() => undefined}
			/>,
		)

		const slots = checkSlotClassLists(html)

		expect(slots).toEqual([
			["flex", "size-3.5", "shrink-0", "items-center", "justify-center"],
			["flex", "size-3.5", "shrink-0", "items-center", "justify-center"],
			["flex", "size-3.5", "shrink-0", "items-center", "justify-center"],
		])
	})

	test("renders the check icon only for the selected variant", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorVariantOptions
				variants={["disabled", "low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				onSelectVariant={() => undefined}
			/>,
		)

		expect(html.match(/data-slot="model-selector-variant-check-icon"/g)).toHaveLength(1)
		expect(html).toContain("Off")
		expect(html).toContain("Max")
	})

	test("uses a high-contrast hover and focus state for variant options", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorVariantOptions
				variants={["disabled", "low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				onSelectVariant={() => undefined}
			/>,
		)

		expect(buttonClassListWithSlot(html, "model-selector-variant-check-slot")).toEqual(
			expect.arrayContaining([
				"hover:bg-accent",
				"hover:text-accent-foreground",
				"focus-visible:bg-accent",
				"focus-visible:text-accent-foreground",
				"focus-visible:outline-none",
				"dark:hover:bg-white/[0.08]",
				"dark:hover:text-foreground",
				"dark:focus-visible:bg-white/[0.08]",
				"dark:focus-visible:text-foreground",
			]),
		)
		expect(buttonClassListWithSlot(html, "model-selector-variant-check-slot")).not.toContain(
			"hover:bg-muted",
		)
	})

	test("labels the desktop footer row as Effort", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorReasoningStrength
				variants={["low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				isMobile={false}
				onOpenMobileView={() => undefined}
				onSelectVariant={() => undefined}
				onClose={() => undefined}
			/>,
		)

		expect(html).toContain("Effort")
		expect(html).not.toContain("Reasoning strength")
	})

	test("reserves the same leading check slot for the desktop Effort row", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorReasoningStrength
				variants={["low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				isMobile={false}
				onOpenMobileView={() => undefined}
				onSelectVariant={() => undefined}
				onClose={() => undefined}
			/>,
		)

		expect(effortSlotClassList(html)).toEqual([
			"flex",
			"size-3.5",
			"shrink-0",
			"items-center",
			"justify-center",
		])
	})

	test("uses a high-contrast hover and focus state for the desktop Effort row", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorReasoningStrength
				variants={["low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				isMobile={false}
				onOpenMobileView={() => undefined}
				onSelectVariant={() => undefined}
				onClose={() => undefined}
			/>,
		)

		expect(buttonClassListWithSlot(html, "model-selector-effort-check-slot")).toEqual(
			expect.arrayContaining([
				"group",
				"hover:bg-accent",
				"hover:text-accent-foreground",
				"focus-visible:bg-accent",
				"focus-visible:text-accent-foreground",
				"focus-visible:outline-none",
				"dark:hover:bg-white/[0.08]",
				"dark:hover:text-foreground",
				"dark:focus-visible:bg-white/[0.08]",
				"dark:focus-visible:text-foreground",
			]),
		)
		expect(buttonClassListWithSlot(html, "model-selector-effort-check-slot")).not.toContain(
			"hover:bg-muted",
		)
		expect(variantValueClassList(html, "Max")).toEqual(
			expect.arrayContaining([
				"group-hover:text-accent-foreground/80",
				"group-focus-visible:text-accent-foreground/80",
				"dark:group-hover:text-foreground",
				"dark:group-focus-visible:text-foreground",
			]),
		)
	})

	test("labels the mobile variant view as Effort", () => {
		const html = renderToStaticMarkup(
			<ModelSelectorReasoningStrengthMobileView
				variants={["low", "max"]}
				selectedVariant="max"
				allowDefaultVariant={false}
				onBack={() => undefined}
				onSelectVariant={() => undefined}
				onClose={() => undefined}
			/>,
		)

		expect(html).toContain("Effort")
		expect(html).not.toContain("Reasoning strength")
	})
})
