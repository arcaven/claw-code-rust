import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const WORKSPACE_PACKAGE_SECTION = "workspace.package";

type SyncCargoVersionOptions = {
	desktopDir?: string;
};

export type SyncCargoVersionResult = {
	changed: boolean;
	previousVersion: string | null;
	version: string;
};

export async function syncCargoVersion({
	desktopDir = process.cwd(),
}: SyncCargoVersionOptions = {}): Promise<SyncCargoVersionResult> {
	const cargoTomlPath = join(desktopDir, "..", "..", "Cargo.toml");
	const packageJsonPath = join(desktopDir, "package.json");
	const version = readWorkspacePackageVersion(
		await readFile(cargoTomlPath, "utf8"),
	);
	const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
	const previousVersion =
		typeof packageJson.version === "string" ? packageJson.version : null;
	if (previousVersion === version) {
		return { changed: false, previousVersion, version };
	}

	packageJson.version = version;
	await writeFile(
		packageJsonPath,
		`${JSON.stringify(packageJson, null, "\t")}\n`,
	);
	return { changed: true, previousVersion, version };
}

export function readWorkspacePackageVersion(cargoToml: string): string {
	let inWorkspacePackage = false;

	for (const line of cargoToml.split(/\r?\n/)) {
		const trimmed = line.trim();
		const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
		if (sectionMatch) {
			inWorkspacePackage = sectionMatch[1] === WORKSPACE_PACKAGE_SECTION;
			continue;
		}

		if (!inWorkspacePackage || trimmed.startsWith("#")) continue;

		const versionMatch = trimmed.match(/^version\s*=\s*"([^"]+)"\s*(?:#.*)?$/);
		if (versionMatch) return versionMatch[1];
	}

	throw new Error(
		`missing [${WORKSPACE_PACKAGE_SECTION}] version in Cargo.toml`,
	);
}

if (import.meta.main) {
	try {
		const result = await syncCargoVersion();
		const previous = result.previousVersion ?? "missing";
		const message = result.changed
			? `Desktop package version: ${previous} -> ${result.version}`
			: `Desktop package version already ${result.version}`;
		console.log(message);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
