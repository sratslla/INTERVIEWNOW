const { io } = require("socket.io-client");
const ACTIONS = {
	JOIN: "join",
	JOINED: "joined",
	DISCONNECTED: "disconnected",
	CODE_CHANGE: "code-change",
};

class LoadTester {
	constructor(serverUrl, totalRooms, usersPerRoom) {
		this.serverUrl = serverUrl;
		this.totalRooms = totalRooms;
		this.usersPerRoom = usersPerRoom;
		this.connections = new Map();
		this.stats = {
			successfulConnections: 0,
			failedConnections: 0,
			messagesSent: 0,
			errors: [],
		};
	}

	createSocketConnection(roomId, userName) {
		const socket = io(this.serverUrl, {
			forceNew: true,
			reconnectionAttempts: 3,
			timeout: 15000,
			transports: ["websocket"],
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
		});

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				socket.close();
				reject(new Error("Connection timeout"));
			}, 20000);

			socket.on("connect", () => {
				clearTimeout(timeout);
				console.log(`User ${userName} connected to room ${roomId}`);
				this.stats.successfulConnections++;

				socket.emit(ACTIONS.JOIN, { roomId, userName });

				const messageInterval = setInterval(() => {
					socket.emit("send_message", {
						roomId,
						messageData: {
							message: `Test message from ${userName}`,
							timestamp: new Date().toISOString(),
						},
					});
					this.stats.messagesSent++;
				}, 120000);

				this.connections.set(socket.id, {
					socket,
					messageInterval,
					roomId,
					userName,
				});

				resolve(socket);
			});

			socket.on("connect_error", (error) => {
				clearTimeout(timeout);
				console.error(
					`Connection error for user ${userName} in room ${roomId}:`,
					error.message
				);
				this.stats.failedConnections++;
				this.stats.errors.push({
					type: "connect_error",
					userName,
					roomId,
					error: error.message,
				});
				reject(error);
			});

			socket.on("error", (error) => {
				console.error(
					`Socket error for user ${userName} in room ${roomId}:`,
					error
				);
				this.stats.errors.push({
					type: "socket_error",
					userName,
					roomId,
					error: error.toString(),
				});
			});
		});
	}

	async startLoadTest() {
		console.log(
			`Starting load test with ${this.totalRooms} rooms and ${this.usersPerRoom} users per room`
		);
		const startTime = Date.now();

		try {
			const batchSize = 50;
			for (
				let roomIndex = 0;
				roomIndex < this.totalRooms;
				roomIndex += batchSize
			) {
				const batchPromises = [];
				const endIndex = Math.min(
					roomIndex + batchSize,
					this.totalRooms
				);

				for (
					let currentRoom = roomIndex;
					currentRoom < endIndex;
					currentRoom++
				) {
					const roomId = `room_${currentRoom}`;

					for (
						let userIndex = 0;
						userIndex < this.usersPerRoom;
						userIndex++
					) {
						const userName = `user_${currentRoom}_${userIndex}`;
						batchPromises.push(
							this.createSocketConnection(roomId, userName).catch(
								(error) => ({
									error,
									roomId,
									userName,
								})
							)
						);
					}
				}

				const results = await Promise.all(batchPromises);

				// Log batch results
				const batchErrors = results.filter((r) => r && r.error);
				if (batchErrors.length > 0) {
					console.log(
						`Batch ${roomIndex / batchSize + 1} completed with ${
							batchErrors.length
						} errors`
					);
				}

				await new Promise((resolve) => setTimeout(resolve, 2000));
			}

			const statsInterval = setInterval(() => {
				this.printStats();
			}, 60000);

			this.statsInterval = statsInterval;
		} catch (error) {
			console.error("Load test error:", error);
		}
	}

	printStats() {
		const stats = {
			totalConnections: this.connections.size,
			successfulConnections: this.stats.successfulConnections,
			failedConnections: this.stats.failedConnections,
			messagesSent: this.stats.messagesSent,
			errorCount: this.stats.errors.length,
			memoryUsage: process.memoryUsage(),
			activeConnections: this.connections.size,
			errorRate:
				(
					(this.stats.failedConnections /
						(this.stats.successfulConnections +
							this.stats.failedConnections)) *
					100
				).toFixed(2) + "%",
		};

		console.log("\n=== Load Test Stats ===");
		console.log(JSON.stringify(stats, null, 2));
	}

	async stopLoadTest() {
		console.log("Stopping load test...");

		if (this.statsInterval) {
			clearInterval(this.statsInterval);
		}

		const batchSize = 100;
		const connections = Array.from(this.connections.entries());

		for (let i = 0; i < connections.length; i += batchSize) {
			const batch = connections.slice(i, i + batchSize);
			batch.forEach(([socketId, connection]) => {
				clearInterval(connection.messageInterval);
				connection.socket.disconnect();
				this.connections.delete(socketId);
			});
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		this.printStats();
	}
}

async function runLoadTest() {
	const serverUrl = "ENTER_SERVER_URL_HERE";
	const loadTester = new LoadTester(serverUrl, 5000, 3);

	process.on("SIGINT", async () => {
		console.log("\nReceived SIGINT. Cleaning up...");
		await loadTester.stopLoadTest();
		process.exit(0);
	});

	await loadTester.startLoadTest();
}

if (require.main === module) {
	runLoadTest().catch(console.error);
}

module.exports = LoadTester;
