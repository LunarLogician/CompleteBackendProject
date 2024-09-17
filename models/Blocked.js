const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlockedUser = sequelize.define('BlockedUser', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    blocked_user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
});

module.exports = BlockedUser;