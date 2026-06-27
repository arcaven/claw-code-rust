import { sep } from "node:path"
import { describe, expect, test } from "bun:test"
import {
	extractClaudeCodeProviderSettings,
	formatClaudeCodeProviderSettingsPreview,
} from "../../src/converter/claude-provider-settings"
import { ccSettingsPaths } from "../../src/utils/paths"

const exampleSettings = {
	env: {
		ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic",
		ANTHROPIC_AUTH_TOKEN: "sk-xxxxxxxx",
		ANTHROPIC_MODEL: "deepseek-v4-pro[1m]",
		ANTHROPIC_DEFAULT_HAIKU_MODEL: "deepseek-v4-flash",
		ANTHROPIC_DEFAULT_SONNET_MODEL: "deepseek-v4-flash",
		ANTHROPIC_DEFAULT_OPUS_MODEL: "deepseek-v4-pro[1m]",
		ENABLE_TOOL_SEARCH: "true",
	},
}

describe("Claude Code provider settings", () => {
	test("extracts Anthropic-compatible provider settings from Claude Code env", () => {
		const settings = extractClaudeCodeProviderSettings(exampleSettings)

		expect(settings.providerId).toBe("claude-code")
		expect(settings.baseUrl).toBe("https://api.deepseek.com/anthropic")
		expect(settings.apiKey).toBe("sk-xxxxxxxx")
		expect(settings.apiKeySource).toBe("ANTHROPIC_AUTH_TOKEN")
		expect(settings.defaultModel).toBe("deepseek-v4-pro[1m]")
		expect(settings.models).toEqual(["deepseek-v4-pro[1m]", "deepseek-v4-flash"])
		expect(settings.wireApi).toBe("anthropic_messages")
	})

	test("uses ANTHROPIC_API_KEY when AUTH_TOKEN is absent", () => {
		const settings = extractClaudeCodeProviderSettings({
			env: {
				ANTHROPIC_API_KEY: "sk-ant-fallback",
				ANTHROPIC_MODEL: "claude-sonnet-4-5",
			},
		})

		expect(settings.apiKey).toBe("sk-ant-fallback")
		expect(settings.apiKeySource).toBe("ANTHROPIC_API_KEY")
	})

	test("redacts API key in sanitized preview output", () => {
		const preview = formatClaudeCodeProviderSettingsPreview(
			extractClaudeCodeProviderSettings(exampleSettings),
		)

		expect(preview).toContain("Provider ID: claude-code")
		expect(preview).toContain("API key: detected")
		expect(preview).toContain("deepseek-v4-pro[1m]")
		expect(preview).not.toContain("sk-xxxxxxxx")
	})

	test("prefers lowercase Claude Code settings path before legacy uppercase path", () => {
		const paths = ccSettingsPaths()

		expect(paths[0]).toContain(`${sep}.claude${sep}settings.json`)
		expect(paths[1]).toContain(`${sep}.Claude${sep}settings.json`)
	})
})
