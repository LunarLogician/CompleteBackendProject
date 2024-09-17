const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Place = sequelize.define(
  "Place",
  {
    placeId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    // placePicture: {
    //   type: DataTypes.TEXT,
    // },
    // placePictureSrc: {
    //   type: DataTypes.STRING,
    // },
    title: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    categories: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        fields: ["latitude", "longitude", "placeId"],
      },
    ],
  }
);

module.exports = Place;
