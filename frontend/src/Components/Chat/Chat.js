import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import "./Chat.css";

const Chat = ({ socketRef, socketReady, userName, roomId }) => {
	const [currentMessage, setCurrentMessage] = useState("");
	const [messageList, setMessageList] = useState([]);

	const sendMessage = async () => {
		const trimmed = currentMessage.trim();
		if (!trimmed || !socketRef.current) return;

		const messageData = {
			roomId,
			author: userName || "Unknown",
			message: trimmed,
			time:
				new Date().getHours() +
				":" +
				new Date().getMinutes().toString().padStart(2, "0"),
		};

		socketRef.current.emit("send_message", { roomId, messageData });
		setMessageList((list) => [...list, messageData]);
		setCurrentMessage("");
	};

	useEffect(() => {
		const socket = socketRef.current;
		if (!socketReady || !socket) return undefined;

		const onReceive = ({ messageData }) => {
			if (!messageData) return;
			setMessageList((list) => [...list, messageData]);
		};

		socket.on("receive_message", onReceive);
		return () => {
			socket.off("receive_message", onReceive);
		};
	}, [socketReady, socketRef]);

	return (
		<div className="chat-window">
			<div className="chat-header">
				<p>Chat</p>
			</div>
			<div className="chat-body">
				<ScrollToBottom className="message-container">
					{messageList.map((messageContent, index) => (
						<div
							key={`${messageContent.time}-${index}-${messageContent.message}`}
							className={`message ${
								messageContent.author === userName ? "own" : ""
							}`}
						>
							<div className="message-content">
								<p>{messageContent.message}</p>
							</div>
							<div className="message-meta">
								<p className="author">{messageContent.author}</p>
								<p className="time">{messageContent.time}</p>
							</div>
						</div>
					))}
				</ScrollToBottom>
			</div>
			<div className="chat-footer">
				<input
					type="text"
					value={currentMessage}
					placeholder="Message the room…"
					onChange={(event) => setCurrentMessage(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") sendMessage();
					}}
				/>
				<button type="button" onClick={sendMessage} aria-label="Send">
					&#9658;
				</button>
			</div>
		</div>
	);
};

export default Chat;
