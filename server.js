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
    message:
      "Communication App Backend is running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// ======================================================
// HELPER FUNCTIONS
// ======================================================

const validCallTypes = [
  "voice",
  "video",
];

const isValidCallType = (callType) => {
  return validCallTypes.includes(callType);
};

const getUserRoom = (userId) => {
  return `user_${String(userId)}`;
};

// ======================================================
// SOCKET CONNECTION
// ======================================================

io.on("connection", (socket) => {
  console.log(
    "🔌 Socket connected:",
    socket.id
  );

  // ====================================================
  // JOIN USER ROOM
  // ====================================================

  socket.on("join", (userId) => {
    if (!userId) {
      console.log(
        "⚠️ Join rejected: userId missing"
      );

      return;
    }

    const normalizedUserId =
      String(userId);

    const room =
      getUserRoom(normalizedUserId);

    socket.join(room);

    socket.userId =
      normalizedUserId;

    console.log(
      `👤 User ${normalizedUserId} joined ${room}`
    );
  });

  // ====================================================
  // CHAT MESSAGE
  // ====================================================

  socket.on(
    "send_message",
    (data = {}) => {
      const {
        senderId,
        receiverId,
        message,
      } = data;

      if (
        !senderId ||
        !receiverId ||
        !message
      ) {
        return;
      }

      io.to(
        getUserRoom(receiverId)
      ).emit(
        "receive_message",
        {
          senderId,
          receiverId,
          message,
        }
      );
    }
  );

  // ====================================================
  // START CALL
  // ====================================================

  socket.on(
    "call_user",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        callerName,
        callerAvatar,
        callType,
      } = data;

      if (
        !receiverId ||
        !callType
      ) {
        console.log(
          "⚠️ Invalid call request"
        );

        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        console.log(
          `⚠️ Invalid call type: ${callType}`
        );

        return;
      }

      // Prefer the authenticated/joined socket user ID.
      const actualCallerId =
        socket.userId ||
        String(callerId || "");

      if (!actualCallerId) {
        console.log(
          "⚠️ Caller ID missing"
        );

        return;
      }

      const normalizedReceiverId =
        String(receiverId);

      if (
        actualCallerId ===
        normalizedReceiverId
      ) {
        return;
      }

      console.log(
        `📞 ${callType} call: ${actualCallerId} -> ${normalizedReceiverId}`
      );

      io.to(
        getUserRoom(
          normalizedReceiverId
        )
      ).emit(
        "incoming_call",
        {
          callerId:
            actualCallerId,

          receiverId:
            normalizedReceiverId,

          callerName:
            callerName || "Unknown",

          callerAvatar:
            callerAvatar || null,

          callType,
        }
      );
    }
  );

  // ====================================================
  // CALL ACCEPTED
  // ====================================================

  socket.on(
    "call_accepted",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        callType,
      } = data;

      if (
        !callerId ||
        !receiverId ||
        !callType
      ) {
        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        return;
      }

      const actualReceiverId =
        socket.userId ||
        String(receiverId);

      console.log(
        `✅ ${callType} call accepted: ${callerId} -> ${actualReceiverId}`
      );

      io.to(
        getUserRoom(callerId)
      ).emit(
        "call_accepted",
        {
          callerId:
            String(callerId),

          receiverId:
            actualReceiverId,

          callType,
        }
      );
    }
  );

  // ====================================================
  // CALL REJECTED
  // ====================================================

  socket.on(
    "call_rejected",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        callType,
      } = data;

      if (
        !callerId ||
        !receiverId ||
        !callType
      ) {
        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        return;
      }

      const actualReceiverId =
        socket.userId ||
        String(receiverId);

      console.log(
        `❌ ${callType} call rejected`
      );

      io.to(
        getUserRoom(callerId)
      ).emit(
        "call_rejected",
        {
          callerId:
            String(callerId),

          receiverId:
            actualReceiverId,

          callType,
        }
      );
    }
  );

  // ====================================================
  // CALL BUSY
  // ====================================================

  socket.on(
    "call_busy",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        callType,
      } = data;

      if (
        !callerId ||
        !receiverId ||
        !callType
      ) {
        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        return;
      }

      const actualReceiverId =
        socket.userId ||
        String(receiverId);

      console.log(
        `📵 ${callType} call busy`
      );

      io.to(
        getUserRoom(callerId)
      ).emit(
        "call_busy",
        {
          callerId:
            String(callerId),

          receiverId:
            actualReceiverId,

          callType,
        }
      );
    }
  );

  // ====================================================
  // WEBRTC OFFER
  // ====================================================

  socket.on(
    "webrtc_offer",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        offer,
        callType,
      } = data;

      if (
        !receiverId ||
        !offer ||
        !callType
      ) {
        console.log(
          "⚠️ Invalid WebRTC offer"
        );

        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        console.log(
          `⚠️ Invalid WebRTC offer type: ${callType}`
        );

        return;
      }

      const actualCallerId =
        socket.userId ||
        String(callerId || "");

      if (!actualCallerId) {
        return;
      }

      console.log(
        `📤 WebRTC ${callType} offer: ${actualCallerId} -> ${receiverId}`
      );

      io.to(
        getUserRoom(receiverId)
      ).emit(
        "webrtc_offer",
        {
          callerId:
            actualCallerId,

          receiverId:
            String(receiverId),

          offer,

          callType,
        }
      );
    }
  );

  // ====================================================
  // WEBRTC ANSWER
  // ====================================================

  socket.on(
    "webrtc_answer",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        answer,
        callType,
      } = data;

      if (
        !receiverId ||
        !answer ||
        !callType
      ) {
        console.log(
          "⚠️ Invalid WebRTC answer"
        );

        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        console.log(
          `⚠️ Invalid WebRTC answer type: ${callType}`
        );

        return;
      }

      const actualReceiverId =
        socket.userId ||
        String(callerId || "");

      console.log(
        `📥 WebRTC ${callType} answer -> ${receiverId}`
      );

      io.to(
        getUserRoom(receiverId)
      ).emit(
        "webrtc_answer",
        {
          callerId:
            actualReceiverId,

          receiverId:
            String(receiverId),

          answer,

          callType,
        }
      );
    }
  );

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

      if (
        !receiverId ||
        !candidate ||
        !callType
      ) {
        return;
      }

      if (
        !isValidCallType(callType)
      ) {
        return;
      }

      const actualCallerId =
        socket.userId ||
        String(callerId || "");

      if (!actualCallerId) {
        return;
      }

      io.to(
        getUserRoom(receiverId)
      ).emit(
        "webrtc_ice_candidate",
        {
          callerId:
            actualCallerId,

          receiverId:
            String(receiverId),

          candidate,

          callType,
        }
      );
    }
  );

  // ====================================================
  // END CALL
  // ====================================================

  socket.on(
    "end_call",
    (data = {}) => {
      const {
        callerId,
        receiverId,
        callType,
      } = data;

      if (!receiverId) {
        return;
      }

      if (
        callType &&
        !isValidCallType(callType)
      ) {
        return;
      }

      const actualCallerId =
        socket.userId ||
        String(callerId || "");

      console.log(
        `📴 Ending ${
          callType || "unknown"
        } call: ${actualCallerId} -> ${receiverId}`
      );

      io.to(
        getUserRoom(receiverId)
      ).emit(
        "call_ended",
        {
          callerId:
            actualCallerId,

          receiverId:
            String(receiverId),

          callType:
            callType || null,
        }
      );
    }
  );

  // ====================================================
  // DISCONNECT
  // ====================================================

  socket.on(
    "disconnect",
    (reason) => {
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
    }
  );
});

// ======================================================
// ERROR HANDLING
// ======================================================

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

// ======================================================
// START SERVER
// ======================================================

server.listen(
  PORT,
  () => {
    console.log(
      "======================================"
    );

    console.log(
      "🚀 COMMUNICATION APP SERVER"
    );

    console.log(
      "======================================"
    );

    console.log(
      `📡 Port: ${PORT}`
    );

    console.log(
      `🌐 Client: ${CLIENT_URL}`
    );

    console.log(
      "📞 Voice calls: ENABLED"
    );

    console.log(
      "📹 Video calls: ENABLED"
    );

    console.log(
      "🔌 Socket.IO: ENABLED"
    );

    console.log(
      "======================================"
    );
  }
);
