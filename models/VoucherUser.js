// models/UserPicture.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VoucherUser = sequelize.define('VoucherUser', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  voucherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subscribeDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expiryDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
});

module.exports = VoucherUser;
