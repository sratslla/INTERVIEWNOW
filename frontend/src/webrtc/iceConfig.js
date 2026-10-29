/** Public STUN servers — enough for most same-network / simple NAT cases. */
export const ICE_CONFIG = {
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
		{ urls: "stun:stun1.l.google.com:19302" },
		{ urls: "stun:stun2.l.google.com:19302" },
	],
};
