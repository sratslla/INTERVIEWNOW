import React, { useCallback, useEffect, useRef, useState } from "react";
import "./EditorPage.css";
import Client from "../../Components/Editor/Client";
import Editor from "../../Components/Editor/Editor";
import { language_options } from "../../Components/Editor/languageOptions";
import axios from "axios";
import { BsChatSquareText } from "react-icons/bs";
// import { IoSettingsSharp } from "react-icons/io5";
import { FaChalkboardUser } from "react-icons/fa6";
import { MdOutlineCancel } from "react-icons/md";
import Select from "react-select";
// import {
// 	CiVideoOn,
// 	CiVideoOff,
// 	CiMicrophoneOn,
// 	CiMicrophoneOff,
// } from "react-icons/ci";
import ReactPlayer from "react-player";
import { initSocket } from "../../socket";
import ACTIONS, { JOIN } from "./Actions";
import Peer from "simple-peer";
import LoadingBar from "react-top-loading-bar";
// import styled from "styled-components";
// import peer from "../../service/peer";
import {
	Navigate,
	useLocation,
	useNavigate,
	useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import Container from "../../Components/WhiteBoard/Container";
import Chat from "../../Components/Chat/Chat";

const Videoo = (props) => {
	const ref = useRef();

	useEffect(() => {
		if (props.peer.peer) {
			props.peer.peer.on("stream", (stream) => {
				ref.current.srcObject = stream;
			});
		}
	}, [props.peer.peer]);

	return (
		<video ref={ref} autoPlay style={{ width: "20vw", height: "25vh" }} />
	);
};

// const videoConstraints = {
// 	height: window.innerHeight / 2,
// 	width: window.innerWidth / 2,
// };
const dropDownOptions = [
	{ value: language_options[0].id, label: language_options[0].name },
	{ value: language_options[1].id, label: language_options[1].name },
	{ value: language_options[2].id, label: language_options[2].name },
	// { value: language_options[3].id, label: language_options[3].name },
	// { value: language_options[4].id, label: language_options[4].name },
];

const EditorPage = () => {
	const socketRef = useRef(null);
	const codeRef = useRef(null);
	const message__area = useRef(null);
	const location = useLocation();
	const { roomId } = useParams();
	const reactNavigator = useNavigate();
	const [clients, setClients] = useState([]);
	const [open, setOpen] = useState(false);
	const [whiteBoardOpen, setWhiteBoardOpen] = useState(false);
	const [outPutOpen, setOutPutOpen] = useState(false);
	const [output, setOutput] = useState("");
	// const [videoOn, setVideoOn] = useState(true);
	// const [micOn, setMicOn] = useState(true);
	const [language_id, setLanguage_id] = useState(63);
	const [language_name, setLanguage_name] = useState("javascript");

	const peersRef = useRef([]);
	const userVideo = useRef();
	const [peers, setPeers] = useState([]);

	const [progress, setProgress] = useState(0);

	// const [username, setUsername] = useState("");
	// const [room, setRoom] = useState("");

	useEffect(() => {
		const init = async () => {
			socketRef.current = await initSocket();
			socketRef.current.on("connect_error", (err) => handleErrors(err));
			socketRef.current.on("connect_failed", (err) => handleErrors(err));

			const handleErrors = (e) => {
				// console.log("socket error", e);
				toast.error("Socket connection failed, try again later");
				reactNavigator("/");
			};

			socketRef.current.emit(ACTIONS.JOIN, {
				roomId,
				userName: location.state?.userName,
			});

			// Socket JOINED
			socketRef.current.on(
				ACTIONS.JOINED,
				({ clients, userName, socketId }) => {
					if (userName !== location.state?.userName) {
						toast.success(`${userName} joined the room`);
						// console.log(`${userName} joined the room`);
					}
					setClients(clients);
					socketRef.current.emit(ACTIONS.SYNC_CODE, {
						code: codeRef.current,
						socketId,
					});
					// console.log("Code Sent", codeRef.current);
					// console.log("Socket Joined", userName);
				}
			);

			socketRef.current.on(ACTIONS.RUN_CODE, () => {
				setOutPutOpen(true);
				setOutput("Processing");
				setProgress(progress + 30);
				// console.log("DONE");
			});
			socketRef.current.on(ACTIONS.OUTPUT_CLOSED, () => {
				setOutPutOpen(false);
			});
			socketRef.current.on(ACTIONS.CODE_COMPILED, ({ socket_output }) => {
				setOutput(socket_output);
				setProgress(100);
				// console.log("OUtput received in sockets", socket_output);
			});
			navigator.mediaDevices
				.getUserMedia({ video: true, audio: true })
				.then((stream) => {
					userVideo.current.srcObject = stream;
					// console.log("hsjkdfhakjsdhfjkasdf");
					socketRef.current.emit("join_room", roomId);
					socketRef.current.on("all_users", (users) => {
						const peers = [];
						// console.log(socketRef.current.id);
						// console.log(users);
						users.forEach((userID) => {
							if (userID.socketId !== socketRef.current.id) {
								const peer = createPeer(
									userID.socketId,
									socketRef.current.id,
									stream
								);
								peersRef.current.push({
									peerID: userID.socketId,
									peer,
								});
								peers.push({
									peerID: userID.socketId,
									peer,
								});
								peers.push(peer);
							}
						});
						setPeers(peers);
					});

					socketRef.current.on("user_joined", (payload) => {
						const peer = addPeer(
							payload.signal,
							payload.callerID,
							stream
						);
						peersRef.current.push({
							peerID: payload.callerID,
							peer,
						});
						const peerObj = {
							peer,
							peerID: payload.callerID,
						};
						setPeers((users) => [...users, peerObj]);
					});

					socketRef.current.on(
						"receiving returned signal",
						(payload) => {
							const item = peersRef.current.find(
								(p) => p.peerID === payload.id
							);
							item.peer.signal(payload.signal);
						}
					);
				});
			socketRef.current.on(
				ACTIONS.DISCONNECTED,
				({ socketId, userName }) => {
					toast.success(`${userName} left the rooom`);
					setClients((prev) => {
						return prev.filter(
							(client) => client.socketId !== socketId
						);
					});
					// Video disconeect Handle
					const peerObj = peersRef.current.find(
						(p) => p.peerID === socketId
					);
					if (peerObj) {
						peerObj.peer.destroy();
					}
					const peers = peersRef.current.filter(
						(p) => p.peerID !== socketId
					);
					peersRef.current = peers;
					setPeers(peers);
				}
			);
		};
		init();
		return () => {
			socketRef.current.disconnect();
			socketRef.current.off(ACTIONS.JOINED);
			socketRef.current.off(ACTIONS.DISCONNECTED);
			socketRef.current.off(ACTIONS.RUN_CODE);
			socketRef.current.off(ACTIONS.CODE_COMPILED);
		};
	}, [roomId]);

	function createPeer(userToSignal, callerID, stream) {
		const peer = new Peer({
			initiator: true,
			trickle: false,
			stream,
		});

		peer.on("signal", (signal) => {
			socketRef.current.emit("sending signal", {
				userToSignal,
				callerID,
				signal,
			});
		});

		return peer;
	}

	function addPeer(incomingSignal, callerID, stream) {
		const peer = new Peer({
			initiator: false,
			trickle: false,
			stream,
		});

		peer.on("signal", (signal) => {
			socketRef.current.emit("returning signal", { signal, callerID });
		});

		peer.signal(incomingSignal);

		return peer;
	}

	async function copyRoomID() {
		try {
			await navigator.clipboard.writeText(roomId);
			toast.success("Room ID has been copied to your clipboard");
		} catch (err) {
			toast.error("Could not copy Room ID");
		}
	}

	function leaveRoom() {
		reactNavigator("/");
	}
	const outputBoxClose = () => {
		socketRef.current.emit(ACTIONS.OUTPUT_CLOSED, { roomId });
	};
	const run = () => {
		setOutPutOpen(true);
		setProgress(progress + 30);
		setOutput("Processing");
		socketRef.current.emit(ACTIONS.RUN_CODE, { roomId });
		const formData = {
			language_id: language_id,
			// encode source code in base64
			source_code: btoa(codeRef.current),
			stdin: "",
		};
		// console.log("Run Code");
		// console.log(codeRef.current);

		const options = {
			method: "POST",
			url: "https://judge0-ce.p.rapidapi.com/submissions",
			params: { base64_encoded: "true", fields: "*" },
			headers: {
				"content-type": "application/json",
				"Content-Type": "application/json",
				"X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
				"X-RapidAPI-Key":
					"843d11d34amshec8a22d59e66cb3p16c0a1jsn8f297096e12a",
			},
			data: formData,
		};
		// console.log(options);

		axios.request(options).then(function (response) {
			// console.log("res.data", response.data);
			const token = response.data.token;
			checkStatus(token);
			setProgress(progress + 30);
		});
		// .catch((err) => {
		// 	let error = err.response ? err.response.data : err;
		// 	// get error status
		// 	let status = err.response.status;
		// 	console.log("status", status);
		// 	if (status === 429) {
		// 		console.log("too many requests", status);

		// 		console.log(
		// 			`Quota of 100 requests exceeded for the Day! Please read the blog on freeCodeCamp to learn how to setup your own RAPID API Judge0!`,
		// 			10000
		// 		);
		// 	}
		// 	// setProcessing(false);
		// 	console.log("catch block...", error);
		// });
	};

	const checkStatus = async (token) => {
		const options = {
			method: "GET",
			url: "https://judge0-ce.p.rapidapi.com/submissions" + "/" + token,
			params: { base64_encoded: "true", fields: "*" },
			headers: {
				"X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
				"X-RapidAPI-Key":
					"843d11d34amshec8a22d59e66cb3p16c0a1jsn8f297096e12a",
			},
		};
		try {
			let response = await axios.request(options);
			let statusId = response.data.status?.id;

			// Processed - we have a result
			if (statusId === 1 || statusId === 2) {
				// still processing
				setTimeout(() => {
					checkStatus(token);
				}, 2000);
				return;
			} else {
				// setProcessing(false);
				// setOutputDetails(response.data);
				// showSuccessToast(`Compiled Successfully!`);
				// console.log("response.data", response.data);
				// console.log(atob(response.data.stdout));
				setOutput(atob(response.data.stdout));
				let socket_output = atob(response.data.stdout);
				socketRef.current.emit(ACTIONS.CODE_COMPILED, {
					roomId,
					socket_output,
				});
				setProgress(100);
				return;
			}
		} catch (err) {
			console.log("err", err);
			//   setProcessing(false);
			//   showErrorToast();
		}
	};

	if (!location.state) {
		return <Navigate to="/" />;
	}

	const onSelectChange = (selectedOption) => {
		// console.log("language changed");
		// console.log(selectedOption);
		setLanguage_id(selectedOption.value);
		setLanguage_name(selectedOption.label);
	};

	return (
		<div className="mf-main-container">
			<div className="mf-nav-container">
				<div className="mf-nav-logo">INTERVIEW NOW</div>
				<div className="mf-nav-right">
					<div className="mf-connected">
						<h3 style={{ padding: "15px" }}>Connected:-</h3>
					</div>
					<div className="mf-nav-client-list">
						{clients.map((client) => (
							<Client
								key={client.socketId}
								userName={client.userName}
							/>
						))}
					</div>
					<Select
						options={dropDownOptions}
						defaultValue={dropDownOptions[0]}
						onChange={(selectedOption) =>
							onSelectChange(selectedOption)
						}
					/>
					)
					<div>
						<FaChalkboardUser
							className="mf-chat-icon"
							onClick={() => {
								setWhiteBoardOpen(!whiteBoardOpen);
							}}
							style={{ padding: "5px" }}
						/>
						<BsChatSquareText
							className="mf-chat-icon"
							onClick={() => {
								setOpen(!open);
							}}
							style={{ padding: "5px" }}
						/>
					</div>
					<div>
						<button
							className="mf-nav-btn-copy"
							onClick={copyRoomID}
						>
							Copy Room ID
						</button>
						<button
							className="mf-nav-btn-leave"
							onClick={leaveRoom}
						>
							Leave Room
						</button>
					</div>
				</div>
			</div>
			<div className="mf-code-container">
				<Editor
					socketRef={socketRef}
					roomId={roomId}
					language_name={language_name}
					onCodeChange={(code) => {
						codeRef.current = code;
					}}
				/>
			</div>
			<div
				className={`wb-container ${
					whiteBoardOpen ? "active" : "inactive"
				}`}
			>
				<Container socketRef={socketRef} roomId={roomId} />
			</div>
			<div
				className={`output-container ${
					outPutOpen ? "active" : "inactive"
				}`}
			>
				<LoadingBar
					color="#4ec138"
					progress={progress}
					onLoaderFinished={() => setProgress(0)}
				/>
				<div className="output_title">
					OUTPUT
					<MdOutlineCancel
						className="mf-chat-icon"
						onClick={outputBoxClose}
					/>
				</div>
				<div className="output">{output}</div>
			</div>
			<div className="mf-video-container">
				<video
					ref={userVideo}
					autoPlay
					muted
					style={{ width: "20vw", height: "25vh" }}
				/>
				{peers.map((peer, index) => {
					return <Videoo key={index} peer={peer} />;
				})}
			</div>
			<div className="mf-bottom-button">
				<button className="btn-runtest" onClick={run}>
					RUN CODE
				</button>
			</div>
			<div
				className={`mf-chat-container ${open ? "active" : "inactive"}`}
			>
				<Chat
					socketRef={socketRef}
					username={clients}
					roomId={roomId}
				/>
			</div>
		</div>
	);
};
export default EditorPage;
