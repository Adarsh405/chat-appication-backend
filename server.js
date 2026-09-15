const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
  })
);

app.use(express.json());

// ======================================================
// SOCKET.IO
// ======================================================

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ======================================================
// ROUTES
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "Communication App Backend is running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// ======================================================
// HELPERS
// ======================================================

const VALID_CALL_TYPES = ["voice", "video"];

const isValidCallType = (callType) => {
  return VALID_CALL_TYPES.includes(callType);
};

const getUserRoom = (userId) => {
  return `user_${String(userId)}`;
};

const normalizeId = (id) => {
  return id ? String(id) : "";
};

// ======================================================
// SOCKET CONNECTION
// ======================================================

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // ====================================================
  // JOIN USER ROOM
  // ====================================================

  socket.on("join", (userId) => {
    const normalizedUserId = normalizeId(userId);

    if (!normalizedUserId) {
      console.log("⚠️ Join rejected: userId missing");
      return;
    }

    const room = getUserRoom(normalizedUserId);

    socket.join(room);
    socket.userId = normalizedUserId;

    console.log(
      `👤 User ${normalizedUserId} joined ${room}`
    );
  });

  // ====================================================
  // CHAT MESSAGE
  // ====================================================

  socket.on("send_message", (data = {}) => {
    const {
      senderId,
      receiverId,
      message,
    } = data;

    if (!senderId || !receiverId || !message) {
      return;
    }

    io.to(getUserRoom(receiverId)).emit(
      "receive_message",
      {
        senderId: normalizeId(senderId),
        receiverId: normalizeId(receiverId),
        message,
      }
    );
  });

  // ====================================================
  // START CALL
  // ====================================================

  socket.on("call_user", (data = {}) => {
    const {
      callerId,
      receiverId,
      callerName,
      callerAvatar,
      callType,
    } = data;

    const actualCallerId =
      socket.userId || normalizeId(callerId);

    const actualReceiverId =
      normalizeId(receiverId);

    if (!actualCallerId || !actualReceiverId) {
      console.log("⚠️ Call rejected: missing user ID");
      return;
    }

    if (!isValidCallType(callType)) {
      console.log(
        `⚠️ Call rejected: invalid type ${callType}`
      );
      return;
    }

    // Prevent calling yourself
    if (actualCallerId === actualReceiverId) {
      console.log(
        `⚠️ Self-call blocked: ${actualCallerId}`
      );
      return;
    }

    console.log(
      `📞 ${callType}: ${actualCallerId} -> ${actualReceiverId}`
    );

    io.to(getUserRoom(actualReceiverId)).emit(
      "incoming_call",
      {
        callerId: actualCallerId,
        receiverId: actualReceiverId,
        callerName: callerName || "Unknown",
        callerAvatar: callerAvatar || null,
        callType,
      }
    );
  });

  // ====================================================
  // CALL ACCEPTED
  // ====================================================

  socket.on("call_accepted", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    const actualReceiverId =
      socket.userId || normalizeId(receiverId);

    const actualCallerId =
      normalizeId(callerId);

    if (!actualCallerId || !actualReceiverId) {
      return;
    }

    if (!isValidCallType(callType)) {
      return;
    }

    console.log(
      `✅ ${callType} accepted: ${actualReceiverId} -> ${actualCallerId}`
    );

    io.to(getUserRoom(actualCallerId)).emit(
      "call_accepted",
      {
        callerId: actualCallerId,
        receiverId: actualReceiverId,
        callType,
      }
    );
  });

  // ====================================================
  // CALL REJECTED
  // ====================================================

  socket.on("call_rejected", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    const actualReceiverId =
      socket.userId || normalizeId(receiverId);

    const actualCallerId =
      normalizeId(callerId);

    if (!actualCallerId || !actualReceiverId) {
      return;
    }

    if (!isValidCallType(callType)) {
      return;
    }

    console.log(
      `❌ ${callType} rejected: ${actualReceiverId} -> ${actualCallerId}`
    );

    io.to(getUserRoom(actualCallerId)).emit(
      "call_rejected",
      {
        callerId: actualCallerId,
        receiverId: actualReceiverId,
        callType,
      }
    );
  });

  // ====================================================
  // CALL BUSY
  // ====================================================

  socket.on("call_busy", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    const actualReceiverId =
      socket.userId || normalizeId(receiverId);

    const actualCallerId =
      normalizeId(callerId);

    if (!actualCallerId || !actualReceiverId) {
      return;
    }

    if (!isValidCallType(callType)) {
      return;
    }

    io.to(getUserRoom(actualCallerId)).emit(
      "call_busy",
      {
        callerId: actualCallerId,
        receiverId: actualReceiverId,
        callType,
      }
    );
  });

  // ====================================================
  // WEBRTC OFFER
  // ====================================================

  socket.on("webrtc_offer", (data = {}) => {
    const {
      callerId,
      receiverId,
      offer,
      callType,
    } = data;

    const actualCallerId =
      socket.userId || normalizeId(callerId);

    const actualReceiverId =
      normalizeId(receiverId);

    if (
      !actualCallerId ||
      !actualReceiverId ||
      !offer
    ) {
      console.log("⚠️ Invalid WebRTC offer");
      return;
    }

    if (!isValidCallType(callType)) {
      console.log(
        `⚠️ Invalid offer type: ${callType}`
      );
      return;
    }

    if (actualCallerId === actualReceiverId) {
      console.log("⚠️ Self-call WebRTC offer blocked");
      return;
    }

    console.log(
      `📤 WebRTC ${callType} offer: ${actualCallerId} -> ${actualReceiverId}`
    );

    io.to(getUserRoom(actualReceiverId)).emit(
      "webrtc_offer",
      {
        callerId: actualCallerId,
        receiverId: actualReceiverId,
        offer,
        callType,
      }
    );
  });

  // ====================================================
  // WEBRTC ANSWER
  // ====================================================

  socket.on("webrtc_answer", (data = {}) => {
    const {
      callerId,
      receiverId,
      answer,
      callType,
    } = data;

    const actualReceiverId =
      socket.userId || normalizeId(callerId);

    const actualCallerId =
      normalizeId(receiverId);

    if (
      !actualCallerId ||
      !actualReceiverId ||
      !answer
    ) {
      console.log("⚠️ Invalid WebRTC answer");
      return;
    }

    if (!isValidCallType(callType)) {
      console.log(
        `⚠️ Invalid answer type: ${callType}`
      );
      return;
    }

    console.log(
      `📥 WebRTC ${callType} answer: ${actualReceiverId} -> ${actualCallerId}`
    );

    io.to(getUserRoom(actualCallerId)).emit(
      "webrtc_answer",
      {
        callerId: actualReceiverId,
        receiverId: actualCallerId,
        answer,
        callType,
      }
    );
  });

  // ====================================================
  // WEBRTC ICE CANDIDATE
  // ====================================================

  socket.on(
    "webrtc_ice_candidate",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        candidate,
        callType,
      } = data;

      const actualCallerId =
        socket.userId || normalizeId(callerId);

      const actualReceiverId =
        normalizeId(receiverId);

      if (
        !actualCallerId ||
        !actualReceiverId ||
        !candidate
      ) {
        return;
      }

      if (!isValidCallType(callType)) {
        return;
      }

      io.to(getUserRoom(actualReceiverId)).emit(
        "webrtc_ice_candidate",
        {
          callerId: actualCallerId,
          receiverId: actualReceiverId,
          candidate,
          callType,
        }
      );
    }
  );

  // ====================================================
  // END CALL
  // ====================================================

  socket.on("end_call", (data = {}) => {
    const {
      callerId,
      receiverId,
      callType,
    } = data;

    const actualCallerId =
      socket.userId || normalizeId(callerId);

    const actualReceiverId =
      normalizeId(receiverId);

    if (
      !actualCallerId ||
      !actualReceiverId
    ) {
      return;
    }

    if (!isValidCallType(callType)) {
      return;
    }

    console.log(
      `📴 Ending ${callType}: ${actualCallerId} -> ${actualReceiverId}`
    );

    io.to(getUserRoom(actualReceiverId)).emit(
      "call_ended",
      {
        callerId: actualCallerId,
        receiverId: actualReceiverId,
        callType,
      }
    );
  });

  // ====================================================
  // DISCONNECT
  // ====================================================

  socket.on("disconnect", (reason) => {
    console.log(
      "🔌 Socket disconnected:",
      socket.id,
      reason
    );

    if (socket.userId) {
      console.log(
        `👤 User ${socket.userId} disconnected`
      );
    }
  });
});

// ======================================================
// ERROR HANDLING
// ======================================================

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

// ======================================================
// START SERVER
// ======================================================

server.listen(PORT, () => {
  console.log("======================================");
  console.log("🚀 COMMUNICATION APP SERVER");
  console.log("======================================");
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Client: ${CLIENT_URL}`);
  console.log("📞 Voice calls: ENABLED");
  console.log("📹 Video calls: ENABLED");
  console.log("🔌 Socket.IO: ENABLED");
  console.log("======================================");
});
