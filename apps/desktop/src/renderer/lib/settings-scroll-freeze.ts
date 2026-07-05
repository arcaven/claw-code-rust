const frozenScrollBySessionId = new Map<string, number>()
let pendingRestoreScrollTop: number | null = null
let settingsOverlayWasOpen = false
let restoredScrollTop: number | null = null
let restoredUntilMs = 0

const RESTORE_GUARD_MS = 2_000

export function freezeSessionScroll(sessionId: string, scrollTop: number): void {
	frozenScrollBySessionId.set(sessionId, scrollTop)
}

export function getFrozenSessionScroll(sessionId: string): number | null {
	return frozenScrollBySessionId.get(sessionId) ?? null
}

export function clearFrozenSessionScroll(sessionId: string): void {
	frozenScrollBySessionId.delete(sessionId)
}

export function setPendingRestoreScrollTop(scrollTop: number | null): void {
	pendingRestoreScrollTop = scrollTop
}

export function getPendingRestoreScrollTop(): number | null {
	return pendingRestoreScrollTop
}

export function markScrollRestored(scrollTop: number): void {
	restoredScrollTop = scrollTop
	restoredUntilMs = Date.now() + RESTORE_GUARD_MS
}

export function getRestoredScrollTop(): number | null {
	if (restoredScrollTop == null || Date.now() > restoredUntilMs) {
		restoredScrollTop = null
		return null
	}
	return restoredScrollTop
}

/** Module-level overlay tracking that survives component remounts. */
export function trackSettingsOverlayOpen(open: boolean): boolean {
	const wasOpen = settingsOverlayWasOpen
	settingsOverlayWasOpen = open
	return wasOpen
}
