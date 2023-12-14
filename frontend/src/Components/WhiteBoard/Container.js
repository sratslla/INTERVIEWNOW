import React, { useState } from "react";

import "./Container.css";
import Board from "./Board";

// class Container extends React.Component {
const Container = ({ socketRef, roomId }) => {
	const [color, setColor] = useState("#000000");
	const [size, setSize] = useState("5");

	const changeColor = (event) => {
		setColor(event.target.value);
	};

	const changeSize = (event) => {
		setSize(event.target.value);
	};

	return (
		<div className="wb-containers">
			<div className="tools-section">
				<div className="color-picker-container">
					Select Brush Color : &nbsp;
					<input type="color" value={color} onChange={changeColor} />
				</div>

				<div className="brushsize-container">
					Select Brush Size : &nbsp;
					<select value={size} onChange={changeSize}>
						<option>5</option>
						<option>10</option>
						<option>15</option>
						<option>20</option>
						<option>25</option>
						<option>30</option>
					</select>
				</div>
			</div>

			<div className="board-container">
				<Board
					color={color}
					size={size}
					socketRef={socketRef}
					roomId={roomId}
				></Board>
			</div>
		</div>
	);
};

export default Container;
