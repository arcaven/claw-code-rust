/**
 * Scanner for global OpenCode provider configuration.
 */

import type { OpenCodeAuth, OpenCodeConfig, OpenCodeScanResult } from "../types/opencode"
import { safeReadFile } from "../utils/fs"
import { parseJsonc } from "../utils/json"
import * as paths from "../utils/paths"

/**
 * Scan global OpenCode configuration.
 */
export async function scanOpenCode(): Promise<OpenCodeScanResult> {
	const result: OpenCodeScanResult = {
		global: {
			parseErrors: [],
		},
	}

	await readFirstConfig(result)
	await readAuth(result)

	return result
}

async function readFirstConfig(result: OpenCodeScanResult): Promise<void> {
	for (const configPath of [paths.opencodeConfigPath(), paths.opencodeJsoncConfigPath()]) {
		const content = await safeReadFile(configPath)
		if (content === undefined) continue

		try {
			result.global.config = parseJsonc<OpenCodeConfig>(content)
			result.global.configPath = configPath
		} catch (error) {
			result.global.parseErrors.push(formatParseError(configPath, error))
		}
		return
	}
}

async function readAuth(result: OpenCodeScanResult): Promise<void> {
	const authPath = paths.opencodeAuthPath()
	const content = await safeReadFile(authPath)
	if (content === undefined) return

	try {
		result.global.auth = parseJsonc<OpenCodeAuth>(content)
		result.global.authPath = authPath
	} catch (error) {
		result.global.parseErrors.push(formatParseError(authPath, error))
	}
}

function formatParseError(filePath: string, error: unknown): string {
	const message = error instanceof Error ? error.message : String(error)
	return `${filePath}: ${message}`
}
