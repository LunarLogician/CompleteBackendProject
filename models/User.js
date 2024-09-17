// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const UserPicture = require('./UserPicture');
const Request = require('./Request');
const Message = require('./Message');
const Voucher = require('./Voucher');
const VoucherUser = require('./VoucherUser');
const BlockedUser = require('./Blocked');
const ReportedUser = require('./Report');
const UserCheckIn = require('./UserCheckIn');
const CheckInGoals = require('./CheckInGoals');

const User = sequelize.define('User', {
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
  radius:{
    type: DataTypes.INTEGER,
  },
  showSexualOrientation: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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

//Association with User Picture Table
User.hasMany(UserPicture, { foreignKey: 'userId', onDelete: "CASCADE" });
UserPicture.belongsTo(User, { foreignKey: 'userId' });

//Association with User Checkin Table
User.hasOne(UserCheckIn, { foreignKey: 'userId' , onDelete: "CASCADE"});
UserCheckIn.belongsTo(User, { foreignKey: 'userId' });

//Association with Blocked User table
User.hasMany(BlockedUser, {foreignKey: 'user_id', onDelete: "CASCADE"});
User.hasMany(BlockedUser, {foreignKey: 'blocked_user_id', onDelete: "CASCADE"});

BlockedUser.belongsTo(User, {foreignKey: 'user_id' });
BlockedUser.belongsTo(User, {foreignKey: 'blocked_user_id' });

//Associations with Reported User Table
User.hasMany(ReportedUser, {foreignKey: 'user_id', onDelete: "CASCADE"});
User.hasMany(ReportedUser, {foreignKey: 'reported_user_id'});

ReportedUser.belongsTo(User, {foreignKey: 'user_id' });
ReportedUser.belongsTo(User, {foreignKey: 'reported_user_id' });


//Associations with Request Table
User.hasMany(Request, { as: 'SentRequests', foreignKey: 'sender_id', onDelete: 'CASCADE' });
User.hasMany(Request, { as: 'ReceivedRequests', foreignKey: 'receiver_id', onDelete: 'CASCADE' });
Request.belongsTo(User, { as: 'Sender', foreignKey: 'sender_id', onDelete: 'CASCADE' });
Request.belongsTo(User, { as: 'Receiver', foreignKey: 'receiver_id', onDelete: 'CASCADE' });

//Associations with Messages Table
User.hasMany(Message, { as: 'SentMessages', foreignKey: 'from_user', onDelete: 'CASCADE' });
User.hasMany(Message, { as: 'ReceivedMessages', foreignKey: 'to_user', onDelete: 'CASCADE' });
Message.belongsTo(User, { as: 'Sender', foreignKey: 'from_user', onDelete: 'CASCADE' });
Message.belongsTo(User, { as: 'Receiver', foreignKey: 'to_user', onDelete: 'CASCADE' });

//Association with CheckIn Goals
User.hasMany(CheckInGoals, {foreignKey: "userId", onDelete: "CASCADE"});
CheckInGoals.belongsTo(User, {foreignKey: "userId"});

module.exports = User;
