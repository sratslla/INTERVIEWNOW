import React, { useEffect, useRef } from "react";
import "./Board.css";

const Board = ({ color, size, socketRef, socketReady, roomId }) => {
	const canvasRef = useRef(null);
	const isDrawingRef = useRef(false);
	const timeoutRef = useRef(null);
	const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
	const styleRef = useRef({ color, size: Number(size) || 5 });

	useEffect(() => {
		styleRef.current = { color, size: Number(size) || 5 };
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		ctx.strokeStyle = color;
		ctx.lineWidth = Number(size) || 5;
	}, [color, size]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;

		const ctx = canvas.getContext("2d");
		const sketch = document.querySelector("#sketch");

		const resize = () => {
			const prev = canvas.toDataURL("image/png");
			canvas.width = sketch?.clientWidth || canvas.parentElement?.clientWidth || 800;
			canvas.height = sketch?.clientHeight || canvas.parentElement?.clientHeight || 500;
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.strokeStyle = styleRef.current.color;
			ctx.lineWidth = styleRef.current.size;
			const image = new Image();
			image.onload = () => ctx.drawImage(image, 0, 0);
			image.src = prev;
		};

		resize();
		window.addEventListener("resize", resize);

		const onMouseMove = (e) => {
			const rect = canvas.getBoundingClientRect();
			mouseRef.current.lastX = mouseRef.current.x;
			mouseRef.current.lastY = mouseRef.current.y;
			mouseRef.current.x = e.clientX - rect.left;
			mouseRef.current.y = e.clientY - rect.top;
		};

		const onPaint = () => {
			if (!isDrawingRef.current) return;
			ctx.strokeStyle = styleRef.current.color;
			ctx.lineWidth = styleRef.current.size;
			ctx.beginPath();
			ctx.moveTo(mouseRef.current.lastX, mouseRef.current.lastY);
			ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
			ctx.closePath();
			ctx.stroke();

			clearTimeout(timeoutRef.current);
			timeoutRef.current = setTimeout(() => {
				if (!socketRef.current) return;
				const base64ImageData = canvas.toDataURL("image/png");
				socketRef.current.emit("canvas-data", { base64ImageData, roomId });
			}, 120);
		};

		const onMouseDown = (e) => {
			isDrawingRef.current = true;
			onMouseMove(e);
			mouseRef.current.lastX = mouseRef.current.x;
			mouseRef.current.lastY = mouseRef.current.y;
			canvas.addEventListener("mousemove", onPaint);
		};

		const onMouseUp = () => {
			isDrawingRef.current = false;
			canvas.removeEventListener("mousemove", onPaint);
		};

		canvas.addEventListener("mousemove", onMouseMove);
		canvas.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			clearTimeout(timeoutRef.current);
			window.removeEventListener("resize", resize);
			window.removeEventListener("mouseup", onMouseUp);
			canvas.removeEventListener("mousemove", onMouseMove);
			canvas.removeEventListener("mousedown", onMouseDown);
			canvas.removeEventListener("mousemove", onPaint);
		};
	}, [roomId, socketRef]);

	useEffect(() => {
		const socket = socketRef.current;
		if (!socketReady || !socket) return undefined;

		const handleCanvasData = ({ base64ImageData }) => {
			if (!base64ImageData || isDrawingRef.current) return;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			const image = new Image();
			image.onload = () => {
				ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
			};
			image.src = base64ImageData;
		};

		socket.on("canvas-data", handleCanvasData);
		return () => {
			socket.off("canvas-data", handleCanvasData);
		};
	}, [socketReady, socketRef]);

	return (
		<div className="sketch" id="sketch">
			<canvas ref={canvasRef} className="board" id="board" />
		</div>
	);
};

export default Board;
