const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const ACTIONS = require("./Actions");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || "*";
const io = new Server(server, {
	cors: {
		origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()),
		methods: ["GET", "POST"],
	},
	pingTimeout: 60000,
	pingInterval: 25000,
});

const PORT = process.env.PORT || 5000;
const REDIS_URL = process.env.REDIS_URL;

/* -------------------------------------------------------------------------- */
/*                         Room / user presence store                          */
/* -------------------------------------------------------------------------- */

const memoryUsers = new Map(); // socketId -> userName
const memoryRooms = new Map(); // roomId -> Set<socketId>

const store = {
	async addUserToRoom(socketId, userName, roomId) {
		if (pubClient?.isOpen) {
			await pubClient.hSet("userSocketMap", socketId, userName);
			await pubClient.sAdd(`roomSocketMap:${roomId}`, socketId);
			return;
		}
		memoryUsers.set(socketId, userName);
		if (!memoryRooms.has(roomId)) memoryRooms.set(roomId, new Set());
		memoryRooms.get(roomId).add(socketId);
	},

	async removeUserFromRoom(socketId, roomId) {
		if (pubClient?.isOpen) {
			await pubClient.hDel("userSocketMap", socketId);
			await pubClient.sRem(`roomSocketMap:${roomId}`, socketId);
			const roomSize = await pubClient.sCard(`roomSocketMap:${roomId}`);
			if (roomSize === 0) {
				await pubClient.del(`roomSocketMap:${roomId}`);
			}
			return;
		}
		memoryUsers.delete(socketId);
		const room = memoryRooms.get(roomId);
		if (!room) return;
		room.delete(socketId);
		if (room.size === 0) memoryRooms.delete(roomId);
	},

	async removeUserEverywhere(socketId) {
		if (pubClient?.isOpen) {
			await pubClient.hDel("userSocketMap", socketId);
			return;
		}
		memoryUsers.delete(socketId);
	},

	async getUser(socketId) {
		if (pubClient?.isOpen) {
			return pubClient.hGet("userSocketMap", socketId);
		}
		return memoryUsers.get(socketId) || null;
	},

	async getAllConnectedClients(roomId) {
		if (pubClient?.isOpen) {
			const socketIds = await pubClient.sMembers(`roomSocketMap:${roomId}`);
			if (socketIds.length === 0) return [];
			const userNames = await pubClient.hmGet("userSocketMap", socketIds);
			return socketIds
				.map((socketId, index) => ({
					socketId,
					userName: userNames[index],
				}))
				.filter((c) => c.userName);
		}
		const room = memoryRooms.get(roomId);
		if (!room) return [];
		return [...room]
			.map((socketId) => ({
				socketId,
				userName: memoryUsers.get(socketId),
			}))
			.filter((c) => c.userName);
	},

	async isMember(socketId, roomId) {
		if (pubClient?.isOpen) {
			return pubClient.sIsMember(`roomSocketMap:${roomId}`, socketId);
		}
		return memoryRooms.get(roomId)?.has(socketId) || false;
	},
};

/* -------------------------------------------------------------------------- */
/*                                   Redis                                     */
/* -------------------------------------------------------------------------- */

let pubClient = null;
let subClient = null;
let redisReady = false;

async function setupRedis() {
	if (!REDIS_URL) {
		console.warn("REDIS_URL not set — using in-memory presence (single instance only)");
		return;
	}

	pubClient = createClient({ url: REDIS_URL });
	subClient = pubClient.duplicate();

	pubClient.on("error", (err) => console.error("Redis Pub Client Error:", err));
	subClient.on("error", (err) => console.error("Redis Sub Client Error:", err));

	await pubClient.connect();
	await subClient.connect();
	io.adapter(createAdapter(pubClient, subClient));
	redisReady = true;
	console.log("Redis clients connected — multi-instance adapter enabled");
}

/* -------------------------------------------------------------------------- */
/*                                 HTTP routes                                 */
/* -------------------------------------------------------------------------- */

app.get("/health", (_req, res) => {
	res.json({
		ok: true,
		redis: redisReady,
		store: redisReady ? "redis" : "memory",
	});
});

/* -------------------------------------------------------------------------- */
/*                               Socket handlers                               */
/* -------------------------------------------------------------------------- */

function isNonEmptyString(value) {
	return typeof value === "string" && value.trim().length > 0;
}

io.on("connection", (socket) => {
	socket.on(ACTIONS.JOIN, async ({ roomId, userName }) => {
		try {
			if (!isNonEmptyString(roomId) || !isNonEmptyString(userName)) {
				socket.emit("error_message", { message: "roomId and userName are required" });
				return;
			}

			const cleanRoomId = roomId.trim();
			const cleanUserName = userName.trim().slice(0, 40);

			await store.addUserToRoom(socket.id, cleanUserName, cleanRoomId);
			socket.join(cleanRoomId);

			const clients = await store.getAllConnectedClients(cleanRoomId);
			clients.forEach(({ socketId }) => {
				io.to(socketId).emit(ACTIONS.JOINED, {
					clients,
					userName: cleanUserName,
					socketId: socket.id,
				});
			});
		} catch (err) {
			console.error("JOIN error:", err);
			socket.emit("error_message", { message: "Failed to join room" });
		}
	});

	socket.on("join_room", async (roomId) => {
		try {
			if (!isNonEmptyString(roomId)) return;
			const clients = await store.getAllConnectedClients(roomId);
			const usersInThisRoom = clients.filter((c) => c.socketId !== socket.id);
			socket.emit("all_users", usersInThisRoom);
		} catch (err) {
			console.error("join_room error:", err);
		}
	});

	socket.on("sending signal", async (payload) => {
		try {
			if (!payload?.userToSignal || !payload?.signal || !payload?.callerID) return;
			io.to(payload.userToSignal).emit("user_joined", {
				signal: payload.signal,
				callerID: payload.callerID,
			});
		} catch (err) {
			console.error("sending signal error:", err);
		}
	});

	socket.on("returning signal", (payload) => {
		try {
			if (!payload?.callerID || !payload?.signal) return;
			io.to(payload.callerID).emit("receiving returned signal", {
				signal: payload.signal,
				id: socket.id,
			});
		} catch (err) {
			console.error("returning signal error:", err);
		}
	});

	socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
		if (!isNonEmptyString(roomId)) return;
		socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
	});

	socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
		if (!socketId) return;
		io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
	});

	socket.on("canvas-data", ({ base64ImageData, roomId }) => {
		if (!isNonEmptyString(roomId) || !base64ImageData) return;
		// Exclude sender so the drawer does not redraw their own canvas
		socket.to(roomId).emit("canvas-data", { base64ImageData });
	});

	socket.on(ACTIONS.RUN_CODE, ({ roomId }) => {
		if (!isNonEmptyString(roomId)) return;
		socket.to(roomId).emit(ACTIONS.RUN_CODE);
	});

	socket.on(ACTIONS.OUTPUT_CLOSED, ({ roomId }) => {
		if (!isNonEmptyString(roomId)) return;
		socket.to(roomId).emit(ACTIONS.OUTPUT_CLOSED);
	});

	socket.on(ACTIONS.CODE_COMPILED, ({ roomId, socket_output }) => {
		if (!isNonEmptyString(roomId)) return;
		socket.to(roomId).emit(ACTIONS.CODE_COMPILED, { socket_output });
	});

	socket.on("send_message", ({ roomId, messageData }) => {
		if (!isNonEmptyString(roomId) || !messageData) return;
		socket.to(roomId).emit("receive_message", { messageData });
	});

	socket.on(ACTIONS.LEAVE, async ({ roomId }) => {
		await cleanupSocketFromRoom(socket, roomId);
	});

	socket.on("disconnecting", async () => {
		const rooms = [...socket.rooms].filter((id) => id !== socket.id);
		await Promise.all(rooms.map((roomId) => cleanupSocketFromRoom(socket, roomId)));
	});

	socket.on("disconnect", async () => {
		try {
			await store.removeUserEverywhere(socket.id);
		} catch (err) {
			console.error("disconnect cleanup error:", err);
		}
	});
});

async function cleanupSocketFromRoom(socket, roomId) {
	try {
		if (!isNonEmptyString(roomId)) return;
		const userName = await store.getUser(socket.id);
		socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
			socketId: socket.id,
			userName,
		});
		await store.removeUserFromRoom(socket.id, roomId);
		socket.leave(roomId);
	} catch (err) {
		console.error("cleanupSocketFromRoom error:", err);
	}
}

/* -------------------------------------------------------------------------- */
/*                                   Boot                                      */
/* -------------------------------------------------------------------------- */

(async () => {
	try {
		await setupRedis();
	} catch (error) {
		console.error("Redis setup failed — falling back to in-memory store:", error.message);
		pubClient = null;
		subClient = null;
		redisReady = false;
	}

	server.listen(PORT, () => {
		console.log(`Listening on port ${PORT} (store=${redisReady ? "redis" : "memory"})`);
	});
})();

async function shutdown() {
	console.log("Shutting down...");
	try {
		io.close();
		if (pubClient?.isOpen) await pubClient.quit();
		if (subClient?.isOpen) await subClient.quit();
	} catch (err) {
		console.error("Shutdown error:", err);
	}
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
