import { Buffer } from "buffer";
import process from "process";

if (typeof window !== "undefined") {
	window.Buffer = window.Buffer || Buffer;
	window.process = window.process || process;
}

export {};
