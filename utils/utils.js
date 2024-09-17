const cloudinary = require('../config/cloudinaryConfig');
const jwt = require("jsonwebtoken");

// Helper function to upload files to Cloudinary
const uploadToCloudinary = (file, folder) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: folder }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }).end(file.buffer);
    });
};

const getDayOfWeek = (dateString) => { 
  
  const date = new Date(dateString);
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; 
  
  return daysOfWeek[date.getDay()]; 
} // Example usage:const date = "2024-08-09"; console.log(getDayOfWeek(date));

// Haversine formula to calculate distance between two points in KM
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // Convert degrees to radians
  const dLon = ((lon2 - lon1) * Math.PI) / 180; // Convert degrees to radians
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Distance in kilometers
};

const generateToken = (email) => {
    return jwt.sign({email}, process.env.JWT_SECRET);
}

module.exports = { uploadToCloudinary, generateToken, calculateDistance, getDayOfWeek };
