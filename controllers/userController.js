// controllers/userController.js
const UserCheckIn = require("../models/UserCheckIn");
const UserPicture = require("../models/UserPicture");
const Voucher = require("../models/Voucher");
const VoucherUser = require("../models/VoucherUser");
const PaymentHistory = require("../models/PaymentHistory");
const BlockedUser = require("../models/Blocked");
const ReportedUser = require("../models/Report");
const BlockedService = require("../services/BlockedUser");
const ReportService = require("../services/ReportUser");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const { generateToken, uploadToCloudinary } = require("../utils/utils");
const { body, validationResult, check } = require("express-validator");
const Venue = require("../models/Venue");
const DeletedUser = require("../models/DeletedUsers");
const User = require("../models/User");
const CheckInGoals = require("../models/CheckInGoals");
const Report = require("../models/Report");

const { Op, fn, col } = require("sequelize");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Route validation middleware
exports.validate = (method) => {
  switch (method) {
    case "addVoucher": {
      return [
        body("name").notEmpty().withMessage("Name is required"),
        body("description").notEmpty().withMessage("Description is required"),
        body("expiryDays")
          .isInt({ min: 1 })
          .withMessage("Expiry days must be a positive integer"),
      ];
    }
    case "addSubscription": {
      return [
        body("userId").notEmpty().withMessage("User ID is required"),
        body("voucherId").notEmpty().withMessage("Voucher ID is required"),
      ];
    }
    case "addPayment": {
      return [
        body("date").notEmpty().withMessage("Date is required"),
        body("amount")
          .isFloat({ min: 0.01 })
          .withMessage("Amount must be a positive number"),
        body("reason").notEmpty().withMessage("Reason is required"),
        body("userId").notEmpty().withMessage("User ID is required"),
        body("voucherId").notEmpty().withMessage("Voucher ID is required"),
      ];
    }
    case "signUp": {
      return [
        body("UId").notEmpty().withMessage("User ID is required"),
        body("name").notEmpty().withMessage("Name is required"),
        body("email").isEmail().withMessage("Valid email is required"),
      ];
    }
  }
};
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res
        .status(400)
        .json({ status: false, message: "User ID cannot be null" });

    // Fetch user details
    const user = await User.findOne({
      where: { UId: userId },
    });
    // console.log("This is user ", user);
    // console.log("this is user id ", userId);
    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });

    // Fetch user pictures
    const userPictures = await UserPicture.findAll({
      where: { userId: user.id },
    });

    // Fetch reported users
    const reports = await ReportedUser.findAll({ where: { user_id: user.id } });
    const reportedBy = await ReportedUser.findAll({
      where: { reported_user_id: user.id },
    });

    // Fetch payment history
    const paymentHistory = await PaymentHistory.findAll({
      where: { userId: user.id },
    });

    // Fetch user check-ins
    const userCheckIns = await UserCheckIn.findAll({
      where: { userId: user.id },
    });

    // Fetch voucher users and their details
    const voucherUsers = await VoucherUser.findAll({
      where: { userId: user.id },
    });
    const voucherDetails = await Promise.all(
      voucherUsers.map(async (voucherUser) => {
        const voucher = await Voucher.findOne({
          where: { id: voucherUser.voucherId },
        });
        return { ...voucherUser.toJSON(), voucher };
      })
    );

    return res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      user,
      userPictures,
      reports,
      reportedBy,
      paymentHistory,
      userCheckIns,
      voucherDetails,
    });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.addVoucher = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  try {
    let {
      name,
      description,
      expiryDays,
      radius,
      activeDays,
      category,
      picUrl,
    } = req.body;

    if (!picUrl)
      return res
        .status(400)
        .json({ status: false, message: "Voucher Pic needs to be uploaded" });

    const voucherExists = await Voucher.findOne({ where: { name } });

    if (voucherExists) {
      return res
        .status(409)
        .json({ status: false, message: "Voucher already exists" });
    }

    const voucher = await Voucher.create({
      name,
      description,
      activeDays,
      category,
      expiryTime: expiryDays,
      radius: parseInt(radius),
      picUrl: picUrl,
    });

    return res
      .status(201)
      .json({ status: true, message: "Voucher Created Successfully", voucher });
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.updateVoucher = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const {
      name,
      description,
      expiryDays,
      radius,
      activeDays,
      category,
      picUrl,
    } = req.body;

    const voucher = await Voucher.findByPk(parseInt(id));

    if (!voucher) {
      return res
        .status(404)
        .json({ status: false, message: "Voucher not found" });
    }

    const voucherExists = await Voucher.findOne({
      where: { name, id: { [Op.ne]: parseInt(id) } },
    });

    if (voucherExists) {
      return res
        .status(409)
        .json({ status: false, message: "Voucher name already in use" });
    }

    voucher.name = name || voucher.name;
    voucher.description = description || voucher.description;
    voucher.expiryTime = expiryDays || voucher.expiryTime;
    voucher.radius = parseInt(radius) || voucher.radius;
    voucher.activeDays = activeDays || voucher.activeDays;
    voucher.category = category || voucher.category;
    voucher.picUrl = picUrl || voucher.picUrl;

    await voucher.save();

    return res
      .status(200)
      .json({ status: true, message: "Voucher Updated Successfully", voucher });
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.getVoucher = async (req, res) => {
  try {
    const vouchers = await Voucher.findAll();

    if (vouchers && vouchers.length > 0)
      return res.status(200).json({
        status: true,
        message: "Vouchers Fetched Successfully",
        vouchers,
      });

    return res
      .status(404)
      .json({ status: false, message: "No Vouchers Found" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could not Fetch Vouchers",
      error: error.message,
    });
  }
};

exports.updateVoucherPic = async (req, res) => {
  try {
    const { voucherId } = req.body;

    const voucherPic = req.files[0];

    if (!voucherId)
      return res
        .status(400)
        .json({ status: false, message: "voucherId cannot be null" });
    if (!voucherPic)
      return res
        .status(400)
        .json({ status: false, message: "No voucher pic provided" });

    const voucherExists = await Voucher.findOne({ where: { id: voucherId } });

    if (!voucherExists)
      return res
        .status(404)
        .json({ status: false, message: "Voucher does not exist" });
    const url = await cloudinary.uploader.upload(voucherPic.path);

    voucherExists.picUrl = url.secure_url;
    await voucherExists.save();

    return res
      .status(200)
      .json({ status: true, message: "Voucher Updated", voucherExists });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could not Update Voucher Pics",
      error: error.message,
    });
  }
};
exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findByPk(id);

    if (!voucher) {
      return res
        .status(404)
        .json({ status: false, message: "Voucher not found" });
    }

    await voucher.destroy();

    return res
      .status(200)
      .json({ status: true, message: "Voucher Deleted Successfully" });
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.getVoucherById = async (req, res) => {
  try {
    const { voucherId } = req.query;

    if (!voucherId)
      return res
        .status(400)
        .json({ status: false, message: "voucherId cannot be NULL" });

    const id = voucherId;
    const voucher = await Voucher.findByPk(id);

    if (voucher)
      return res.status(200).json({
        status: true,
        message: "Voucher Fetched Successfully",
        voucher,
      });

    return res
      .status(404)
      .json({ status: false, message: "No Vouchers Found" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could not Fetch Vouchers",
      error: error.message,
    });
  }
};

exports.addSubscription = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  try {
    const { userId, voucherId } = req.body;

    if (!userId)
      return res
        .status(400)
        .json({ status: false, message: "userId cannot be null" });
    if (!voucherId)
      return res
        .status(400)
        .json({ status: false, message: "voucherId cannot be null" });

    const userExists = await User.findOne({
      where: { UId: userId },
    });
    const voucherExists = await Voucher.findOne({ where: { id: voucherId } });

    if (!voucherExists || !userExists) {
      return res
        .status(404)
        .json({ status: false, message: "User or Voucher does not exist" });
    }
    //Check if the user already has a subscription
    const voucherUserExists = await VoucherUser.findOne({
      where: { userId: userExists.id },
    });

    if (voucherUserExists)
      return res.status(409).json({
        status: false,
        message: `User is Already Subscribed to Voucher ID: ${voucherUserExists.voucherId}`,
      });

    // Calculate the expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + voucherExists.expiryTime);

    await userExists.update({ subscribed: true });
    const createdSubscription = await VoucherUser.create({
      userId: userExists.id,
      voucherId: voucherExists.id,
      expiryDate: expiryDate,
    });

    userExists.radius = voucherExists.radius;
    await userExists.save();

    return res.status(201).json({
      status: true,
      message: "Successfully Subscribed",
      createdSubscription,
    });
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.addPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  try {
    const { date, userId, voucherId } = req.body;

    if (!userId)
      return res
        .status(400)
        .json({ status: false, message: "userId cannot be null" });
    if (!voucherId)
      return res
        .status(400)
        .json({ status: false, message: "voucherId cannot be null" });

    const userExists = await User.findOne({ where: { UId: userId } });
    const voucherExists = await Voucher.findOne({ where: { id: voucherId } });

    if (!voucherExists || !userExists) {
      return res
        .status(404)
        .json({ status: false, message: "User or Voucher does not exist" });
    }

    const payment = await PaymentHistory.create({
      date,
      reason: "voucher subscribed",
      amount: voucherExists.price,
      userId: userExists.id,
      voucherId: voucherId,
    });

    return res
      .status(201)
      .json({ status: true, message: "Payment Added Successfully", payment });
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.signUp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  try {
    const {
      UId,
      name,
      number,
      description,
      gender,
      sex,
      activeStatus,
      packageId,
      date,
      email,
      age,
    } = req.body;

    const userExists = await User.findOne({
      where: { UId },
      include: [UserPicture],
    });

    if (userExists) {
      return res
        .status(409)
        .json({ status: false, message: "User already exists" });
    }

    const user = await User.create({
      UId,
      name,
      number,
      description,
      gender,
      sex,
      activeStatus,
      packageId,
      date,
      email,
      age,
    });

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await cloudinary.uploader.upload(file.path);
        await UserPicture.create({
          userId: user.id,
          imageUrl: uploadResult.secure_url,
        });

        console.log("Uploaded file to Cloudinary: ", uploadResult.secure_url);
      }
    }

    const token = generateToken(email);

    res
      .status(200)
      .json({ status: true, message: "User signed up successfully", token });
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.blockUser = async (req, res) => {
  try {
    const { userUID, blockUID } = req.body;

    //check if the user and blocked User exists
    const userExists = await User.findOne({
      where: { UId: userUID },
    });
    const blockedUserExists = await User.findOne({
      where: { UId: blockUID },
    });

    if (!userExists)
      return res.status(404).json({ status: false, message: "User Not Found" });
    if (!blockedUserExists)
      return res
        .status(404)
        .json({ status: false, message: "Blocked User Not Found" });

    //Now insert in the Block Table
    const blocked = await BlockedService.createBlockUser({
      user_id: userExists.id,
      blocked_user_id: blockedUserExists.id,
    });

    if (blocked)
      return res
        .status(201)
        .json({ status: true, message: "User Blocked Successfully" });

    return res
      .status(409)
      .json({ status: false, message: "Could not Block the User" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could Not block user",
      error: error.message,
    });
  }
};

exports.reportUser = async (req, res) => {
  try {
    const { userUID, reportUserUID, reason } = req.body;

    //check if the user and reporting User exists
    const userExists = await User.findOne({
      where: { UId: userUID },
    });
    const reportUserExists = await User.findOne({
      where: { UId: reportUserUID },
    });

    if (!userExists)
      return res.status(404).json({ status: false, message: "User Not Found" });
    if (!reportUserExists)
      return res
        .status(404)
        .json({ status: false, message: "User to be Reported Not Found" });

    //Check if the user has already reported the user
    const reportedAlready = await ReportedUser.findOne({
      where: { user_id: userExists.id, reported_user_id: reportUserExists.id },
    });

    if (reportedAlready)
      return res.status(409).json({
        status: false,
        message: "You have already reported this user",
      });

    //Now insert in the Report Table
    const report = await ReportService.createReport({
      user_id: userExists.id,
      reported_user_id: reportUserExists.id,
      reason: reason,
    });

    if (report)
      return res
        .status(201)
        .json({ status: true, message: "User Reported Successfully" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could Not Report the user",
      error: error.message,
    });
  }
};
exports.getReportedUsers = async (req, res) => {
  try {
    const reportedUsers = await ReportService.getReportedUsers();

    if (reportedUsers && reportedUsers.length === 0)
      return res.status(200).json({
        status: true,
        message: "No Reported Users",
        reportedUsers: [],
      });

    return res
      .status(200)
      .json({ status: true, message: "Reported User Found", reportedUsers });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could Not Fetch reported Users",
      error: error.message,
    });
  }
};
exports.getBlockedUsers = async (req, res) => {
  try {
    const { userUID } = req.query;

    //checking if the user Exists
    const userExists = await User.findOne({
      where: { UId: userUID },
    });
    if (!userExists)
      return res.status(404).json({ status: false, message: "User Not Found" });

    const getBlockedUsers = await BlockedService.getAllBlocks(userExists.id);

    if (getBlockedUsers && getBlockedUsers.length > 0) {
      const blockedUserIds = getBlockedUsers.map(
        (entry) => entry.blocked_user_id
      );

      const blockedUsers = await User.findAll({
        where: { id: blockedUserIds },
      });
      console.log("This is blocked users ", blockedUsers);
      return res.status(200).json({
        status: true,
        message: "Fetched Blocked Users Successfully",
        BlockedUsers: blockedUsers,
      });
    }

    return res
      .status(206)
      .json({ status: true, message: "No Blocked User Found" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Could not Fetch Blocked Users" });
  }
};
exports.getAdminBlockedUsers = async (req, res) => {
  try {
    const getBlockedUsers = await BlockedService.getAllRealBlocks();
    if (getBlockedUsers && getBlockedUsers.length > 0) {
      const blockedUserIds = getBlockedUsers.map(
        (entry) => entry.blocked_user_id
      );
      const blockedUsers = await User.findAll({
        where: { id: blockedUserIds },
      });
      console.log("This is blocked users ", blockedUsers);
      return res.status(200).json({
        status: true,
        message: "Fetched Blocked Users Successfully",
        users: blockedUsers,
      });
    }

    return res
      .status(206)
      .json({ status: true, message: "No Blocked User Found" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Could not Fetch Blocked Users" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { uid } = req.query;

    if (uid) {
      let user = await User.findOne({
        where: { UId: uid },
        include: [
          UserPicture,
          {
            model: CheckInGoals,
            attributes: ["goal"], // Select only the 'goal' attribute
          },
        ],
      });

      // Transform CheckInGoals to an array of goals
      user = {
        ...user.toJSON(),
        CheckInGoals: user.CheckInGoals.map((goal) => goal.goal),
      };

      if (user) {
        return res.status(200).json({
          status: true,
          message: "User exists",
          user,
        });
      } else {
        return res.status(404).json({
          status: false,
          message: "User does not exist",
          user: [],
        });
      }
    } else {
      let users = await User.findAll({
        include: [
          UserPicture,
          {
            model: CheckInGoals,
            attributes: ["goal"], // Select only the 'goal' attribute
          },
        ],
      });

      // Transform CheckInGoals to an array of goals for each user
      users = users.map((user) => {
        let userJSON = user.toJSON();
        userJSON.CheckInGoals = user.CheckInGoals.map((goal) => goal.goal);
        return userJSON;
      });

      return res.status(200).json({
        status: true,
        message: "All users fetched successfully",
        users,
      });
    }
  } catch (error) {
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });
    }
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//This is for Admin side
exports.getVenues = async (req, res) => {
  try {
    const { placeId } = req.query;

    //means if place Id is not passed, then get All Venues
    if (!placeId) {
      const AllVenues = await Venue.findAll();

      if (AllVenues && AllVenues.length > 0)
        return res.status(200).json({
          status: true,
          message: "Venues Fetched Successfully",
          Venues: AllVenues,
        });

      if (AllVenues && AllVenues.length === 0)
        return res
          .status(206)
          .json({ status: true, message: "No Venues Found" });
    } else {
      const FoundVenue = await Venue.findOne({ where: { id: placeId } });

      if (FoundVenue)
        return res
          .status(200)
          .json({ status: true, message: "Venue Found", Venue: FoundVenue });

      return res
        .status(404)
        .json({ status: false, message: "Venue Not found" });
    }
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.editUser = async (req, res) => {
  try {
    const { userId } = req.query;
    const attributes = req.body;

    if (!userId)
      return res
        .status(400)
        .json({ status: false, message: "id cannot be null" });

    // Check if the user exists
    const userExists = await User.findOne({
      where: { UId: userId, activeStatus: "true" },
    });
    if (!userExists)
      return res.status(404).json({ status: false, message: "User not Found" });

    // Define expected attributes and their types
    const expectedAttributes = {
      name: "string",
      number: "number",
      description: "string",
      gender: "string",
      sex: "string",
      packageId: "integer",
      date: "string",
      email: "string",
      height: "float",
      age: "integer",
      subscribed: "boolean",
      showSexualOrientation: "boolean",
    };

    // Validate and convert attributes
    const validatedAttributes = {};
    for (const key in attributes) {
      if (expectedAttributes.hasOwnProperty(key)) {
        const value = attributes[key];
        const expectedType = expectedAttributes[key];

        switch (expectedType) {
          case "string":
            if (typeof value === "string") validatedAttributes[key] = value;
            break;
          case "number": // Changed from "bigint" to "number"
            const numberValue = Number(value);
            if (!isNaN(numberValue)) validatedAttributes[key] = numberValue;
            break;
          case "bigint":
            const bigintValue = BigInt(value);
            if (!isNaN(bigintValue)) validatedAttributes[key] = bigintValue;
            break;
          case "integer":
            const intValue = parseInt(value, 10);
            if (!isNaN(intValue)) validatedAttributes[key] = intValue;
            break;
          case "float":
            const floatValue = parseFloat(value);
            if (!isNaN(floatValue)) validatedAttributes[key] = floatValue;
            break;
          case "boolean":
            const boolValue = value === "true" || value === true;
            validatedAttributes[key] = boolValue;
            break;
          default:
            break;
        }
      }
    }
    //Checking if there are pictures to keep

    // Checking if there are check-in goals to write
    if (attributes.checkInGoals) {
      let checkInGoals = attributes.checkInGoals.split(",");

      // Delete pre-existing check-in goals and update with new ones
      await CheckInGoals.destroy({ where: { userId: userExists.id } });

      // Create new check-in goals
      const checkInGoalsToCreate = checkInGoals.map((goal) => ({
        userId: userExists.id,
        goal: goal,
      }));

      //create the check in goals for the user
      await CheckInGoals.bulkCreate(checkInGoalsToCreate);
    }

    if (attributes.imagesToKeep) {
      let imagesToKeep = attributes.imagesToKeep;
      imagesToKeep = imagesToKeep.split(",");

      //First I have to destroy those images which do not match with the URLs provided
      await UserPicture.destroy({
        where: {
          userId: userExists.id,
          imageUrl: {
            [Op.notIn]: imagesToKeep,
          },
        },
      });
    }
    // Checking if there are pictures to edit
    // If there are pictures to edit, then overwrite the userPictures
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await cloudinary.uploader.upload(file.path);
        await UserPicture.create({
          userId: userExists.id,
          imageUrl: uploadResult.secure_url,
        });

        console.log("Uploaded file to Cloudinary: ", uploadResult.secure_url);
      }
    }

    const UpdatedUser = await userExists.update(validatedAttributes);

    const userPictures = await UserPicture.findAll({
      where: { userId: userExists.id },
    });
    const checkinGoals = await CheckInGoals.findAll({
      where: { userId: userExists.id },
      attributes: ["goal"],
    });

    const goals = checkinGoals.map((goal) => goal.goal);

    UpdatedUser.userPictures = userPictures;
    if (UpdatedUser)
      return res.status(200).json({
        status: true,
        message: "User Updated Successfully",
        user: UpdatedUser,
        pictures: userPictures,
        CheckInGoals: goals,
      });

    return res
      .status(409)
      .json({ status: false, message: "User Could not be Updated" });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.addProfilePicture = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "User ID cannot be null" });
    }

    // Check if the user exists
    const userExists = await User.findOne({
      where: { UId: userId, activeStatus: "true" },
    });
    if (!userExists) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Check if there is a file to upload
    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "No file uploaded" });
    }

    // Upload the file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path);

    // Save the file URL to the database
    const userPicture = await UserPicture.create({
      userId: userExists.id,
      imageUrl: uploadResult.secure_url,
    });

    return res.status(201).json({
      status: true,
      message: "Profile picture added successfully",
      picture: userPicture,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.replaceProfilePic = async (req, res) => {
  try {
    const { userId, pictureId } = req.query;

    if (!userId)
      return res
        .status(400)
        .json({ status: false, message: "User ID cannot be null" });

    if (!pictureId)
      return res
        .status(400)
        .json({ status: false, message: "Picture ID cannot be null" });

    const userExists = await User.findOne({
      where: { UId: userId, activeStatus: "true" },
    });
    if (!userExists)
      return res.status(404).json({ status: false, message: "User not found" });

    const userPicture = await UserPicture.findOne({
      where: { id: pictureId, userId: userExists.id },
    });
    if (!userPicture)
      return res
        .status(404)
        .json({ status: false, message: "Picture not found" });

    if (!req.file)
      return res
        .status(400)
        .json({ status: false, message: "No file uploaded" });

    const uploadResult = await cloudinary.uploader.upload(req.file.path);

    userPicture.imageUrl = uploadResult.secure_url;
    await userPicture.save();

    return res.status(200).json({
      status: true,
      message: "Profile picture replaced successfully",
      picture: userPicture,
    });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
// Delete Single Profile Picture Controller
exports.deleteProfilePictureById = async (req, res) => {
  try {
    const { userId, pictureId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "User ID cannot be null" });
    }

    if (!pictureId) {
      return res
        .status(400)
        .json({ status: false, message: "Picture ID cannot be null" });
    }

    // Check if the user exists
    const userExists = await User.findOne({
      where: { UId: userId, activeStatus: "true" },
    });
    if (!userExists) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Check if the picture exists
    const pictureExists = await UserPicture.findOne({
      where: { id: pictureId, userId: userExists.id },
    });
    if (!pictureExists) {
      return res
        .status(404)
        .json({ status: false, message: "Picture not found" });
    }

    // Delete the picture
    await UserPicture.destroy({ where: { id: pictureId } });

    return res.status(200).json({
      status: true,
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.deleteUserProfilePics = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId)
      return res
        .status(400)
        .json({ status: false, message: "id cannot be null" });

    const userExists = await User.findOne({
      where: { UId: userId, activeStatus: "true" },
    });
    if (!userExists)
      return res.status(404).json({ status: false, message: "User not Found" });

    const userPictures = await UserPicture.findAll({
      where: { userId: userExists.id },
    });
    if (userPictures.length === 0)
      return res
        .status(404)
        .json({ status: false, message: "No profile picture found" });

    for (const picture of userPictures) {
      await cloudinary.uploader.destroy(picture.imageUrl); // Destroy the image on Cloudinary
      await UserPicture.destroy({ where: { id: picture.id } }); // Remove the entry from the database
    }

    return res.status(200).json({
      status: true,
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.removeUser = async (req, res) => {
  try {
    const { uid } = req.query;

    //check if the user exists
    const userExists = await User.findOne({where: {UId: uid}});

    if(!userExists) return res.status(404).json({status: false, message: "User does not exist"});

    //delete Voucher User if account deleted

    await VoucherUser.destroy({where: {userId: userExists.id}});

    await userExists.destroy();

    return res.status(200).json({status: true, message: "User Deleted Successfully"});

  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.pauseUser = async (req, res) => {
  try {
    const { uid, flag } = req.query;

    if (!uid)
      return res
        .status(400)
        .json({ status: false, message: "uid cannot be null" });
    if (!flag)
      return res.status(400).json({
        status: false,
        message: "flag cannot be null (pause, unpause)",
      });
    //Check if user exists
    // let statusUser;

    // if (flag == "pause") statusUser = "true";
    // else statusUser = "false";

    const userExists = await User.findOne({
      where: { UId: uid },
    });
    // console.log("This is user ", userExists);
    if (!userExists)
      return res
        .status(404)
        .json({ status: false, message: "User does not Exist" });

    let user;

    if (flag === "pause") {
      user = await User.update(
        { activeStatus: "false" },
        { where: { id: userExists.id } }
      );
    } else {
      user = await User.update(
        { activeStatus: "true" },
        { where: { id: userExists.id } }
      );
    }

    if (!user)
      return res
        .status(409)
        .json({ status: true, message: `User Could not be ${flag}` });

    return res
      .status(200)
      .json({ status: true, message: `User ${flag} Successfully` });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.reactivateUser = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid)
      return res
        .status(400)
        .json({ status: false, message: "uid cannot be null" });

    //Check if user exists
    const userExists = await User.findOne({
      where: { UId: uid, activeStatus: "false" },
    });
    if (!userExists)
      return res
        .status(404)
        .json({ status: false, message: "User does not Exist" });

    const userRemoved = await User.update(
      { activeStatus: "true" },
      { where: { id: userExists.id } }
    );

    if (!userRemoved)
      return res
        .status(409)
        .json({ status: true, message: "User cannot be reactivate" });

    return res
      .status(200)
      .json({ status: true, message: "User has been reactivated" });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.findUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email)
      return res.status(400).json({
        status: false,
        message: "email cannot be null (send in query param)",
      });

    let userExists = await User.findOne({
      where: { email },
      include: [
        UserPicture,
        {
          model: CheckInGoals,
          attributes: ["goal"], // Select only the 'goal' attribute
        },
      ],
    });

    if (!userExists) {
      //check the user in deleted users
      const deleteExists = await DeletedUser.findOne({ where: { email } });

      if (!deleteExists)
        return res.status(404).json({
          status: false,
          message: `User with email ${email} does not exist`,
        });

      return res.status(404).json({
        status: false,
        message: `Cannot Login with the email ${email}, Contact Customer Support`,
        isDeleted: true,
      });
    }

    // Transform CheckInGoals to an array of goals
    userExists = {
      ...userExists.toJSON(),
      CheckInGoals: userExists.CheckInGoals.map((goal) => goal.goal),
    };

    return res.status(200).json({
      status: true,
      message: "User Found",
      user: userExists,
      isDeleted: false,
    });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
function incrementDateByOneDay(date) {
  // Convert the string date to a Date object
  const dateObj = new Date(date);

  // Increment the date by 1 day
  dateObj.setDate(dateObj.getDate() + 1);

  // Convert back to ISO format and return only the date part
  return dateObj.toISOString().split("T")[0];
}
exports.getSubscriptionGraph = async (req, res) => {
  try {
    // Query to get the count of users grouped by subscribeDate
    const subscriptions = await VoucherUser.findAll({
      attributes: [
        [fn("DATE", col("subscribeDate")), "date"], // Extract date from subscribeDate
        [fn("COUNT", col("id")), "userCount"], // Count the number of users
      ],
      group: [fn("DATE", col("subscribeDate"))], // Group by date
      order: [[fn("DATE", col("subscribeDate")), "ASC"]], // Order by date
    });

    // Extract labels (dates) and values (number of users) from the result
    const labels = subscriptions.map((sub) => sub.getDataValue("date"));
    const values = subscriptions.map((sub) => sub.getDataValue("userCount"));

    // If both arrays are empty, add the current date and 0 value
    if (labels.length === 0 && values.length === 0) {
      const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
      labels.push(currentDate);
      values.push(1);
      labels.push(incrementDateByOneDay(currentDate));
      values.push(2);
    }

    // Send the response
    return res.status(200).json({ status: true, data: { labels, values } });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.getUserByIDs = async (req, res) => {
  try {
    let { userIDs } = req.body;

    if (!userIDs)
      return res
        .status(400)
        .json({ status: false, message: "userIDs cannot be null" });

    console.log(userIDs);

    if (userIDs && userIDs.length === 0)
      return res
        .status(400)
        .json({ status: false, message: "userIDs cannot be empty" });

    // Fetch report reasons by user IDs
    const reportList = await ReportedUser.findAll({
      where: { user_id: userIDs },
      attributes: ["user_id", "reason"],
    });

    // Map user IDs to their reasons
    const reportReasonsMap = {};
    reportList.forEach((rep) => {
      if (!reportReasonsMap[rep.user_id]) {
        reportReasonsMap[rep.user_id] = [];
      }
      reportReasonsMap[rep.user_id].push(rep.reason);
    });

    // Fetch users by IDs
    const userList = await User.findAll({
      where: { id: userIDs },
    });

    if (userList.length > 0) {
      // Attach report reasons to each user
      const result = userList.map((user) => {
        return {
          ...user.toJSON(),
          reason:
            reportReasonsMap[user.id]?.length > 0
              ? reportReasonsMap[user.id][0]
              : "",
        };
      });

      return res.status(200).json({
        status: true,
        message: "Users Fetched Successfully",
        users: result,
      });
    }
    return res.status(404).json({ status: false, message: "No User Found" });
  } catch (error) {
    if (error.name === "SequelizeConnectionError")
      return res.status(503).json({
        status: false,
        message: "Service Unavailable",
        error: error.message,
      });

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
