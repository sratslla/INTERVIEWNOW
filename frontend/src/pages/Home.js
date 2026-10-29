import React, { useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { toast } from "react-hot-toast";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { saveRoomSession } from "../utils/session";

const Home = () => {
	const navigate = useNavigate();
	const [roomId, setRoomId] = useState("");
	const [userName, setUserName] = useState("");

	const createNewRoom = (e) => {
		e.preventDefault();
		const id = uuidV4();
		setRoomId(id);
		toast.success("New room ready — enter your name and join");
	};

	const joinRoom = () => {
		if (!roomId.trim() || !userName.trim()) {
			toast.error("Please fill room ID and username");
			return;
		}
		const cleanRoom = roomId.trim();
		const cleanName = userName.trim().slice(0, 40);
		saveRoomSession(cleanRoom, cleanName);
		navigate(`/Editor/${cleanRoom}`, {
			state: { userName: cleanName },
		});
	};

	const onKeyDown = (e) => {
		if (e.key === "Enter") joinRoom();
	};

	return (
		<div className="home-page">
			<div className="home-atmosphere" aria-hidden="true" />
			<main className="home-panel">
				<p className="home-brand">INTERVIEW NOW</p>
				<h1 className="home-headline">Code, talk, and whiteboard live.</h1>
				<p className="home-sub">
					Create a room, share the ID, and interview with video plus a shared editor.
				</p>

				<div className="home-form">
					<input
						className="home-input"
						placeholder="Room ID"
						value={roomId}
						onChange={(e) => setRoomId(e.target.value)}
						onKeyDown={onKeyDown}
						autoComplete="off"
					/>
					<input
						className="home-input"
						placeholder="Your name"
						value={userName}
						onChange={(e) => setUserName(e.target.value)}
						onKeyDown={onKeyDown}
						autoComplete="nickname"
						maxLength={40}
					/>
					<button type="button" className="home-join" onClick={joinRoom}>
						Enter room
					</button>
					<p className="home-create">
						No invite?{" "}
						<button type="button" className="home-link" onClick={createNewRoom}>
							Create a new room
						</button>
					</p>
				</div>
			</main>
		</div>
	);
};

export default Home;
