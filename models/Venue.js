// models/Venue.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venue = sequelize.define('Venue', {
  venueId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  placeId: {
    type: DataTypes.STRING,
    unique: true,
  },
  totalCheckIns: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = Venue;
