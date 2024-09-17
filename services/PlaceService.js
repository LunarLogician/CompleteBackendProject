const sequelize = require("../config/database");
const Place = require("../models/Place");
const { Op } = require("sequelize");
const { getImageUrlFromGoogle } = require("./GoogleMapService");
const { cache } = require("../config/cacheConfig");

// ye humain distance calculate kr k de ga mgr currently ye function use nahi kr rae hum
// hum db me h haversin formula laga rae hain
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

//ye function humain radius kam kr k de ga agr koi new located requested
//radius k hisaab se kisi purani location k saath overlap kare to
const adjustRadiusIfOverlapping = async (latitude, longitude, radius) => {
  try {
    // Find the nearest place within the given radius
    const places = await Place.findAll({
      attributes: [
        "placeId",
        "latitude",
        "longitude",
        [
          sequelize.literal(`(
            6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(latitude))
            )
          )`),
          "distance",
        ],
      ],
      where: sequelize.where(
        sequelize.literal(`(
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(latitude))
          )
        )`),
        { [Op.lte]: radius }
      ),
      order: [[sequelize.literal("distance"), "ASC"]],
    });

    if (places.length > 0) {
      const minDistance = places[0].dataValues.distance;

      // Adjust radius to avoid overlap, ensuring it does not go below zero
      if (minDistance < radius) {
        radius = Math.max(minDistance - 0.01, 0); // Avoid negative radius
      }
    }

    return radius;
  } catch (error) {
    console.error("Error adjusting radius:", error);
    return radius; // Return the original radius in case of an error
  }
};

const categorizeNearbyPlaces = async (
  referenceLat,
  referenceLon,
  nearbyPlaces
) => {
  const categories = {
    up: [],
    down: [],
    left: [],
    right: [],
  };

  await Promise.all(
    nearbyPlaces.map(async (place) => {
      const { latitude, longitude } = place;

      if (latitude > referenceLat) {
        categories.up.push(place.dataValues);
      } else if (latitude < referenceLat) {
        categories.down.push(place.dataValues);
      }

      if (longitude > referenceLon) {
        categories.right.push(place.dataValues);
      } else if (longitude < referenceLon) {
        categories.left.push(place.dataValues);
      }
    })
  );
  return categories;
};

// ye humain radius k hisaab se nearby places de ga is k distance k saath
// is me bhi haversin formula db me h laga wa hay
const findNearbyPlacesInDB = async (latitude, longitude, radius, type) => {
  try {
    const attributes = [
      "placeId",
      "latitude",
      "longitude",
      "categories",
      "title",
      "address",
      [
        sequelize.literal(`(
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(latitude))
          )
        )`),
        "distance",
      ],
    ];

    // Base WHERE condition for radius
    const whereConditions = [
      sequelize.where(
        sequelize.literal(`(
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(latitude))
          )
        )`),
        { [Op.lte]: radius }
      ),
    ];

    // Add the category filter if type is not "all"
    if (type !== "all") {
      whereConditions.push(
        sequelize.literal(`JSON_CONTAINS(categories, '"${type}"')`)
      );
    }

    // Fetch places from the database with the conditions
    const places = await Place.findAll({
      attributes,
      where: whereConditions,
      order: [[sequelize.literal("distance"), "ASC"]],
    });

    // Filter places by distance in meters
    const result = [];
    for (const r of places) {
      const distanceInKm = r.get("distance");
      const distanceInMeters = distanceInKm * 1000;
      if (distanceInMeters <= radius) {
        if (type === "all") {
          if (r.categories.includes("restaurant")) {
            r.categories = "restaurant";
          } else if (r.categories.includes("bar")) {
            r.categories = "bar";
          } else if (r.categories.includes("cafe")) {
            r.categories = "cafe";
          } else if (r.categories.includes("gym")) {
            r.categories = "gym";
          } else if (r.categories.includes("museum")) {
            r.categories = "museum";
          } else {
            r.categories = "other";
          }
        } else {
          r.categories = type;
        }
        result.push(r);
      }
    }
    cache.set(`${latitude} ${longitude} ${radius} ${type}`, result);
    return result;
  } catch (e) {
    console.log("Error finding places:", e);
    return [];
  }
};

// hum unique places ko db me store krwa rae hain yehaan pr
const savePlacesToDB = async (places) => {
  try {
    const promises = places.map(async (place) => {
      // Ensure necessary fields are present
      if (!place.place_id || !place.geometry || !place.name) {
        console.warn("Place skipped due to missing required fields:", place);
        return;
      }

      const existingPlace = await Place.findOne({
        where: { placeId: place.place_id },
      });

      if (!existingPlace) {
        return Place.upsert({
          placeId: place.place_id,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          title: place.name,
          address: place.vicinity || "No address available",
          categories: place.types || [],
        });
      }
    });

    await Promise.all(promises);
    console.log("Successfully saved places to the database.");
  } catch (e) {
    console.error("Error saving places to the database:", e);
  }
};
const updatePlacePictureSrc = async (latitude, longitude, radius) => {
  try {
    // Find places within the given radius
    const places = await findNearbyPlacesInDB(latitude, longitude, radius);

    for (const place of places) {
      if (!place.placePictureSrc && place.placePicture) {
        // If placePictureSrc does not exist, fetch it
        const imageUrl = await getImageUrlFromGoogle(place.placePicture);
        if (imageUrl) {
          // Update the place with the new image URL
          await Place.update(
            { placePictureSrc: imageUrl },
            { where: { placeId: place.placeId } }
          );
        }
      }
    }

    // Return the updated places with placePictureSrc
    return await findNearbyPlacesInDB(latitude, longitude, radius); // Fetch updated places
  } catch (error) {
    console.error("Error updating place picture source:", error);
    return [];
  }
};
module.exports = {
  findNearbyPlacesInDB,
  savePlacesToDB,
  adjustRadiusIfOverlapping,
  haversineDistance,
  updatePlacePictureSrc,
};
