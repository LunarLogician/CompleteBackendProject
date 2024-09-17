const { Op } = require("sequelize");
const User = require("../models/User");
const Message = require("../models/Message");
const { sendMessage } = require("../config/socket");
const DBController = require("./dbController");

exports.sendmessage = async (req, res) => {
  try {
    const { app_id, from, to, message } = req.body;

    if (!app_id || !from || !to || !message) {
      return res
        .status(400)
        .json({ status: false, message: "Incomplete Fields Sent" });
    }

    const user1Exists = await User.findOne({ where: { UId: from } });
    const user2Exists = await User.findOne({ where: { UId: to } });

    if (user1Exists && user2Exists) {

      sendMessage(app_id, user1Exists.id, user2Exists.id, message, (err, newMessage) => {
        if (err) {
          return res
            .status(500)
            .json({
              status: false,
              message: "Could not send Message",
              error: err.message,
            });
        }
        res.status(200).json({
          status: "true",
          message: "Message Sent Successfully",
          newMessage,
        });
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "One or both users not found",
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({
        status: false,
        message: "Error Sending the Message",
        error: error.message,
      });
  }
};

//getting messages between 2 users
exports.getMessages = async (req, res) => {
  try {
    const { app_id, user1, user2 } = req.query;

    const user1Exists = await User.findOne({ where: { UId: user1 } });
    const user2Exists = await User.findOne({ where: { UId: user2 } });

    if (!user1Exists || !user2Exists) {
      return res.status(404).json({
        status: false,
        message: "One or both users not found",
      });
    }

    const messages = await Message.findAll({
      where: {
        app_id,
        [Sequelize.Op.or]: [
          { from_user: user1Exists.id, to_user: user2Exists.id },
          { from_user: user2Exists.id, to_user: user1Exists.id },
        ],
      },
      order: [["timestamp", "ASC"]],
    });

    if (messages.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Messages fetched successfully",
        messages,
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "No messages exist between these users",
        messages,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Could not fetch messages",
      error: error.message,
    });
  }
};

exports.getRecentMessages = async (req, res) => {
  try {
    const { app_id, user_id } = req.query;

    const userExists = await User.findOne({ where: { UId: user_id } });

    if (!userExists) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const query = `
      SELECT from_user, to_user, message, timestamp
      FROM (
        SELECT 
          m.from_user, m.to_user, m.message, m.timestamp,
          ROW_NUMBER() OVER (PARTITION BY LEAST(m.from_user, m.to_user), GREATEST(m.from_user, m.to_user) ORDER BY m.timestamp DESC) AS rn
        FROM Messages m
        WHERE m.app_id = ? AND (m.from_user = ? OR m.to_user = ?)
      ) AS recent_messages
      WHERE rn = 1
      ORDER BY timestamp DESC;
    `;

    const messages = await DBController.queryDb(query, [app_id, userExists.id, userExists.id]);

    if (messages.length > 0) {
      const userPromises = messages.map(async (message) => {
        const userQuery = `SELECT * FROM User WHERE id = ?`;
        if (user_id == message.from_user) {
          const user = await DBController.queryDb(userQuery, [message.to_user]);
          return {
            ...message,
            user: user[0],
          };
        } else {
          const user = await DBController.queryDb(userQuery, [message.from_user]);
          return {
            ...message,
            user: user[0],
          };
        }
      });

      const messagesWithUsers = await Promise.all(userPromises);

      return res.status(200).json({
        status: true,
        message: "Messages fetched successfully",
        messages: messagesWithUsers,
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "No recent messages exist for this user",
        messages: [],
      });
    }
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({
      status: false,
      message: "Could not fetch messages",
      error: error.message,
    });
  }
};