# InterviewNow

Collaborative coding interviews: live editor, video (WebRTC), chat, whiteboard, and Judge0 code execution.

## Stack

- **Frontend:** React (CRA), CodeMirror, simple-peer, Socket.IO client
- **Backend:** Express + Socket.IO signaling / presence
- **Scale (optional):** Redis + `@socket.io/redis-adapter`
- **Code run:** Judge0 CE via RapidAPI

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

`REDIS_URL` is optional. Without it the server uses in-memory presence (fine for one instance).

### Frontend

```bash
cd frontend
cp .env.example .env
# set REACT_APP_BACKEND_URL and REACT_APP_JUDGEO_KEY
npm install
npm start
```

Open `http://localhost:3000`, create a room, share the room ID.

## Features

1. **Video call** — mesh WebRTC with mic/cam toggles, STUN, and cleanup on leave
2. **Collaborative editor** — realtime CodeMirror sync + language switch (JS / Go / Python / C++ / Java)
3. **Chat** — room messaging
4. **Whiteboard** — shared canvas (no self-echo)
5. **Run code** — Judge0 with proper error / stdout / stderr handling
6. **Resizable sidebar** — drag the handle between editor and video/chat

## Health check

`GET http://localhost:5000/health` → `{ ok, redis, store }`

## Load testing

See `load-testing/load-test.js` (set the server URL first). Stresses join + chat, not WebRTC media.
