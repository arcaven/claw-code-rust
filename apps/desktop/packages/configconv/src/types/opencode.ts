/**
 * Type definitions for OpenCode configuration files.
 */

export interface OpenCodeScanResult {
	global: OpenCodeGlobalScanResult
}

export interface OpenCodeGlobalScanResult {
	/** Parsed ~/.config/opencode/opencode.json or opencode.jsonc. */
	config?: OpenCodeConfig
	configPath?: string
	/** Parsed ~/.local/share/opencode/auth.json. */
	auth?: OpenCodeAuth
	authPath?: string
	/** Non-fatal parse errors found while scanning. */
	parseErrors: string[]
}

export interface OpenCodeConfig {
	$schema?: string
	model?: string
	small_model?: string
	provider?: Record<string, OpenCodeProviderConfig>
}

export interface OpenCodeProviderConfig {
	npm?: string
	name?: string
	options?: OpenCodeProviderOptions
	models?: Record<string, OpenCodeModelConfig>
}

export interface OpenCodeProviderOptions {
	baseURL?: string
	apiKey?: OpenCodeApiKeyConfig
	[key: string]: unknown
}

export type OpenCodeApiKeyConfig = string | { env?: string }

export interface OpenCodeModelConfig {
	name?: string
	[key: string]: unknown
}

export type OpenCodeAuth = Record<string, unknown>
