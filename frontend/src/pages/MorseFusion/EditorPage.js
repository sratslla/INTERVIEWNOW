import React, { useEffect, useRef, useState } from "react";
import "./EditorPage.css";
import MorseFusionLogo from "../../Assets/MorseFusionLogo2.jpg";
import Client from "../../Components/Editor/Client";
import Editor from "../../Components/Editor/Editor";
import { BsChatSquareText } from "react-icons/bs";
import { IoSettingsSharp } from "react-icons/io5";
import { initSocket } from "../../socket";
import ACTIONS, { JOIN } from "./Actions";
import {
	Navigate,
	useLocation,
	useNavigate,
	useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import Video from "../../Components/Video/Video";

const EditorPage = () => {
	const socketRef = useRef(null);
	const codeRef = useRef(null);
	const message__area = useRef(null);
	const location = useLocation();
	const { roomId } = useParams();
	const reactNavigator = useNavigate();
	const [clients, setClients] = useState([]);
	const [open, setOpen] = useState(false);
	// const [placeHolder, setPlaceHolder] = useState("Write a message...");

	useEffect(() => {
		const init = async () => {
			socketRef.current = await initSocket();
			socketRef.current.on("connect_error", (err) => handleErrors(err));
			socketRef.current.on("connect_failed", (err) => handleErrors(err));

			const handleErrors = (e) => {
				console.log("socket error", e);
				toast.error("Socket connection failed, try again later");
				reactNavigator("/MorseFusion");
			};

			socketRef.current.emit(ACTIONS.JOIN, {
				roomId,
				userName: location.state?.userName,
			});

			socketRef.current.on(
				ACTIONS.JOINED,
				({ clients, userName, socketId }) => {
					if (userName != location.state?.userName) {
						toast.success(`${userName} joined the room`);
						console.log(`${userName} joined the room`);
					}
					setClients(clients);
					socketRef.current.emit(ACTIONS.SYNC_CODE, {
						code: codeRef.current,
						socketId,
					});
				}
			);

			// Listening for disconnected

			socketRef.current.on(
				ACTIONS.DISCONNECTED,
				({ socketId, userName }) => {
					toast.success(`${userName} left the rooom`);
					setClients((prev) => {
						return prev.filter(
							(client) => client.socketId !== socketId
						);
					});
				}
			);
		};
		init();
		return () => {
			socketRef.current.disconnect();
			socketRef.current.off(ACTIONS.JOINED);
			socketRef.current.off(ACTIONS.DISCONNECTED);
		};
	}, []);

	async function copyRoomID() {
		try {
			await navigator.clipboard.writeText(roomId);
			toast.success("Room ID has been copied to your clipboard");
		} catch (err) {
			toast.error("Could not copy Room ID");
		}
	}

	function leaveRoom() {
		reactNavigator("/MorseFusion");
	}
	const openSetting = () => {
		console.log("Chat Box opened");
	};
	const runCode = () => {
		console.log("Run Code");
	};
	const runTest = () => {
		console.log("Run Test");
	};
	// const chatBoxEnter = (e) => {
	// 	if (e.key === "Enter") {
	// 		sendMessage(e.target.value);
	// 	}
	// };

	// function sendMessage(message) {
	// 	let msg = {
	// 		user: "userName",
	// 		message: message.trim(),
	// 	};
	// 	// Append
	// 	appendMessage(msg, "outgoing");
	// 	setPlaceHolder("");
	// 	// textarea.value = ''
	// 	// scrollToBottom()

	// 	// Send to server
	// 	// socket.emit('message', msg)
	// }
	// function appendMessage(msg, type) {
	// 	let mainDiv = document.createElement("div");
	// 	let className = type;
	// 	mainDiv.classList.add(className, "message");

	// 	let markup = `
	//         <h4>${msg.user}</h4>
	//         <p>${msg.message}</p>
	//     `;
	// 	mainDiv.innerHTML = markup;
	// 	message__area.current.appendChild(mainDiv);
	// }

	// Recieve messages
	// socket.on('message', (msg) => {
	//     appendMessage(msg, 'incoming')
	//     scrollToBottom()
	// })

	if (!location.state) {
		return <Navigate to="/" />;
	}

	return (
		<div className="mf-main-container">
			<div className="mf-nav-container">
				<div className="mf-nav-logo">
					<img
						className="mf-nav-logo-image"
						src={MorseFusionLogo}
					></img>
				</div>
				<div className="mf-connected">
					<h3>Connected:-</h3>
					<div className="mf-nav-client-list">
						{clients.map((client) => (
							<Client
								key={client.socketId}
								userName={client.userName}
							/>
						))}
					</div>
				</div>
				<div>
					<BsChatSquareText
						className="mf-chat-icon"
						onClick={() => {
							setOpen(!open);
						}}
					/>
					<IoSettingsSharp
						className="mf-chat-icon"
						onClick={openSetting}
					/>
					<button className="mf-nav-btn-copy" onClick={copyRoomID}>
						Copy Room ID
					</button>
					<button className="mf-nav-btn-leave" onClick={leaveRoom}>
						Leave Room
					</button>
				</div>
			</div>
			<div className="mf-code-container">
				<Editor
					socketRef={socketRef}
					roomId={roomId}
					onCodeChange={(code) => {
						codeRef.current = code;
					}}
				/>
			</div>
			<Video />
			<div className="mf-bottom-button">
				<button className="btn-runtest" onClick={runTest}>
					Run Test
				</button>
				<button className="btn-runcode" onClick={runCode}>
					Run Code
				</button>
			</div>
			<div
				className={`mf-chat-container ${open ? "active" : "inactive"}`}
			>
				{/* <div>This is where the chat will go</div> */}
				<section className="chat__section">
					{/* <div className="brand">
                    <h1>Wassup</h1>
                </div> */}
					<div ref={message__area} className="message__area"></div>
					<div>
						<textarea
							id="textarea"
							cols="30"
							rows="1"
							// placeholder={placeHolder}
							// onKeyPress={chatBoxEnter}
						></textarea>
					</div>
				</section>
			</div>
		</div>
	);
};

export default EditorPage;
