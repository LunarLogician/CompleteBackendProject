const { cache } = require("../config/cacheConfig");
const { fetchPlacesFromGoogle } = require("../services/GoogleMapService");
const {
  findNearbyPlacesInDB,
  savePlacesToDB,
  adjustRadiusIfOverlapping,
  updatePlacePictureSrc,
} = require("../services/PlaceService");

exports.nearbyPlace = async (req, res) => {
  try {
    const { latitude, longitude, radius, type } = req.query;

    if (!latitude || !longitude || !radius || !type) {
      return res
        .status(400)
        .json({ error: "Latitude, longitude, and radius are required" });
    }

    // Convert radius to a number
    const radiusNum = parseFloat(radius || 0);
    const cachedPlaces = cache.get(
      `${latitude} ${longitude} ${radiusNum} ${type}`
    );
    if (cachedPlaces) {
      console.log("places api cached has been hit");
      return res.status(200).json(cachedPlaces);
    }

    // Adjust the radius if needed
    // const adjustedRadius = await adjustRadiusIfOverlapping(
    //   latitude,
    //   longitude,
    //   radiusNum
    // );

    // Fetch places within the adjusted radius
    const places = await findNearbyPlacesInDB(
      latitude,
      longitude,
      radiusNum,
      type
    );
    // If no places found within the adjusted radius, fetch from external API
    if (places.length === 0) {
      console.log("there is no place near me");
      const newPlaces = await fetchPlacesFromGoogle(latitude, longitude, 1000);
      // console.log("these are new places ", newPlaces);
      await savePlacesToDB(newPlaces);
      const myUpdatedPlaces = await findNearbyPlacesInDB(
        latitude,
        longitude,
        radiusNum,
        type
      );
      return res.status(201).json(myUpdatedPlaces);
    } else {
      console.log("places are found in db");
      return res.status(200).json(places);
    }
  } catch (error) {
    console.error("Error fetching places:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
