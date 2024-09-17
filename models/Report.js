const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportedUser = sequelize.define('ReportedUser', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    reported_user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    reason: {
        type: DataTypes.STRING,
    },
});

module.exports = ReportedUser;