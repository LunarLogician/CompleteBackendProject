// models/UserCheckIn.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserCheckIn = sequelize.define('UserCheckIn', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  venueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = UserCheckIn;
