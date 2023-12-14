import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

import "./Chat.css";

const Chat = ({ socketRef, username, roomId }) => {
	const [currentMessage, setCurrentMessage] = useState("");
	const [messageList, setMessageList] = useState([]);
	// console.log("username --", username);
	// console.log("usernameidd --", socketRef.current.id);
	const sendMessage = async () => {
		if (currentMessage !== "") {
			const currentUser = username.find(
				(user) => user.socketId === socketRef.current.id
			);
			const messageData = {
				roomId: roomId,
				author: currentUser ? currentUser.userName : "Unknown",
				message: currentMessage,
				time:
					new Date(Date.now()).getHours() +
					":" +
					new Date(Date.now())
						.getMinutes()
						.toString()
						.padStart(2, "0"),
			};
			console.log(messageData);
			await socketRef.current.emit("send_message", {
				roomId,
				messageData,
			});
			console.log("message sent");
			setMessageList((list) => [...list, messageData]);
			setCurrentMessage("");
		}
	};

	useEffect(() => {
		if (socketRef.current) {
			socketRef.current.on("receive_message", ({ messageData }) => {
				setMessageList((list) => [...list, messageData]);
				console.log("message reaived", messageData);
				console.log("Message List --- ", messageList);
			});
		}
		return () => {
			socketRef.current.off("receive_message");
		};
	}, [socketRef.current]);

	return (
		<div className="chat-window">
			<div className="chat-header">
				<p>Chat Box</p>
			</div>
			<div className="chat-body">
				<ScrollToBottom className="message-container">
					{messageList.map((messageContent, index) => (
						<div key={index} className="message">
							<div className="message-content">
								<p>{messageContent.message}</p>
							</div>
							<div className="message-meta">
								<p id="time">{messageContent.time}</p>
								<p id="author">{messageContent.author}</p>
							</div>
						</div>
					))}
				</ScrollToBottom>
			</div>
			<div className="chat-footer">
				<input
					type="text"
					value={currentMessage}
					placeholder="Hey..."
					onChange={(event) => {
						setCurrentMessage(event.target.value);
					}}
					onKeyPress={(event) => {
						event.key === "Enter" && sendMessage();
					}}
				/>
				<button onClick={sendMessage}>&#9658;</button>
			</div>
		</div>
	);
};

export default Chat;
