const pool = require("../config/db");

const getConversation = async (user1, user2) => {
  let result = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE (user1_id = $1 AND user2_id = $2)
       OR (user1_id = $2 AND user2_id = $1)
    `,
    [user1, user2]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  result = await pool.query(
    `
    INSERT INTO conversations (user1_id, user2_id)
    VALUES ($1, $2)
    RETURNING *
    `,
    [user1, user2]
  );

  return result.rows[0];
};

const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = Number(req.params.userId);

    const conversation = await getConversation(
      currentUserId,
      otherUserId
    );

    const result = await pool.query(
      `
      SELECT
        messages.id,
        messages.message,
        messages.created_at,
        messages.sender_id,
        users.name AS sender_name
      FROM messages
      JOIN users
        ON users.id = messages.sender_id
      WHERE conversation_id = $1
      ORDER BY messages.created_at ASC
      `,
      [conversation.id]
    );

    res.json({
      conversationId: conversation.id,
      messages: result.rows,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const receiverId = Number(req.params.userId);
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Message cannot be empty",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "You cannot message yourself",
      });
    }

    const conversation = await getConversation(
      senderId,
      receiverId
    );

    const result = await pool.query(
      `
      INSERT INTO messages
        (conversation_id, sender_id, message)
      VALUES
        ($1, $2, $3)
      RETURNING id, conversation_id, sender_id, message, created_at
      `,
      [
        conversation.id,
        senderId,
        message.trim(),
      ]
    );

    res.status(201).json({
      message: result.rows[0],
    });
  } catch (error) {
    console.error("Send message error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
};