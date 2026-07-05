const OVERLAY_ROUTE_PREFIXES = ["/settings", "/automations"] as const

export function isOverlayRoute(pathname: string): boolean {
	return OVERLAY_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	)
}

export function isSettingsRoute(pathname: string): boolean {
	return pathname === "/settings" || pathname.startsWith("/settings/")
}

export function shouldTrackAppRoute(pathname: string): boolean {
	return !isOverlayRoute(pathname)
}

export function resolveSettingsBackTarget(lastRoute: string | null): { to: string } {
	return { to: lastRoute ?? "/" }
}

export function shouldClearBackgroundSession(
	pathname: string,
	sessionId: string | undefined,
): boolean {
	if (isOverlayRoute(pathname)) return false
	if (sessionId) return false
	return pathname === "/" || /^\/project\/[^/]+\/?$/.test(pathname)
}
