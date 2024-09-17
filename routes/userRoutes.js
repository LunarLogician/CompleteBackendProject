const express = require("express");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/verifyToken");

const router = express.Router();
const upload = require("../utils/storage");

router.post("/signup", upload.array("profilePicUrl", 4), userController.signUp);

router.put(
  "/EditProfile",
  upload.array("profilePicUrl", 4),
  userController.editUser
);

router.get("/getUsers", userController.getUsers);
router.post("/addSubscription", upload.none(), userController.addSubscription);

router.get("/getVouchers", userController.getVoucher);
router.get("/getVoucherByID", upload.none(), userController.getVoucherById);
router.post("/addPayment", upload.none(), userController.addPayment);
router.post("/blockUser", upload.none(), userController.blockUser);
router.post("/reportUser", upload.none(), userController.reportUser);
router.get("/GetBlockedList", userController.getBlockedUsers);

router.put("/updateVoucherPic", upload.array("voucherPic", 1), userController.updateVoucherPic);
router.delete("/DeleteAccount", upload.none(), userController.removeUser);
router.put("/pauseAccount", upload.none(), userController.pauseUser);
router.get("/findUserByMail", userController.findUserByEmail);

module.exports = router;
