import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import ACTIONS from "../Actions";

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";

function decodeBase64(value) {
	if (!value) return "";
	try {
		return atob(value);
	} catch {
		return "";
	}
}

function formatJudge0Result(data) {
	const status = data?.status?.description || "Unknown";
	const stdout = decodeBase64(data?.stdout);
	const stderr = decodeBase64(data?.stderr);
	const compileOutput = decodeBase64(data?.compile_output);
	const message = decodeBase64(data?.message);

	const parts = [`Status: ${status}`];
	if (stdout) parts.push(stdout);
	if (stderr) parts.push(`stderr:\n${stderr}`);
	if (compileOutput) parts.push(`compile:\n${compileOutput}`);
	if (message && !stdout && !stderr && !compileOutput) parts.push(message);
	if (parts.length === 1) parts.push("(no output)");
	return parts.join("\n\n");
}

export function useCodeRunner({ socketRef, roomId, languageId, getSourceCode }) {
	const [outputOpen, setOutputOpen] = useState(false);
	const [output, setOutput] = useState("");
	const [progress, setProgress] = useState(0);
	const [running, setRunning] = useState(false);
	const pollTimeoutRef = useRef(null);

	const clearPoll = useCallback(() => {
		if (pollTimeoutRef.current) {
			clearTimeout(pollTimeoutRef.current);
			pollTimeoutRef.current = null;
		}
	}, []);

	const finishWithOutput = useCallback(
		(text, { broadcast = false } = {}) => {
			setOutput(text);
			setProgress(100);
			setRunning(false);
			clearPoll();
			if (broadcast && socketRef.current) {
				socketRef.current.emit(ACTIONS.CODE_COMPILED, {
					roomId,
					socket_output: text,
				});
			}
		},
		[clearPoll, roomId, socketRef]
	);

	const checkStatus = useCallback(
		async (token) => {
			const apiKey = process.env.REACT_APP_JUDGEO_KEY;
			if (!apiKey) {
				finishWithOutput("Missing REACT_APP_JUDGEO_KEY in frontend/.env");
				toast.error("Judge0 API key is not configured");
				return;
			}

			try {
				const response = await axios.request({
					method: "GET",
					url: `${JUDGE0_URL}/${token}`,
					params: { base64_encoded: "true", fields: "*" },
					headers: {
						"X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
						"X-RapidAPI-Key": apiKey,
					},
				});

				const statusId = response.data.status?.id;
				if (statusId === 1 || statusId === 2) {
					setProgress((p) => Math.min(p + 10, 90));
					pollTimeoutRef.current = setTimeout(() => checkStatus(token), 1500);
					return;
				}

				const formatted = formatJudge0Result(response.data);
				finishWithOutput(formatted, { broadcast: true });
			} catch (err) {
				console.error(err);
				finishWithOutput("Failed to fetch compile status. Try again.");
				toast.error("Compile status check failed");
			}
		},
		[finishWithOutput]
	);

	const runCode = useCallback(async () => {
		const apiKey = process.env.REACT_APP_JUDGEO_KEY;
		if (!apiKey) {
			toast.error("Judge0 API key is not configured");
			setOutputOpen(true);
			setOutput("Set REACT_APP_JUDGEO_KEY in frontend/.env");
			return;
		}

		const source = getSourceCode?.() ?? "";
		if (!source.trim()) {
			toast.error("Write some code before running");
			return;
		}

		clearPoll();
		setOutputOpen(true);
		setRunning(true);
		setProgress(20);
		setOutput("Processing…");
		socketRef.current?.emit(ACTIONS.RUN_CODE, { roomId });

		try {
			const response = await axios.request({
				method: "POST",
				url: JUDGE0_URL,
				params: { base64_encoded: "true", fields: "*" },
				headers: {
					"content-type": "application/json",
					"X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
					"X-RapidAPI-Key": apiKey,
				},
				data: {
					language_id: languageId,
					source_code: btoa(unescape(encodeURIComponent(source))),
					stdin: "",
				},
			});

			setProgress(50);
			const token = response.data.token;
			if (!token) {
				finishWithOutput("Judge0 did not return a submission token.");
				return;
			}
			checkStatus(token);
		} catch (err) {
			const status = err.response?.status;
			let message = "Failed to submit code to Judge0.";
			if (status === 429) {
				message = "Judge0 quota exceeded for today (HTTP 429).";
			} else if (err.response?.data) {
				message = `Judge0 error: ${JSON.stringify(err.response.data)}`;
			}
			finishWithOutput(message);
			toast.error(message);
		}
	}, [
		checkStatus,
		clearPoll,
		finishWithOutput,
		getSourceCode,
		languageId,
		roomId,
		socketRef,
	]);

	const closeOutput = useCallback(() => {
		setOutputOpen(false);
		clearPoll();
		socketRef.current?.emit(ACTIONS.OUTPUT_CLOSED, { roomId });
	}, [clearPoll, roomId, socketRef]);

	const onRemoteRun = useCallback(() => {
		setOutputOpen(true);
		setOutput("Processing…");
		setProgress(30);
	}, []);

	const onRemoteOutputClosed = useCallback(() => {
		setOutputOpen(false);
	}, []);

	const onRemoteCompiled = useCallback((socket_output) => {
		setOutput(socket_output || "");
		setProgress(100);
		setRunning(false);
	}, []);

	return {
		outputOpen,
		output,
		progress,
		running,
		setProgress,
		runCode,
		closeOutput,
		onRemoteRun,
		onRemoteOutputClosed,
		onRemoteCompiled,
		clearPoll,
	};
}
