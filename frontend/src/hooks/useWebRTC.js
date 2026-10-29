import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { ICE_CONFIG } from "../webrtc/iceConfig";

/**
 * Mesh WebRTC via simple-peer.
 * - Consistent peer state: { peerID, peer, userName }
 * - Destroys peers + stops tracks on leave/unmount
 * - Mic/cam toggles flip track.enabled (no renegotiation)
 * - Prevents duplicate peers for the same socket id
 */
export function useWebRTC({ socketRef, roomId, enabled }) {
	const [peers, setPeers] = useState([]);
	const [localStream, setLocalStream] = useState(null);
	const [mediaError, setMediaError] = useState(null);
	const [videoEnabled, setVideoEnabled] = useState(true);
	const [audioEnabled, setAudioEnabled] = useState(true);
	const [mediaReady, setMediaReady] = useState(false);

	const peersRef = useRef([]); // [{ peerID, peer, userName }]
	const localStreamRef = useRef(null);
	const mountedRef = useRef(true);

	const syncPeersState = useCallback(() => {
		if (!mountedRef.current) return;
		setPeers([...peersRef.current]);
	}, []);

	const destroyPeer = useCallback(
		(peerID) => {
			const idx = peersRef.current.findIndex((p) => p.peerID === peerID);
			if (idx === -1) return;
			const { peer } = peersRef.current[idx];
			try {
				peer.destroy();
			} catch {
				/* already destroyed */
			}
			peersRef.current.splice(idx, 1);
			syncPeersState();
		},
		[syncPeersState]
	);

	const destroyAllPeers = useCallback(() => {
		const list = peersRef.current;
		peersRef.current = [];
		list.forEach(({ peer }) => {
			try {
				peer.removeAllListeners("error");
				peer.removeAllListeners("close");
				peer.removeAllListeners("signal");
				peer.removeAllListeners("stream");
				peer.destroy();
			} catch {
				/* ignore */
			}
		});
		syncPeersState();
	}, [syncPeersState]);

	const stopLocalStream = useCallback(() => {
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => {
				try {
					track.stop();
				} catch {
					/* ignore */
				}
			});
			localStreamRef.current = null;
		}
		if (mountedRef.current) setLocalStream(null);
	}, []);

	const cleanup = useCallback(() => {
		destroyAllPeers();
		stopLocalStream();
	}, [destroyAllPeers, stopLocalStream]);

	const createPeer = useCallback(
		(userToSignal, callerID, stream, userName) => {
			destroyPeer(userToSignal);

			const peer = new Peer({
				initiator: true,
				trickle: true,
				stream,
				config: ICE_CONFIG,
			});

			peer.on("signal", (signal) => {
				socketRef.current?.emit("sending signal", {
					userToSignal,
					callerID,
					signal,
				});
			});

			peer.on("error", (err) => {
				console.error("Peer error (initiator)", userToSignal, err);
				destroyPeer(userToSignal);
			});

			peer.on("close", () => {
				destroyPeer(userToSignal);
			});

			peersRef.current.push({ peerID: userToSignal, peer, userName });
			syncPeersState();
			return peer;
		},
		[destroyPeer, socketRef, syncPeersState]
	);

	const addPeer = useCallback(
		(incomingSignal, callerID, stream, userName) => {
			destroyPeer(callerID);

			const peer = new Peer({
				initiator: false,
				trickle: true,
				stream,
				config: ICE_CONFIG,
			});

			peer.on("signal", (signal) => {
				socketRef.current?.emit("returning signal", {
					signal,
					callerID,
				});
			});

			peer.on("error", (err) => {
				console.error("Peer error (receiver)", callerID, err);
				destroyPeer(callerID);
			});

			peer.on("close", () => {
				destroyPeer(callerID);
			});

			peer.signal(incomingSignal);

			peersRef.current.push({ peerID: callerID, peer, userName });
			syncPeersState();
			return peer;
		},
		[destroyPeer, socketRef, syncPeersState]
	);

	const removeRemotePeer = useCallback(
		(socketId) => {
			destroyPeer(socketId);
		},
		[destroyPeer]
	);

	const toggleVideo = useCallback(() => {
		const stream = localStreamRef.current;
		if (!stream) return;
		const track = stream.getVideoTracks()[0];
		if (!track) return;
		track.enabled = !track.enabled;
		setVideoEnabled(track.enabled);
	}, []);

	const toggleAudio = useCallback(() => {
		const stream = localStreamRef.current;
		if (!stream) return;
		const track = stream.getAudioTracks()[0];
		if (!track) return;
		track.enabled = !track.enabled;
		setAudioEnabled(track.enabled);
	}, []);

	// Acquire media + wire socket signaling once
	useEffect(() => {
		mountedRef.current = true;
		if (!enabled || !roomId) return undefined;

		let cancelled = false;
		const socket = socketRef.current;
		if (!socket) return undefined;

		const handleAllUsers = (users) => {
			const stream = localStreamRef.current;
			if (!stream || cancelled) return;
			users.forEach((user) => {
				createPeer(
					user.socketId,
					socket.id,
					stream,
					user.userName || "Peer"
				);
			});
		};

		const handleUserJoined = (payload) => {
			const stream = localStreamRef.current;
			if (!stream || cancelled || !payload?.signal || !payload?.callerID) return;
			addPeer(payload.signal, payload.callerID, stream, "Peer");
		};

		const handleReturnedSignal = (payload) => {
			if (!payload?.id || !payload?.signal) return;
			const item = peersRef.current.find((p) => p.peerID === payload.id);
			if (!item) return;
			try {
				item.peer.signal(payload.signal);
			} catch (err) {
				console.error("Failed to apply returned signal", err);
				destroyPeer(payload.id);
			}
		};

		const start = async () => {
			let stream = null;
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true,
				});
			} catch (err) {
				console.warn("Full A/V failed, trying audio-only", err);
				try {
					stream = await navigator.mediaDevices.getUserMedia({
						video: false,
						audio: true,
					});
					setVideoEnabled(false);
				} catch (audioErr) {
					console.warn("No media devices available", audioErr);
					setMediaError(
						"Camera/mic unavailable. You can still code and chat."
					);
					// Empty MediaStream so peers can still connect (recv-only-ish)
					stream = new MediaStream();
				}
			}

			if (cancelled) {
				stream?.getTracks().forEach((t) => t.stop());
				return;
			}

			localStreamRef.current = stream;
			setLocalStream(stream);
			setMediaReady(true);
			setMediaError((prev) =>
				stream.getTracks().length === 0
					? prev || "Joined without camera/mic."
					: null
			);

			socket.on("all_users", handleAllUsers);
			socket.on("user_joined", handleUserJoined);
			socket.on("receiving returned signal", handleReturnedSignal);
			socket.emit("join_room", roomId);
		};

		start();

		return () => {
			cancelled = true;
			mountedRef.current = false;
			socket.off("all_users", handleAllUsers);
			socket.off("user_joined", handleUserJoined);
			socket.off("receiving returned signal", handleReturnedSignal);
			cleanup();
			setMediaReady(false);
		};
		// Intentionally once per room join when enabled flips true
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, roomId]);

	return {
		peers,
		localStream,
		mediaError,
		mediaReady,
		videoEnabled,
		audioEnabled,
		toggleVideo,
		toggleAudio,
		removeRemotePeer,
		cleanup,
	};
}
