import React, { useEffect, useRef } from "react";
import "./Board.css";

const Board = ({ color, size, socketRef, roomId }) => {
	const isDrawingRef = useRef(false);
	const canvasRef = useRef(null);
	const timeoutRef = useRef(null);

	useEffect(() => {
		const drawOnCanvas = async () => {
			const canvas = canvasRef.current;
			if (!canvas) {
				console.error("Canvas element is null or undefined.");
				return;
			}
			const ctx = canvas.getContext("2d");

			const sketch = document.querySelector("#sketch");
			// const sketchStyle = getComputedStyle(sketch);

			canvas.width = sketch.clientWidth;
			canvas.height = sketch.clientHeight;

			const mouse = { x: 0, y: 0 };
			const lastMouse = { x: 0, y: 0 };

			canvas.addEventListener(
				"mousemove",
				(e) => {
					lastMouse.x = mouse.x;
					lastMouse.y = mouse.y;

					mouse.x = e.pageX - canvas.offsetLeft;
					mouse.y = e.pageY - canvas.offsetTop;
				},
				false
			);

			ctx.lineWidth = size;
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.strokeStyle = color;

			canvas.addEventListener(
				"mousedown",
				() => {
					isDrawingRef.current = true;
					canvas.addEventListener("mousemove", onPaint, false);
				},
				false
			);

			canvas.addEventListener(
				"mouseup",
				() => {
					isDrawingRef.current = false;
					canvas.removeEventListener("mousemove", onPaint, false);
				},
				false
			);

			const onPaint = () => {
				ctx.beginPath();
				ctx.moveTo(lastMouse.x, lastMouse.y);
				ctx.lineTo(mouse.x, mouse.y);
				ctx.closePath();
				ctx.stroke();

				clearTimeout(timeoutRef.current);
				timeoutRef.current = setTimeout(() => {
					const base64ImageData = canvas.toDataURL("image/png");
					console.log("Emitting canvas-data:", base64ImageData);
					socketRef.current.emit("canvas-data", {
						base64ImageData,
						roomId,
					});
				}, 100);
			};
		};
		drawOnCanvas();
	}, [color, size, socketRef.current]);

	useEffect(() => {
		const handleCanvasData = (base64ImageData) => {
			const image = new Image();
			const canvas = canvasRef.current;
			const ctx = canvas.getContext("2d");
			console.log(
				"Hannn kuch toh aa raha h",
				base64ImageData.base64ImageData
			);

			image.onload = () => {
				ctx.drawImage(image, 0, 0);
				isDrawingRef.current = false;
			};

			image.src = base64ImageData.base64ImageData;
		};

		if (socketRef.current) {
			socketRef.current.on("canvas-data", handleCanvasData);
			return () => {
				socketRef.current.off("canvas-data", handleCanvasData);
			};
		}
	}, [socketRef.current]);

	return (
		<div className="sketch" id="sketch">
			<canvas ref={canvasRef} className="board" id="board"></canvas>
		</div>
	);
};

export default Board;
