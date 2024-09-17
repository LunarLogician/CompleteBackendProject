// models/UserPicture.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPicture = sequelize.define('UserPicture', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = UserPicture;
