// services/googleMapsService.js
const axios = require("axios");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const fetchPlacesPage = async (
  latitude,
  longitude,
  radius,
  keyword,
  pageToken = null
) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;

  const params = {
    location: `${latitude},${longitude}`,
    radius: radius,
    type: keyword,
    key: GOOGLE_MAPS_API_KEY,
  };

  if (pageToken) {
    params.pagetoken = pageToken; // Add pageToken if it exists for pagination
  }

  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (e) {
    console.log(`Error fetching places for keyword ${keyword}: `, e);
    return null;
  }
};

const fetchAllPages = async (latitude, longitude, radius, keyword) => {
  let allResults = [];
  let nextPageToken = null;
  let delay = 2000; // Delay to allow next_page_token to become valid

  do {
    const data = await fetchPlacesPage(
      latitude,
      longitude,
      radius,
      keyword,
      nextPageToken
    );

    if (data && data.results) {
      allResults = [...allResults, ...data.results];
      nextPageToken = data.next_page_token;

      if (nextPageToken) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } else {
      nextPageToken = null; // No more pages
    }
  } while (nextPageToken);

  return allResults;
};

const fetchPlacesFromGoogle = async (latitude, longitude, radius) => {
  const keywords = ["bar", "cafe", "gym", "museum", "restaurant"];
  let allResults = [];
  try {
    for (const keyword of keywords) {
      const keywordResults = await fetchAllPages(
        latitude,
        longitude,
        radius,
        keyword
      );
      allResults = [...allResults, ...keywordResults]; // Combine results from each keyword
    }

    return allResults;
  } catch (e) {
    console.log("Error fetching places: ", e);
    return [];
  }
};
// const fetchPlacesFromGoogle = async (latitude, longitude, radius) => {
//   const keywords = ["bar", "cafe", "gym", "museum", "restaurant"];
//   const requests = keywords.map((keyword) => {
//     const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
//     return axios.get(url, {
//       params: {
//         location: `${latitude},${longitude}`,
//         radius: radius,
//         type: keyword,
//         key: GOOGLE_MAPS_API_KEY,
//       },
//     });
//   });

//   try {
//     const responses = await Promise.all(requests);
//     const allResults = responses.flatMap((response) => response.data.results); // Combine all results
//     // console.log("these are all results ", allResults);
//     return allResults;
//   } catch (e) {
//     console.log(e);
//     return [];
//   }
// };

const getImageUrlFromGoogle = async (placePictureId) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/photo`,
      {
        params: {
          photo_reference: placePictureId,
          maxwidth: 400, // Adjust the size as needed
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    return response.request.res.responseUrl; // The URL of the image
  } catch (error) {
    // console.error("Error fetching image URL:", error);
    return null;
  }
};

module.exports = { fetchPlacesFromGoogle, getImageUrlFromGoogle };
