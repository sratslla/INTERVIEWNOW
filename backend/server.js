const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const { log } = require("console");
const exp = require("constants");
const path = require("path");

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("build"));
// app.use((req, res, next) => {
// 	res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const userSocketMap = {};
function getAllConnectedClients(roomId) {
	return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
		(socketId) => {
			return {
				socketId,
				userName: userSocketMap[socketId],
			};
		}
	);
}

io.on("connection", (socket) => {
	console.log("socket connected", socket.id);
	socket.on(ACTIONS.JOIN, ({ roomId, userName }) => {
		userSocketMap[socket.id] = userName;
		socket.join(roomId);
		const clients = getAllConnectedClients(roomId);
		console.log(roomId);
		console.log(socket.id, "----", userName, "Joined");
		clients.forEach(({ socketId }) => {
			io.to(socketId).emit(ACTIONS.JOINED, {
				clients,
				userName,
				socketId: socket.id,
			});
		});
	});

	socket.on("join_room", (roomId) => {
		const clients = getAllConnectedClients(roomId);
		// console.log(clients);
		const usersInThisRoom = clients.filter((id) => id !== socket.id);
		// console.log("usersInThisRoom", usersInThisRoom);
		socket.emit("all_users", usersInThisRoom);
	});

	socket.on("sending signal", (payload) => {
		io.to(payload.userToSignal).emit("user_joined", {
			signal: payload.signal,
			callerID: payload.callerID,
		});
	});

	socket.on("returning signal", (payload) => {
		io.to(payload.callerID).emit("receiving returned signal", {
			signal: payload.signal,
			id: socket.id,
		});
	});

	socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
		socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
		// console.log("COde Changed", code);
	});

	socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
		io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
		// console.log("Synch COde", code, socketId);
	});

	socket.on("canvas-data", ({ base64ImageData, roomId }) => {
		// console.log("WB Data -", base64ImageData);
		io.to(roomId).emit("canvas-data", { base64ImageData });
	});

	socket.on(ACTIONS.RUN_CODE, ({ roomId }) => {
		// console.log("code is running in server");
		io.to(roomId).emit(ACTIONS.RUN_CODE);
	});

	socket.on(ACTIONS.OUTPUT_CLOSED, ({ roomId }) => {
		io.to(roomId).emit(ACTIONS.OUTPUT_CLOSED);
	});

	socket.on(ACTIONS.CODE_COMPILED, ({ roomId, socket_output }) => {
		// console.log("code is done in server");
		socket.to(roomId).emit(ACTIONS.CODE_COMPILED, { socket_output });
	});

	// Chat Implementation
	socket.on("send_message", ({ roomId, messageData }) => {
		socket.to(roomId).emit("receive_message", { messageData });
		// console.log("message found in server", messageData);
	});

	socket.on("disconnecting", () => {
		const rooms = [...socket.rooms];
		rooms.forEach((roomId) => {
			socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
				socketId: socket.id,
				userName: userSocketMap[socket.id],
			});
		});
		delete userSocketMap[socket.id];
		socket.leave();
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
