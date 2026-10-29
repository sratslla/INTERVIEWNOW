import React from "react";
import {
	CiVideoOn,
	CiVideoOff,
	CiMicrophoneOn,
	CiMicrophoneOff,
} from "react-icons/ci";
import { LocalVideo, PeerVideo } from "./VideoTile";
import "./Video.css";

const VideoPanel = ({
	userName,
	localStream,
	peers,
	videoEnabled,
	audioEnabled,
	onToggleVideo,
	onToggleAudio,
	mediaError,
}) => {
	return (
		<aside className="video-panel">
			<div className="video-panel-header">
				<span>Live</span>
				<div className="video-controls">
					<button
						type="button"
						className={`media-btn ${videoEnabled ? "on" : "off"}`}
						onClick={onToggleVideo}
						title={videoEnabled ? "Turn camera off" : "Turn camera on"}
						aria-label="Toggle camera"
					>
						{videoEnabled ? <CiVideoOn /> : <CiVideoOff />}
					</button>
					<button
						type="button"
						className={`media-btn ${audioEnabled ? "on" : "off"}`}
						onClick={onToggleAudio}
						title={audioEnabled ? "Mute mic" : "Unmute mic"}
						aria-label="Toggle microphone"
					>
						{audioEnabled ? <CiMicrophoneOn /> : <CiMicrophoneOff />}
					</button>
				</div>
			</div>

			{mediaError ? <p className="media-error">{mediaError}</p> : null}

			<div className="video-stack">
				<LocalVideo stream={localStream} userName={userName} />
				{peers.map(({ peerID, peer, userName: peerName }) => (
					<PeerVideo
						key={peerID}
						peerID={peerID}
						peer={peer}
						userName={peerName}
					/>
				))}
			</div>
		</aside>
	);
};

export default VideoPanel;
