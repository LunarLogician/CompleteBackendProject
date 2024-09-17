// routes/venueRoutes.js
const express = require("express");
const venueController = require("../controllers/venueController");
const placeController = require("../controllers/placeController");
const { authenticateToken } = require("../middleware/verifyToken");
const router = express.Router();

router.get("/getPlace", placeController.nearbyPlace);
router.get("/getVenues", venueController.getVenues);
router.get("/getAllVenues", venueController.getAllVenue);
router.post("/checkin", venueController.checkInUser);
router.post("/createVenue", venueController.createVenue);
router.post("/checkout", venueController.checkOutUser);
router.post("/checkoutByVenueId", venueController.checkOutUserByVenueId);

module.exports = router;
