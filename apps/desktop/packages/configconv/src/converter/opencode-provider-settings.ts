import type {
	OpenCodeApiKeyConfig,
	OpenCodeAuth,
	OpenCodeProviderConfig,
	OpenCodeScanResult,
} from "../types/opencode"

export const OPENCODE_WIRE_API = "openai_chat_completions"
export const OPENCODE_OPENAI_COMPATIBLE_NPM = "@ai-sdk/openai-compatible"

export interface OpenCodeProviderSettings {
	configPath?: string
	authPath?: string
	defaultModel?: OpenCodeModelRef
	smallModel?: OpenCodeModelRef
	providers: OpenCodeImportedProvider[]
	unsupportedProviders: OpenCodeUnsupportedProvider[]
	parseErrors: string[]
}

export interface OpenCodeModelRef {
	providerId: string
	modelId: string
}

export interface OpenCodeImportedProvider {
	providerId: string
	displayName: string
	baseUrl?: string
	apiKey?: string
	wireApi: typeof OPENCODE_WIRE_API
	models: OpenCodeImportedModel[]
}

export interface OpenCodeImportedModel {
	modelId: string
	displayName: string
	isDefault: boolean
	isSmall: boolean
}

export interface OpenCodeUnsupportedProvider {
	providerId: string
	npm?: string
}

export interface OpenCodeProviderExtractionOptions {
	env?: Record<string, string | undefined>
}

export function extractOpenCodeProviderSettings(
	scanResult?: OpenCodeScanResult,
	options: OpenCodeProviderExtractionOptions = {},
): OpenCodeProviderSettings {
	const env = options.env ?? process.env
	const global = scanResult?.global
	const config = global?.config
	const providerEntries = Object.entries(config?.provider ?? {})
	const defaultModel = parseModelRef(config?.model)
	const smallModel = parseModelRef(config?.small_model)
	const providers: OpenCodeImportedProvider[] = []
	const unsupportedProviders: OpenCodeUnsupportedProvider[] = []

	for (const [providerId, providerConfig] of providerEntries) {
		if (!isOpenAiCompatible(providerConfig)) {
			unsupportedProviders.push({ providerId, npm: providerConfig.npm })
			continue
		}

		providers.push(
			extractProvider(providerId, providerConfig, {
				auth: global?.auth,
				defaultModel,
				env,
				smallModel,
			}),
		)
	}

	return {
		configPath: global?.configPath,
		authPath: global?.authPath,
		defaultModel,
		smallModel,
		providers,
		unsupportedProviders,
		parseErrors: global?.parseErrors ?? [],
	}
}

export function formatOpenCodeProviderSettingsPreview(settings: OpenCodeProviderSettings): string {
	const lines: string[] = []

	if (settings.providers.length === 0) {
		lines.push("No OpenCode OpenAI-compatible providers found.")
	}

	for (const provider of settings.providers) {
		if (lines.length > 0) lines.push("")
		lines.push(`Provider ID: ${provider.providerId}`)
		lines.push(`Display name: ${provider.displayName}`)
		lines.push(`Base URL: ${provider.baseUrl ?? "(not set)"}`)
		lines.push(`Wire API: ${provider.wireApi}`)
		lines.push(`Default model: ${defaultModelLabel(provider)}`)
		lines.push(`API key: ${provider.apiKey ? "detected" : "missing"}`)
		lines.push("Models:")

		if (provider.models.length === 0) {
			lines.push("- (none found)")
		} else {
			for (const model of provider.models) {
				const flags = []
				if (model.isDefault) flags.push("default")
				if (model.isSmall) flags.push("small")
				const suffix = flags.length > 0 ? ` [${flags.join(", ")}]` : ""
				lines.push(`- ${model.modelId} (${model.displayName})${suffix}`)
			}
		}
	}

	return lines.join("\n")
}

function extractProvider(
	providerId: string,
	providerConfig: OpenCodeProviderConfig,
	context: {
		auth?: OpenCodeAuth
		defaultModel?: OpenCodeModelRef
		env: Record<string, string | undefined>
		smallModel?: OpenCodeModelRef
	},
): OpenCodeImportedProvider {
	const provider: OpenCodeImportedProvider = {
		providerId,
		displayName: nonEmptyString(providerConfig.name) ?? providerId,
		baseUrl: nonEmptyString(providerConfig.options?.baseURL),
		apiKey:
			resolveConfigApiKey(providerConfig.options?.apiKey, context.env) ??
			resolveAuthApiKey(context.auth, providerId),
		wireApi: OPENCODE_WIRE_API,
		models: [],
	}

	for (const [modelId, modelConfig] of Object.entries(providerConfig.models ?? {})) {
		upsertModel(provider, modelId, {
			displayName: nonEmptyString(modelConfig.name) ?? modelId,
			defaultModel: context.defaultModel,
			smallModel: context.smallModel,
		})
	}

	for (const ref of [context.defaultModel, context.smallModel]) {
		if (ref?.providerId === providerId) {
			upsertModel(provider, ref.modelId, {
				displayName: ref.modelId,
				defaultModel: context.defaultModel,
				smallModel: context.smallModel,
			})
		}
	}

	return provider
}

function upsertModel(
	provider: OpenCodeImportedProvider,
	modelId: string,
	context: {
		displayName: string
		defaultModel?: OpenCodeModelRef
		smallModel?: OpenCodeModelRef
	},
): void {
	const existing = provider.models.find((model) => model.modelId === modelId)
	const isDefault = isSameModelRef(context.defaultModel, provider.providerId, modelId)
	const isSmall = isSameModelRef(context.smallModel, provider.providerId, modelId)

	if (existing) {
		existing.isDefault ||= isDefault
		existing.isSmall ||= isSmall
		return
	}

	provider.models.push({
		modelId,
		displayName: context.displayName,
		isDefault,
		isSmall,
	})
}

function defaultModelLabel(provider: OpenCodeImportedProvider): string {
	const defaultModel = provider.models.find((model) => model.isDefault)
	return defaultModel?.modelId ?? "(not set)"
}

function isOpenAiCompatible(providerConfig: OpenCodeProviderConfig): boolean {
	return providerConfig.npm === OPENCODE_OPENAI_COMPATIBLE_NPM
}

function resolveConfigApiKey(
	apiKey: OpenCodeApiKeyConfig | undefined,
	env: Record<string, string | undefined>,
): string | undefined {
	if (typeof apiKey === "string") return nonEmptyString(apiKey)
	if (isRecord(apiKey)) {
		const envName = nonEmptyString(apiKey.env)
		return envName ? nonEmptyString(env[envName]) : undefined
	}
	return undefined
}

function resolveAuthApiKey(auth: OpenCodeAuth | undefined, providerId: string): string | undefined {
	const value = auth?.[providerId]
	if (typeof value === "string") return nonEmptyString(value)
	if (!isRecord(value)) return undefined
	return nonEmptyString(value.key) ?? nonEmptyString(value.apiKey)
}

function parseModelRef(value: string | undefined): OpenCodeModelRef | undefined {
	const trimmed = nonEmptyString(value)
	if (!trimmed) return undefined
	const separator = trimmed.indexOf("/")
	if (separator <= 0 || separator === trimmed.length - 1) return undefined
	return {
		providerId: trimmed.slice(0, separator),
		modelId: trimmed.slice(separator + 1),
	}
}

function isSameModelRef(
	ref: OpenCodeModelRef | undefined,
	providerId: string,
	modelId: string,
): boolean {
	return ref?.providerId === providerId && ref.modelId === modelId
}

function nonEmptyString(value: unknown): string | undefined {
	const trimmed = typeof value === "string" ? value.trim() : undefined
	return trimmed ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}
