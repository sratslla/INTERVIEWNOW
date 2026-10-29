import { io } from "socket.io-client";

export const initSocket = async () => {
	const url = process.env.REACT_APP_BACKEND_URL;
	if (!url) {
		throw new Error(
			"REACT_APP_BACKEND_URL is not set. Copy frontend/.env.example to frontend/.env"
		);
	}

	const options = {
		forceNew: true,
		reconnection: true,
		reconnectionAttempts: Infinity,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		timeout: 10000,
		transports: ["websocket", "polling"],
	};

	return io(url, options);
};
