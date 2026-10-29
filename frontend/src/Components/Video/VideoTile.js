import React, { useEffect, useRef } from "react";
import "./Video.css";

export function LocalVideo({ stream, userName, muted = true }) {
	const ref = useRef(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		el.srcObject = stream || null;
		return () => {
			el.srcObject = null;
		};
	}, [stream]);

	return (
		<div className="video-tile local">
			<video ref={ref} autoPlay playsInline muted={muted} />
			<span className="video-label">{userName || "You"}</span>
		</div>
	);
}

export function PeerVideo({ peer, peerID, userName }) {
	const ref = useRef(null);

	useEffect(() => {
		if (!peer) return undefined;
		const el = ref.current;

		const attach = (stream) => {
			if (el) el.srcObject = stream;
		};

		peer.on("stream", attach);

		// Stream may already be present if the event fired before mount
		if (peer.streams?.[0]) {
			attach(peer.streams[0]);
		}

		return () => {
			peer.off("stream", attach);
			if (el) el.srcObject = null;
		};
	}, [peer, peerID]);

	return (
		<div className="video-tile remote">
			<video ref={ref} autoPlay playsInline />
			<span className="video-label">{userName || "Peer"}</span>
		</div>
	);
}
