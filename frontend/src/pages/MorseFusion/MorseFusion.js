import React, { useState } from "react";
import MorseFusionLogo from "../../Assets/MorseFusionLogo3.png";
import MF_Logo from "../../Assets/morseFusionLogo.mp4";
import { v4 as uuidV4 } from "uuid";
import { toast } from "react-hot-toast";
import "./MorseFusion.css";
import { useNavigate } from "react-router-dom";
// import Navbar from '../../Components/NavBar/Navbar'

const MorseFusion = () => {
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

	const [isHovered, setIsHovered] = useState(false);

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	return (
		<div className="MF-main-container">
			{/* <Navbar /> */}
			<div className="form-container">
				<div
					className="logo-container"
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					{isHovered ? (
						<video className="logo" autoPlay muted loop>
							<source src={MF_Logo} type="video/mp4" />
							Your browser does not support the video tag.
						</video>
					) : (
						<img
							src={MorseFusionLogo}
							alt="Logo Thumbnail"
							className="logo"
						/>
					)}
				</div>
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

export default MorseFusion;
