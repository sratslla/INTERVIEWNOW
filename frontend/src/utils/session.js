const SESSION_PREFIX = "interviewnow:room:";

export function saveRoomSession(roomId, userName) {
	if (!roomId || !userName) return;
	try {
		sessionStorage.setItem(
			SESSION_PREFIX + roomId,
			JSON.stringify({ userName, savedAt: Date.now() })
		);
	} catch {
		/* ignore quota / private mode */
	}
}

export function loadRoomSession(roomId) {
	if (!roomId) return null;
	try {
		const raw = sessionStorage.getItem(SESSION_PREFIX + roomId);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed?.userName) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function clearRoomSession(roomId) {
	if (!roomId) return;
	try {
		sessionStorage.removeItem(SESSION_PREFIX + roomId);
	} catch {
		/* ignore */
	}
}
