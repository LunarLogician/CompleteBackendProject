const express = require("express");

const userController = require("../controllers/userController");
const venueController = require("../controllers/venueController");

const router = express.Router();
const upload = require("../utils/storage");

router.post(
  "/createUser",
  upload.array("profilePicUrl", 4),
  userController.signUp
);

router.get("/getUserSubscriptions", userController.getSubscriptionGraph);

router.get("/getUsers", userController.getUsers);
router.put("/getUsersDetails/:userId", userController.getUserDetails);
router.get("/getVenues", userController.getVenues);
router.post("/createVenue", venueController.createVenue);
router.get("/blockedUsers", userController.getAdminBlockedUsers);

router.put("/removeUser", upload.none(), userController.removeUser);
router.put("/reactivate", upload.none(), userController.reactivateUser);
router.post(
  "/addProfilePicture",
  upload.single("profilePic"),
  userController.addProfilePicture
);
router.put(
  "/editProfile",
  upload.array("profilePicUrl", 4),
  userController.editUser
);
router.put(
  "/replaceProfilePic",
  upload.single("profilePicUrl"),
  userController.replaceProfilePic
);
router.delete(
  "/deleteProfilePictureById",
  userController.deleteProfilePictureById
);
router.delete("/deleteProfilePic", userController.deleteUserProfilePics);
router.get("/getReportedUsers", userController.getReportedUsers);
router.post("/addVoucher", userController.addVoucher);
router.put("/updateVoucher/:id", userController.updateVoucher);
router.delete("/deleteVoucher/:id", userController.deleteVoucher);
router.post("/getuserbyids", upload.none(), userController.getUserByIDs);

module.exports = router;
