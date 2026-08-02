import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const rooms = new Map();

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function livekitUrl() {
  return String(process.env.LIVEKIT_URL || "")
    .trim()
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
}

function makeToken(roomCode, username) {
  const apiKey = String(process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = String(process.env.LIVEKIT_API_SECRET || "").trim();
  const url = livekitUrl();

  if (!apiKey || !apiSecret || !url) {
    throw new Error("LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET eksik");
  }

  const now = Math.floor(Date.now() / 1000);
  const identity = `${username}-${crypto.randomUUID()}`;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: apiKey,
    sub: identity,
    name: username,
    nbf: now - 5,
    exp: now + 21600,
    video: {
      roomJoin: true,
      room: roomCode,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };

  const body = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.createHmac("sha256", apiSecret).update(body).digest("base64url");

  return {
    token: `${body}.${sig}`,
    identity
  };
}

function getUsername(req) {
  return String(
    req.body?.username ||
    req.body?.name ||
    req.body?.participantName ||
    req.query?.username ||
    "Oyuncu"
  ).trim();
}

function getCode(req) {
  return String(
    req.params?.code ||
    req.body?.roomCode ||
    req.body?.room_code ||
    req.body?.roomName ||
    req.body?.code ||
    req.body?.room ||
    req.query?.roomCode ||
    req.query?.code ||
    ""
  ).trim();
}

function response(roomCode, username) {
  const made = makeToken(roomCode, username);
  const url = livekitUrl();

  return {
    ok: true,
    success: true,

    roomCode: roomCode,
    room_code: roomCode,
    roomName: roomCode,
    room: roomCode,
    code: roomCode,

    serverUrl: url,
    server_url: url,
    livekitUrl: url,
    liveKitUrl: url,
    url: url,

    participantToken: made.token,
    participant_token: made.token,
    accessToken: made.token,
    token: made.token,

    participantIdentity: made.identity,
    identity: made.identity,
    username: username
  };
}

function createRoom(req, res) {
  const username = getUsername(req);

  let code;
  do {
    code = String(crypto.randomInt(100000, 1000000));
  } while (rooms.has(code));

  rooms.set(code, new Set([username]));

  res.json(response(code, username));
}

function joinRoom(req, res) {
  const username = getUsername(req);
  const code = getCode(req);

  if (!code) {
    return res.status(400).json({
      ok: false,
      error: "Oda kodu eksik"
    });
  }

  if (!rooms.has(code)) {
    rooms.set(code, new Set());
  }

  const room = rooms.get(code);

  if (!room.has(username) && room.size >= 4) {
    return res.status(409).json({
      ok: false,
      error: "Oda dolu"
    });
  }

  room.add(username);

  res.json(response(code, username));
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "OyunSesi Backend",
    status: "live"
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/create", createRoom);
app.post("/create-room", createRoom);
app.post("/room/create", createRoom);
app.post("/rooms/create", createRoom);
app.post("/api/create", createRoom);
app.post("/api/create-room", createRoom);
app.post("/api/room/create", createRoom);
app.post("/api/rooms/create", createRoom);
app.post("/rooms", createRoom);
app.post("/api/rooms", createRoom);

app.post("/join", joinRoom);
app.post("/join-room", joinRoom);
app.post("/room/join", joinRoom);
app.post("/rooms/join", joinRoom);
app.post("/api/join", joinRoom);
app.post("/api/join-room", joinRoom);
app.post("/api/room/join", joinRoom);
app.post("/api/rooms/join", joinRoom);

app.post("/rooms/:code/join", joinRoom);
app.post("/api/rooms/:code/join", joinRoom);
app.post("/join/:code", joinRoom);
app.post("/api/join/:code", joinRoom);

app.post("/token", joinRoom);
app.post("/getToken", joinRoom);
app.post("/api/token", joinRoom);
app.post("/api/getToken", joinRoom);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route bulunamadi",
    path: req.path
  });
});

app.use((err, req, res, next) => {
  res.status(500).json({
    ok: false,
    error: err.message
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("OyunSesi backend calisiyor");
});
