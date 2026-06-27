import { describe, expect, test } from "bun:test"
import {
	extractOpenCodeProviderSettings,
	formatOpenCodeProviderSettingsPreview,
} from "../../src/converter/opencode-provider-settings"
import type { OpenCodeScanResult } from "../../src/types/opencode"

const exampleScan: OpenCodeScanResult = {
	global: {
		configPath: "~/.config/opencode/opencode.json",
		authPath: "~/.local/share/opencode/auth.json",
		config: {
			$schema: "https://opencode.ai/config.json",
			provider: {
				deepseek: {
					npm: "@ai-sdk/openai-compatible",
					options: {
						baseURL: "https://api.deepseek.com/v1",
						apiKey: "sk-xxxx",
						setCacheKey: true,
					},
					models: {
						"deepseek-v4-flash": {
							name: "DeepSeek V4 Flash",
						},
						"deepseek-v4-pro": {
							name: "DeepSeek V4 Pro",
						},
					},
				},
				mimo: {
					npm: "@ai-sdk/openai-compatible",
					name: "Xiaomi MiMo",
					options: {
						baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
						apiKey: "tp-xxxxxx",
						setCacheKey: true,
					},
					models: {
						"mimo-v2.5": {
							name: "Mimo v2.5",
						},
						"mimo-v2.5-pro": {
							name: "Mimo v2.5 Pro",
						},
					},
				},
			},
		},
		auth: {},
		parseErrors: [],
	},
}

describe("OpenCode provider settings", () => {
	test("extracts OpenAI-compatible providers, API keys, base URLs, and display names", () => {
		const settings = extractOpenCodeProviderSettings(exampleScan, { env: {} })

		expect(settings).toEqual({
			configPath: "~/.config/opencode/opencode.json",
			authPath: "~/.local/share/opencode/auth.json",
			defaultModel: undefined,
			smallModel: undefined,
			parseErrors: [],
			unsupportedProviders: [],
			providers: [
				{
					providerId: "deepseek",
					displayName: "deepseek",
					baseUrl: "https://api.deepseek.com/v1",
					apiKey: "sk-xxxx",
					wireApi: "openai_chat_completions",
					models: [
						{
							modelId: "deepseek-v4-flash",
							displayName: "DeepSeek V4 Flash",
							isDefault: false,
							isSmall: false,
						},
						{
							modelId: "deepseek-v4-pro",
							displayName: "DeepSeek V4 Pro",
							isDefault: false,
							isSmall: false,
						},
					],
				},
				{
					providerId: "mimo",
					displayName: "Xiaomi MiMo",
					baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
					apiKey: "tp-xxxxxx",
					wireApi: "openai_chat_completions",
					models: [
						{
							modelId: "mimo-v2.5",
							displayName: "Mimo v2.5",
							isDefault: false,
							isSmall: false,
						},
						{
							modelId: "mimo-v2.5-pro",
							displayName: "Mimo v2.5 Pro",
							isDefault: false,
							isSmall: false,
						},
					],
				},
			],
		})
	})

	test("marks explicit top-level model as default and does not guess a default", () => {
		const noDefault = extractOpenCodeProviderSettings(exampleScan, { env: {} })
		const withDefault = extractOpenCodeProviderSettings(
			{
				global: {
					...exampleScan.global,
					config: {
						...exampleScan.global.config,
						model: "deepseek/deepseek-v4-pro",
						small_model: "mimo/mimo-v2.5-pro",
					},
				},
			},
			{ env: {} },
		)

		expect(noDefault.defaultModel).toBeUndefined()
		expect(
			withDefault.providers.flatMap((provider) =>
				provider.models.map((model) => ({
					provider: provider.providerId,
					model: model.modelId,
					default: model.isDefault,
					small: model.isSmall,
				})),
			),
		).toEqual([
			{ provider: "deepseek", model: "deepseek-v4-flash", default: false, small: false },
			{ provider: "deepseek", model: "deepseek-v4-pro", default: true, small: false },
			{ provider: "mimo", model: "mimo-v2.5", default: false, small: false },
			{ provider: "mimo", model: "mimo-v2.5-pro", default: false, small: true },
		])
	})

	test("redacts API keys in preview output", () => {
		const preview = formatOpenCodeProviderSettingsPreview(
			extractOpenCodeProviderSettings(exampleScan, { env: {} }),
		)

		expect(preview).toContain("Provider ID: deepseek")
		expect(preview).toContain("Provider ID: mimo")
		expect(preview).toContain("API key: detected")
		expect(preview).toContain("DeepSeek V4 Pro")
		expect(preview).not.toContain("sk-xxxx")
		expect(preview).not.toContain("tp-xxxxxx")
	})

	test("resolves apiKey env references through injected env and falls back to auth.json", () => {
		const settings = extractOpenCodeProviderSettings(
			{
				global: {
					config: {
						provider: {
							deepseek: {
								npm: "@ai-sdk/openai-compatible",
								options: {
									baseURL: "https://api.deepseek.com/v1",
									apiKey: { env: "DEEPSEEK_API_KEY" },
								},
								models: { "deepseek-chat": {} },
							},
							mimo: {
								npm: "@ai-sdk/openai-compatible",
								options: {
									baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
								},
								models: { "mimo-v2.5": {} },
							},
							zai: {
								npm: "@ai-sdk/openai-compatible",
								options: {
									baseURL: "https://api.z.ai/v1",
								},
								models: { "glm-4.5": {} },
							},
						},
					},
					auth: {
						mimo: { key: "tp-from-auth" },
						zai: "sk-direct-auth",
					},
					parseErrors: [],
				},
			},
			{ env: { DEEPSEEK_API_KEY: "sk-from-env" } },
		)

		expect(
			settings.providers.map((provider) => ({
				providerId: provider.providerId,
				apiKey: provider.apiKey,
			})),
		).toEqual([
			{ providerId: "deepseek", apiKey: "sk-from-env" },
			{ providerId: "mimo", apiKey: "tp-from-auth" },
			{ providerId: "zai", apiKey: "sk-direct-auth" },
		])
	})

	test("keeps unsupported providers and missing provider data as diagnostics instead of throwing", () => {
		const settings = extractOpenCodeProviderSettings(
			{
				global: {
					config: {
						provider: {
							anthropic: {
								npm: "@ai-sdk/anthropic",
								models: { "claude-sonnet-4-5": { name: "Claude Sonnet" } },
							},
							empty: {
								npm: "@ai-sdk/openai-compatible",
								options: {},
								models: {},
							},
						},
					},
					parseErrors: ["opencode.json: JSONC parse error at offset 10"],
				},
			},
			{ env: {} },
		)

		expect(settings.providers).toEqual([
			{
				providerId: "empty",
				displayName: "empty",
				baseUrl: undefined,
				apiKey: undefined,
				wireApi: "openai_chat_completions",
				models: [],
			},
		])
		expect(settings.unsupportedProviders).toEqual([
			{ providerId: "anthropic", npm: "@ai-sdk/anthropic" },
		])
		expect(settings.parseErrors).toEqual(["opencode.json: JSONC parse error at offset 10"])
	})
})
