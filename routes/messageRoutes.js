const express = require("express");

const {
  getMessages,
  sendMessage,
} = require("../controllers/messageController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/:userId",
  authMiddleware,
  getMessages
);

router.post(
  "/:userId",
  authMiddleware,
  sendMessage
);

module.exports = router;