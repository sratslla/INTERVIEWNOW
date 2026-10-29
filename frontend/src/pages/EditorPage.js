import React, { useEffect, useMemo, useRef, useState } from "react";
import "./EditorPage.css";
import Client from "../Components/Editor/Client";
import Editor from "../Components/Editor/Editor";
import { dropDownOptions } from "../Components/Editor/languageOptions";
import { BsChatSquareText } from "react-icons/bs";
import { FaChalkboardUser } from "react-icons/fa6";
import { MdOutlineCancel } from "react-icons/md";
import Select from "react-select";
import LoadingBar from "react-top-loading-bar";
import { initSocket } from "../socket";
import ACTIONS from "../Actions";
import {
	Navigate,
	useLocation,
	useNavigate,
	useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import Container from "../Components/WhiteBoard/Container";
import Chat from "../Components/Chat/Chat";
import VideoPanel from "../Components/Video/VideoPanel";
import { useWebRTC } from "../hooks/useWebRTC";
import { useCodeRunner } from "../hooks/useCodeRunner";
import {
	clearRoomSession,
	loadRoomSession,
	saveRoomSession,
} from "../utils/session";

const selectStyles = {
	control: (base) => ({
		...base,
		minWidth: 140,
		background: "#0f1728",
		borderColor: "rgba(27,169,76,0.35)",
		boxShadow: "none",
		":hover": { borderColor: "#1ba94c" },
	}),
	singleValue: (base) => ({ ...base, color: "#e8f0ff" }),
	menu: (base) => ({ ...base, background: "#0f1728", zIndex: 20 }),
	option: (base, state) => ({
		...base,
		background: state.isFocused ? "#1ba94c" : "#0f1728",
		color: "#fff",
	}),
};

const EditorPage = () => {
	const socketRef = useRef(null);
	const codeRef = useRef("");
	const location = useLocation();
	const { roomId } = useParams();
	const navigate = useNavigate();

	const sessionUserName = useMemo(() => {
		return (
			location.state?.userName ||
			loadRoomSession(roomId)?.userName ||
			null
		);
	}, [location.state, roomId]);

	const [clients, setClients] = useState([]);
	const [chatOpen, setChatOpen] = useState(false);
	const [whiteBoardOpen, setWhiteBoardOpen] = useState(false);
	const [socketReady, setSocketReady] = useState(false);
	const [webrtcEnabled, setWebrtcEnabled] = useState(false);
	const [languageId, setLanguageId] = useState(dropDownOptions[0].value);
	const [languageMode, setLanguageMode] = useState(dropDownOptions[0].mode);
	const [sidebarWidth, setSidebarWidth] = useState(280);
	const draggingRef = useRef(false);

	const {
		peers,
		localStream,
		mediaError,
		videoEnabled,
		audioEnabled,
		toggleVideo,
		toggleAudio,
		removeRemotePeer,
		cleanup: cleanupWebRTC,
	} = useWebRTC({
		socketRef,
		roomId,
		enabled: webrtcEnabled,
	});

	const {
		outputOpen,
		output,
		progress,
		running,
		setProgress,
		runCode,
		closeOutput,
		onRemoteRun,
		onRemoteOutputClosed,
		onRemoteCompiled,
		clearPoll,
	} = useCodeRunner({
		socketRef,
		roomId,
		languageId,
		getSourceCode: () => codeRef.current,
	});

	useEffect(() => {
		if (!sessionUserName || !roomId) return undefined;

		saveRoomSession(roomId, sessionUserName);
		let cancelled = false;

		const init = async () => {
			try {
				socketRef.current = await initSocket();
			} catch (err) {
				toast.error(err.message || "Socket init failed");
				navigate("/");
				return;
			}

			const socket = socketRef.current;

			const handleErrors = (e) => {
				console.error("Socket failure", e);
				toast.error("Socket connection failed, try again later");
				navigate("/");
			};

			socket.on("connect_error", handleErrors);
			socket.on("connect_failed", handleErrors);
			socket.on("error_message", ({ message }) => {
				toast.error(message || "Server error");
			});

			socket.emit(ACTIONS.JOIN, {
				roomId,
				userName: sessionUserName,
			});

			socket.on(ACTIONS.JOINED, ({ clients: nextClients, userName, socketId }) => {
				if (cancelled) return;
				if (userName && userName !== sessionUserName) {
					toast.success(`${userName} joined the room`);
				}
				setClients(nextClients || []);

				// Existing clients sync code to the new joiner only
				if (socketId && socketId !== socket.id && codeRef.current) {
					socket.emit(ACTIONS.SYNC_CODE, {
						code: codeRef.current,
						socketId,
					});
				}
			});

			socket.on(ACTIONS.RUN_CODE, () => onRemoteRun());
			socket.on(ACTIONS.OUTPUT_CLOSED, () => onRemoteOutputClosed());
			socket.on(ACTIONS.CODE_COMPILED, ({ socket_output }) => {
				onRemoteCompiled(socket_output);
			});

			socket.on(ACTIONS.DISCONNECTED, ({ socketId, userName }) => {
				if (cancelled) return;
				toast.success(`${userName || "Someone"} left the room`);
				setClients((prev) =>
					prev.filter((client) => client.socketId !== socketId)
				);
				removeRemotePeer(socketId);
			});

			if (!cancelled) {
				setSocketReady(true);
				setWebrtcEnabled(true);
			}
		};

		init();

		return () => {
			cancelled = true;
			clearPoll();
			cleanupWebRTC();
			const socket = socketRef.current;
			if (socket) {
				socket.emit(ACTIONS.LEAVE, { roomId });
				socket.off(ACTIONS.JOINED);
				socket.off(ACTIONS.DISCONNECTED);
				socket.off(ACTIONS.RUN_CODE);
				socket.off(ACTIONS.CODE_COMPILED);
				socket.off(ACTIONS.OUTPUT_CLOSED);
				socket.off("error_message");
				socket.disconnect();
			}
			setSocketReady(false);
			setWebrtcEnabled(false);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomId, sessionUserName]);

	useEffect(() => {
		const onMove = (e) => {
			if (!draggingRef.current) return;
			const next = Math.min(Math.max(window.innerWidth - e.clientX, 220), 420);
			setSidebarWidth(next);
		};
		const onUp = () => {
			draggingRef.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, []);

	async function copyRoomID() {
		try {
			await navigator.clipboard.writeText(roomId);
			toast.success("Room ID copied");
		} catch {
			toast.error("Could not copy Room ID");
		}
	}

	function leaveRoom() {
		clearPoll();
		cleanupWebRTC();
		socketRef.current?.emit(ACTIONS.LEAVE, { roomId });
		socketRef.current?.disconnect();
		clearRoomSession(roomId);
		navigate("/");
	}

	const onSelectChange = (selectedOption) => {
		setLanguageId(selectedOption.value);
		setLanguageMode(selectedOption.mode);
	};

	if (!sessionUserName) {
		return <Navigate to="/" replace />;
	}

	return (
		<div
			className="editor-shell"
			style={{ "--sidebar-width": `${sidebarWidth}px` }}
		>
			<header className="editor-nav">
				<div className="editor-brand">INTERVIEW NOW</div>
				<div className="editor-nav-right">
					<div className="connected-block">
						<span className="connected-label">Connected</span>
						<div className="client-list">
							{clients.map((client) => (
								<Client
									key={client.socketId}
									userName={client.userName}
								/>
							))}
						</div>
					</div>

					<Select
						options={dropDownOptions}
						defaultValue={dropDownOptions[0]}
						onChange={onSelectChange}
						styles={selectStyles}
						isSearchable={false}
						aria-label="Language"
					/>

					<div className="nav-icon-group">
						<button
							type="button"
							className={`icon-btn ${whiteBoardOpen ? "active" : ""}`}
							onClick={() => {
								setWhiteBoardOpen((v) => !v);
								if (!whiteBoardOpen) setChatOpen(false);
							}}
							title="Whiteboard"
						>
							<FaChalkboardUser />
						</button>
						<button
							type="button"
							className={`icon-btn ${chatOpen ? "active" : ""}`}
							onClick={() => {
								setChatOpen((v) => !v);
								if (!chatOpen) setWhiteBoardOpen(false);
							}}
							title="Chat"
						>
							<BsChatSquareText />
						</button>
					</div>

					<div className="nav-actions">
						<button type="button" className="btn-copy" onClick={copyRoomID}>
							Copy Room ID
						</button>
						<button type="button" className="btn-leave" onClick={leaveRoom}>
							Leave
						</button>
					</div>
				</div>
			</header>

			<div className="editor-body">
				<section className="main-pane">
					<div className={`code-pane ${whiteBoardOpen ? "dimmed" : ""}`}>
						<Editor
							socketRef={socketRef}
							socketReady={socketReady}
							roomId={roomId}
							languageMode={languageMode}
							onCodeChange={(code) => {
								codeRef.current = code;
							}}
						/>
					</div>

					<div
						className={`overlay-pane whiteboard ${
							whiteBoardOpen ? "active" : ""
						}`}
					>
						<Container
							socketRef={socketRef}
							socketReady={socketReady}
							roomId={roomId}
						/>
					</div>

					<div className={`output-pane ${outputOpen ? "active" : ""}`}>
						<LoadingBar
							color="#4ec138"
							progress={progress}
							onLoaderFinished={() => setProgress(0)}
						/>
						<div className="output-title">
							<span>{running ? "Running…" : "Output"}</span>
							<button
								type="button"
								className="icon-btn"
								onClick={closeOutput}
								aria-label="Close output"
							>
								<MdOutlineCancel />
							</button>
						</div>
						<pre className="output-body">{output}</pre>
					</div>

					<div className="run-bar">
						<button
							type="button"
							className="btn-run"
							onClick={runCode}
							disabled={running}
						>
							{running ? "Running…" : "Run code"}
						</button>
					</div>
				</section>

				<div
					className="resize-handle"
					onMouseDown={() => {
						draggingRef.current = true;
						document.body.style.cursor = "col-resize";
						document.body.style.userSelect = "none";
					}}
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize sidebar"
				/>

				<aside className="side-pane">
					{chatOpen ? (
						<Chat
							socketRef={socketRef}
							socketReady={socketReady}
							userName={sessionUserName}
							roomId={roomId}
						/>
					) : (
						<VideoPanel
							userName={sessionUserName}
							localStream={localStream}
							peers={peers.map((p) => ({
								...p,
								userName:
									clients.find((c) => c.socketId === p.peerID)
										?.userName || p.userName,
							}))}
							videoEnabled={videoEnabled}
							audioEnabled={audioEnabled}
							onToggleVideo={toggleVideo}
							onToggleAudio={toggleAudio}
							mediaError={mediaError}
						/>
					)}
				</aside>
			</div>
		</div>
	);
};

export default EditorPage;
