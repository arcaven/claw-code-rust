import { useParams, useRouterState } from "@tanstack/react-router"
import { useSetAtom } from "jotai"
import { useEffect } from "react"
import {
	lastAppRouteAtom,
	settingsBackgroundSessionAtom,
} from "../atoms/ui"
import { shouldClearBackgroundSession, shouldTrackAppRoute } from "../lib/app-navigation"

/**
 * Tracks the last non-settings route and the session to keep alive while Settings is open.
 */
export function useAppRoutePersistence() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const { projectSlug, sessionId } = useParams({ strict: false }) as {
		projectSlug?: string
		sessionId?: string
	}
	const setLastAppRoute = useSetAtom(lastAppRouteAtom)
	const setBackgroundSession = useSetAtom(settingsBackgroundSessionAtom)

	useEffect(() => {
		if (shouldTrackAppRoute(pathname)) {
			setLastAppRoute(pathname)
		}
	}, [pathname, setLastAppRoute])

	useEffect(() => {
		if (sessionId && projectSlug) {
			setBackgroundSession({ sessionId, projectSlug })
			return
		}
		if (shouldClearBackgroundSession(pathname, sessionId)) {
			setBackgroundSession(null)
		}
	}, [pathname, projectSlug, sessionId, setBackgroundSession])
}
