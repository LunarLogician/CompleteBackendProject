const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Message = sequelize.define("Message", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    app_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    from_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    to_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
  });
  
  module.exports = Message;