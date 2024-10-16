import React, { useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { toast } from "react-hot-toast";
import "./Home.css";
import { useNavigate } from "react-router-dom";

const Home = () => {
	const navigate = useNavigate();
	const [roomId, setRoomId] = useState("");
	const [userName, setUserName] = useState("");
	const createNewRoom = (e) => {
		e.preventDefault();
		const id = uuidV4();
		setRoomId(id);
		toast.success("Created a Room");
	};
	const joinRoom = () => {
		if (!roomId || !userName) {
			toast.error("Please fill roomId and username");
			return;
		}
		navigate(`/Editor/${roomId}`, {
			state: {
				userName,
			},
		});
	};

	return (
		<div className="MF-main-container">
			<div className="form-container">
				<div className="logo-container">INTERVIEW NOW</div>
				<div className="input-group">
					<input
						className="input-box"
						placeholder="RoomID"
						value={roomId}
						onChange={(e) => {
							setRoomId(e.target.value);
						}}
					></input>
					<input
						className="input-box"
						placeholder="UserName"
						value={userName}
						onChange={(e) => {
							setUserName(e.target.value);
						}}
					></input>
					<button className="join-btn" onClick={joinRoom}>
						ENTER
					</button>
					<span className="create-info">
						If you dont have a invite create a&nbsp;
						<a
							onClick={createNewRoom}
							href=""
							className="create-newbtn"
						>
							{" "}
							new room
						</a>
					</span>
				</div>
			</div>
		</div>
	);
};

export default Home;
