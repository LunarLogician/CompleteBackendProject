// socket.js
const socketIo = require('socket.io');
const messageModel = require('../models/Message');

let io;

const initSocket = (server) => {
  io = socketIo(server);

  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("sendMessage", (data) => {
      const { app_id, from, to, message } = data;
      sendMessage(app_id, from, to, message, (err, newMessage) => {
        if (err) {
          socket.emit("messageError", "Error sending message");
          return;
        }
        io.emit("newMessage", newMessage); // Emit new message to all connected clients
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
};

const sendMessage = async (app_id, from, to, message, callback) => {
  try {
    // Attempt to create the message in the model
    const mess = await messageModel.create({
      app_id,
      from_user: from,
      to_user: to,
      message
    });

    // Check if message creation was successful
    if (!mess) {
      callback(new Error('Failed to create message in the model'), null);
      return;
    }

    // Message creation was successful, emit the new message and call the callback
    const newMessage = { app_id, from, to, message };
    callback(null, newMessage);
  } catch (error) {
    // Handle any errors during message creation
    callback(error, null);
  }
};

module.exports = { initSocket, io, sendMessage };
