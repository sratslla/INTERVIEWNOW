import React, { useEffect, useRef } from "react";
import "./Editor.css";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/blackboard.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/go/go";
import "codemirror/mode/clike/clike";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../../Actions";

const Editor = ({
	socketRef,
	socketReady,
	roomId,
	languageMode,
	onCodeChange,
}) => {
	const editorRef = useRef(null);
	const textareaRef = useRef(null);

	useEffect(() => {
		if (!textareaRef.current || editorRef.current) return undefined;

		editorRef.current = Codemirror.fromTextArea(textareaRef.current, {
			mode: { name: languageMode || "javascript", json: true },
			theme: "blackboard",
			autoCloseTags: true,
			autoCloseBrackets: true,
			lineNumbers: true,
			lineWrapping: true,
		});

		editorRef.current.on("change", (instance, changes) => {
			const { origin } = changes;
			const code = instance.getValue();
			onCodeChange?.(code);
			if (origin !== "setValue" && socketRef.current) {
				socketRef.current.emit(ACTIONS.CODE_CHANGE, {
					roomId,
					code,
				});
			}
		});

		return () => {
			if (editorRef.current) {
				editorRef.current.toTextArea();
				editorRef.current = null;
			}
		};
		// Mount once; language updates handled below
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!editorRef.current || !languageMode) return;
		editorRef.current.setOption("mode", { name: languageMode, json: true });
	}, [languageMode]);

	useEffect(() => {
		const socket = socketRef.current;
		if (!socketReady || !socket) return undefined;

		const onCodeChangeEvent = ({ code }) => {
			if (code == null || !editorRef.current) return;
			const current = editorRef.current.getValue();
			if (current !== code) {
				editorRef.current.setValue(code);
			}
		};

		socket.on(ACTIONS.CODE_CHANGE, onCodeChangeEvent);
		return () => {
			socket.off(ACTIONS.CODE_CHANGE, onCodeChangeEvent);
		};
	}, [socketReady, socketRef, roomId]);

	return <textarea ref={textareaRef} id="realtimeEditor" />;
};

export default Editor;
