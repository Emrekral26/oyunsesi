import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rooms = new Map();

function b64(data) {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function getLivekitUrl() {
  return String(process.env.LIVEKIT_URL || "")
    .trim()
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
}

function makeToken(roomCode, username) {
  const apiKey = String(process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = String(process.env.LIVEKIT_API_SECRET || "").trim();
  const serverUrl = getLivekitUrl();

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit ayarlari eksik");
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

  const unsigned = `${b64(header)}.${b64(payload)}`;

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(unsigned)
    .digest("base64url");

  return {
    token: `${unsigned}.${signature}`,
    identity
  };
}

function getUsername(req) {
  return String(
    req.body?.username ||
    req.body?.name ||
    req.body?.participantName ||
    req.query?.username ||
    req.query?.name ||
    "Oyuncu"
  ).trim();
}

function getRoomCode(req) {
  return String(
    req.params?.code ||
    req.body?.roomCode ||
    req.body?.room_code ||
    req.body?.roomName ||
    req.body?.room ||
    req.body?.code ||
    req.query?.roomCode ||
    req.query?.room_code ||
    req.query?.roomName ||
    req.query?.room ||
    req.query?.code ||
    ""
  ).trim();
}

function buildResponse(roomCode, username) {
  const made = makeToken(roomCode, username);
  const serverUrl = getLivekitUrl();

  return {
    ok: true,
    success: true,

    roomCode,
    room_code: roomCode,
    roomName: roomCode,
    room: roomCode,
    code: roomCode,

    serverUrl,
    server_url: serverUrl,
    livekitUrl: serverUrl,
    liveKitUrl: serverUrl,
    url: serverUrl,

    participantToken: made.token,
    participant_token: made.token,
    accessToken: made.token,
    token: made.token,

    participantIdentity: made.identity,
    identity: made.identity,
    username
  };
}

function createRoom(req, res) {
  const username = getUsername(req);

  let roomCode;
  do {
    roomCode = String(crypto.randomInt(100000, 1000000));
  } while (rooms.has(roomCode));

  rooms.set(roomCode, new Set([username]));

  res.json(buildResponse(roomCode, username));
}

function joinRoom(req, res) {
  const username = getUsername(req);
  const roomCode = getRoomCode(req);

  if (!roomCode) {
    return res.status(400).json({
      ok: false,
      error: "Oda kodu eksik"
    });
  }

  if (!rooms.has(roomCode)) {
    return res.status(404).json({
      ok: false,
      error: "Oda bulunamadi"
    });
  }

  const room = rooms.get(roomCode);

  if (!room.has(username) && room.size >= 4) {
    return res.status(409).json({
      ok: false,
      error: "Oda dolu"
    });
  }

  room.add(username);

  res.json(buildResponse(roomCode, username));
}

function tokenOnly(req, res) {
  const username = getUsername(req);
  const roomCode = getRoomCode(req) || String(crypto.randomInt(100000, 1000000));

  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }

  rooms.get(roomCode).add(username);

  res.json(buildResponse(roomCode, username));
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

const createRoutes = [
  "/create",
  "/create-room",
  "/room/create",
  "/rooms/create",
  "/api/create",
  "/api/create-room",
  "/api/room/create",
  "/api/rooms/create",
  "/rooms",
  "/api/rooms"
];

const joinRoutes = [
  "/join",
  "/join-room",
  "/room/join",
  "/rooms/join",
  "/api/join",
  "/api/join-room",
  "/api/room/join",
  "/api/rooms/join"
];

const tokenRoutes = [
  "/token",
  "/getToken",
  "/get-token",
  "/api/token",
  "/api/getToken",
  "/api/get-token"
];

for (const route of createRoutes) {
  app.get(route, createRoom);
  app.post(route, createRoom);
}

for (const route of joinRoutes) {
  app.get(route, joinRoom);
  app.post(route, joinRoom);
}

for (const route of tokenRoutes) {
  app.get(route, tokenOnly);
  app.post(route, tokenOnly);
}

app.get("/rooms/:code/join", joinRoom);
app.post("/rooms/:code/join", joinRoom);
app.get("/api/rooms/:code/join", joinRoom);
app.post("/api/rooms/:code/join", joinRoom);
app.get("/join/:code", joinRoom);
app.post("/join/:code", joinRoom);
app.get("/api/join/:code", joinRoom);
app.post("/api/join/:code", joinRoom);

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
