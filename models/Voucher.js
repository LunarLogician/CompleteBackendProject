const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const VoucherUser = require('./VoucherUser');
const User = require('./User');

const Voucher = sequelize.define('Voucher', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        },
    name: {
        type: DataTypes.STRING,
    },
    radius: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
    },
    description: {
        type: DataTypes.STRING
    },
    picUrl: {
        type: DataTypes.STRING,
    },
    price: {
        type: DataTypes.FLOAT,  
    },
    activeDays: {
        type: DataTypes.JSON,
    },
    category: {
        type: DataTypes.STRING,
    },
    //expiry time in days
    expiryTime: {
        type: DataTypes.INTEGER
    }
});

module.exports = Voucher;