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
app.use((req, res, next) => {
	res.sendFile(path.join(__dirname, "build", "index.html"));
});

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

	socket.on(ACTIONS.JOIN, ({ roomId, userName, offer }) => {
		userSocketMap[socket.id] = userName;
		socket.join(roomId);
		const clients = getAllConnectedClients(roomId);
		clients.forEach(({ socketId }) => {
			io.to(socketId).emit(ACTIONS.JOINED, {
				clients,
				userName,
				socketId: socket.id,
			});
			io.to(roomId).emit("incomming:call", {
				from: socket.id,
				offer,
			});
			console.log("offerasdfadsf", offer);
		});
	});

	socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
		socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
	});

	socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
		io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
	});

	// Video Call
	// socket.on(ACTIONS.CALL, ({ roomId, offer }) => {
	// 	io.to(roomId).emit("incomming:call", {
	// 		from: socket.id,
	// 		offer,
	// 	});
	// });

	socket.on("call:accepted", ({ to, ans }) => {
		console.log("from", socket.id);
		console.log("ans", ans);
		io.to(to).emit("call:accepted", {
			from: socket.id,
			ans: ans,
		});
	});

	socket.on("peer:nego:needed", ({ to, offer }) => {
		io.to(to).emit("peer:nego:needed", {
			from: socket.id,
			offer,
		});
	});

	socket.on("peer:nego:done", ({ to, ans }) => {
		io.to(to).emit("peer:nego:final", {
			from: socket.id,
			ans,
		});
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

const PORT = process.env.port || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
