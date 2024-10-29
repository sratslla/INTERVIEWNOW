const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const ACTIONS = require("./Actions");
require("dotenv").config();

const server = http.createServer(app);
const io = new Server(server);

const pubClient = createClient({
	url: process.env.REDIS_URL,
});

const subClient = pubClient.duplicate();

pubClient.on("error", (err) => {
	console.error("Redis Pub Client Error:", err);
});

subClient.on("error", (err) => {
	console.error("Redis Sub Client Error:", err);
});

(async () => {
	try {
		await pubClient.connect();
		await subClient.connect();
		console.log("Redis clients connected");

		io.adapter(createAdapter(pubClient, subClient));
	} catch (error) {
		console.error("Error connecting Redis clients:", error);
	}
})();

const USER_MAP_KEY = "userSocketMap";
const ROOM_MAP_KEY = "roomSocketMap";

async function addUserToRoom(socketId, userName, roomId) {
	await pubClient.hSet(USER_MAP_KEY, socketId, userName);
	await pubClient.sAdd(`${ROOM_MAP_KEY}:${roomId}`, socketId);
}

async function removeUserFromRoom(socketId, roomId) {
	await pubClient.hDel(USER_MAP_KEY, socketId);
	await pubClient.sRem(`${ROOM_MAP_KEY}:${roomId}`, socketId);

	const roomSize = await pubClient.sCard(`${ROOM_MAP_KEY}:${roomId}`);
	if (roomSize === 0) {
		await pubClient.del(`${ROOM_MAP_KEY}:${roomId}`); // Delete the room if empty
	}
}
async function getUser(socketId) {
	return await pubClient.hGet(USER_MAP_KEY, socketId);
}

async function getAllConnectedClients(roomId) {
	const socketIds = await pubClient.sMembers(`${ROOM_MAP_KEY}:${roomId}`);
	const userNames = await pubClient.hmGet(USER_MAP_KEY, socketIds);
	return socketIds.map((socketId, index) => ({
		socketId,
		userName: userNames[index],
	}));
}

io.on("connection", (socket) => {
	socket.on(ACTIONS.JOIN, async ({ roomId, userName }) => {
		await addUserToRoom(socket.id, userName, roomId);
		socket.join(roomId);
		const clients = await getAllConnectedClients(roomId);
		console.log(
			socket.id,
			"----",
			userName,
			"roomID",
			roomId,
			"Joined on Port",
			PORT
		);
		clients.forEach(({ socketId }) => {
			io.to(socketId).emit(ACTIONS.JOINED, {
				clients,
				userName,
				socketId: socket.id,
			});
		});
	});

	socket.on("join_room", async (roomId) => {
		const clients = await getAllConnectedClients(roomId);
		const usersInThisRoom = clients.filter(
			(id) => id.socketId !== socket.id
		);
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
	});

	socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
		io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
	});

	socket.on("canvas-data", ({ base64ImageData, roomId }) => {
		io.to(roomId).emit("canvas-data", { base64ImageData });
	});

	socket.on(ACTIONS.RUN_CODE, ({ roomId }) => {
		io.to(roomId).emit(ACTIONS.RUN_CODE);
	});

	socket.on(ACTIONS.OUTPUT_CLOSED, ({ roomId }) => {
		io.to(roomId).emit(ACTIONS.OUTPUT_CLOSED);
	});

	socket.on(ACTIONS.CODE_COMPILED, ({ roomId, socket_output }) => {
		socket.to(roomId).emit(ACTIONS.CODE_COMPILED, { socket_output });
	});

	// Chat Implementation
	socket.on("send_message", ({ roomId, messageData }) => {
		socket.to(roomId).emit("receive_message", { messageData });
	});

	socket.on("disconnecting", async () => {
		const rooms = [...socket.rooms];
		const userName = await getUser(socket.id);
		rooms.forEach(async (roomId) => {
			socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
				socketId: socket.id,
				userName: userName,
			});
			await removeUserFromRoom(socket.id, roomId);
		});
		socket.leave();
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
