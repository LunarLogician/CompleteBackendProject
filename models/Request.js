const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Request = sequelize.define("Request", {
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    onDelete: 'CASCADE',
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    onDelete: 'CASCADE',
  },
  request_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  request_status: {
    type: DataTypes.STRING,
    defaultValue: "pending",
  },
});

module.exports = Request;