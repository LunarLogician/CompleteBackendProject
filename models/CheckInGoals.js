// models/UserCheckIn.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CheckInGoals = sequelize.define('CheckInGoals', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  goal: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = CheckInGoals;
