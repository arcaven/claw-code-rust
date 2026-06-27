import type { ClaudeSettings } from "../types/claude-code"

export const CLAUDE_CODE_PROVIDER_ID = "claude-code"
export const CLAUDE_CODE_WIRE_API = "anthropic_messages"

const MODEL_ENV_KEYS = [
	"ANTHROPIC_MODEL",
	"ANTHROPIC_DEFAULT_OPUS_MODEL",
	"ANTHROPIC_DEFAULT_SONNET_MODEL",
	"ANTHROPIC_DEFAULT_HAIKU_MODEL",
] as const

export interface ClaudeCodeProviderSettings {
	providerId: typeof CLAUDE_CODE_PROVIDER_ID
	baseUrl?: string
	apiKey?: string
	apiKeySource?: "ANTHROPIC_AUTH_TOKEN" | "ANTHROPIC_API_KEY"
	models: string[]
	defaultModel?: string
	wireApi: typeof CLAUDE_CODE_WIRE_API
}

export function extractClaudeCodeProviderSettings(
	settings?: ClaudeSettings,
): ClaudeCodeProviderSettings {
	const env = settings?.env ?? {}
	const authToken = nonEmptyString(env.ANTHROPIC_AUTH_TOKEN)
	const apiKey = authToken ?? nonEmptyString(env.ANTHROPIC_API_KEY)
	const models: string[] = []
	const seenModels = new Set<string>()

	for (const key of MODEL_ENV_KEYS) {
		const model = nonEmptyString(env[key])
		if (!model || seenModels.has(model)) continue
		seenModels.add(model)
		models.push(model)
	}

	return {
		providerId: CLAUDE_CODE_PROVIDER_ID,
		baseUrl: nonEmptyString(env.ANTHROPIC_BASE_URL),
		apiKey,
		apiKeySource: apiKey
			? authToken
				? "ANTHROPIC_AUTH_TOKEN"
				: "ANTHROPIC_API_KEY"
			: undefined,
		models,
		defaultModel: nonEmptyString(env.ANTHROPIC_MODEL),
		wireApi: CLAUDE_CODE_WIRE_API,
	}
}

export function formatClaudeCodeProviderSettingsPreview(
	settings: ClaudeCodeProviderSettings,
): string {
	const lines = [
		`Provider ID: ${settings.providerId}`,
		`Base URL: ${settings.baseUrl ?? "(default Anthropic endpoint)"}`,
		`Wire API: ${settings.wireApi}`,
		`Default model: ${settings.defaultModel ?? "(not set)"}`,
		`API key: ${settings.apiKey ? "detected" : "missing"}`,
		"Models:",
	]

	if (settings.models.length === 0) {
		lines.push("- (none found)")
	} else {
		for (const model of settings.models) {
			lines.push(`- ${model}`)
		}
	}

	return lines.join("\n")
}

function nonEmptyString(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}
