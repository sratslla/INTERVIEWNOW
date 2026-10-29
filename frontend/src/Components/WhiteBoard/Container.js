import React, { useState } from "react";
import "./Container.css";
import Board from "./Board";

const Container = ({ socketRef, socketReady, roomId }) => {
	const [color, setColor] = useState("#111827");
	const [size, setSize] = useState("5");

	return (
		<div className="wb-containers">
			<div className="tools-section">
				<div className="color-picker-container">
					<label htmlFor="brush-color">Brush</label>
					<input
						id="brush-color"
						type="color"
						value={color}
						onChange={(e) => setColor(e.target.value)}
					/>
				</div>

				<div className="brushsize-container">
					<label htmlFor="brush-size">Size</label>
					<select
						id="brush-size"
						value={size}
						onChange={(e) => setSize(e.target.value)}
					>
						<option value="5">5</option>
						<option value="10">10</option>
						<option value="15">15</option>
						<option value="20">20</option>
						<option value="25">25</option>
						<option value="30">30</option>
					</select>
				</div>
			</div>

			<div className="board-container">
				<Board
					color={color}
					size={size}
					socketRef={socketRef}
					socketReady={socketReady}
					roomId={roomId}
				/>
			</div>
		</div>
	);
};

export default Container;
