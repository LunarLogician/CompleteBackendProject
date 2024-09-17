const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeletedUser = sequelize.define('DeletedUser', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  UId: {
    type: DataTypes.STRING,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
  },
  number: {
    type: DataTypes.BIGINT,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
  },
  gender: {
    type: DataTypes.STRING,
  },
  sex: {
    type: DataTypes.STRING,
  },
  activeStatus: {
    type: DataTypes.STRING,
    defaultValue: 'true'
  },
  packageId: {
    type: DataTypes.INTEGER,
  },
  date: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  height: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  age: {
    type: DataTypes.INTEGER,
  },
  subscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

module.exports = DeletedUser;
