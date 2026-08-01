import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const rooms = new Map();

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

function getServerUrl() {
  const url = String(process.env.LIVEKIT_URL || "").trim();
  return url.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

function createToken(roomCode, username) {
  const key = String(process.env.LIVEKIT_API_KEY || "").trim();
  const secret = String(process.env.LIVEKIT_API_SECRET || "").trim();

  if (!key || !secret || !getServerUrl()) {
    throw new Error("LiveKit Environment Variables eksik");
  }

  const now = Math.floor(Date.now() / 1000);
  const identity = `${username}-${crypto.randomUUID()}`;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: key,
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

  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");

  return { token: `${unsigned}.${signature}`, identity };
}

function result(roomCode, username) {
  const { token, identity } = createToken(roomCode, username);
  const url = getServerUrl();

  return {
    ok: true,
    roomCode, room_code: roomCode, roomName: roomCode,
    room: roomCode, code: roomCode,
    serverUrl: url, server_url: url,
    livekitUrl: url, liveKitUrl: url, url,
    participantToken: token, participant_token: token,
    accessToken: token, token,
    participantIdentity: identity,
    participantName: username
  };
}

function username(req) {
  return String(req.body?.username || req.body?.participantName ||
    req.body?.name || req.query?.username || "Oyuncu").trim();
}

function roomCode(req) {
  return String(req.params?.code || req.body?.roomCode ||
    req.body?.room_code || req.body?.roomName ||
    req.body?.code || req.query?.roomCode || "").trim();
}

function createRoom(req, res) {
  let code;
  do code = String(crypto.randomInt(100000, 1000000));
  while (rooms.has(code));

  rooms.set(code, new Set([username(req)]));
  res.json(result(code, username(req)));
}

function joinRoom(req, res) {
  const code = roomCode(req);
  if (!code) return res.status(400).json({ error: "Oda kodu eksik" });

  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: "Oda bulunamadı" });
  if (!room.has(username(req)) && room.size >= 4)
    return res.status(409).json({ error: "Oda dolu" });

  room.add(username(req));
  res.json(result(code, username(req)));
}

app.get("/", (_, res) => res.json({ ok: true, app: "OyunSesi Backend" }));
app.get(["/health", "/api/health"], (_, res) => res.json({ ok: true }));

app.post(["/rooms", "/rooms/create", "/api/rooms", "/api/rooms/create",
  "/create-room", "/api/create-room", "/room/create"], createRoom);

app.post(["/rooms/join", "/api/rooms/join", "/join-room",
  "/api/join-room", "/room/join"], joinRoom);

app.post(["/rooms/:code/join", "/api/rooms/:code/join"], joinRoom);
app.post(["/getToken", "/api/getToken", "/token"], (req, res) => {
  const code = roomCode(req) || String(crypto.randomInt(100000, 1000000));
  res.json(result(code, username(req)));
});

app.use((error, req, res, next) =>
  res.status(500).json({ error: error.message }));

app.listen(process.env.PORT || 3000, () =>
  console.log("OyunSesi backend calisiyor"));
