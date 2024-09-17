const Venue = require("../models/Venue");
const UserCheckIn = require("../models/UserCheckIn");
const User = require("../models/User");
const UserPicture = require("../models/UserPicture");
const cloudinary = require("cloudinary").v2;
const BlockedService = require("../services/BlockedUser");
const Request = require("../models/Request");
const BlockedUser = require("../models/Blocked");
const CheckInGoals = require("../models/CheckInGoals");
const { Op } = require("sequelize");

const { calculateDistance } = require("../utils/utils");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Utility function to get category counts and checked-in users
const getCategoryCountsAndUsers = async (venueId) => {
  const categories = [
    "Friends",
    "Networking",
    "Dates",
    "Food",
    "Parties",
    "Events",
    "Drinks",
  ];
  const categoryCounts = {};
  const userIds = [];

  for (const category of categories) {
    const count = await UserCheckIn.count({ where: { venueId, category } });
    categoryCounts[category] = count;
  }

  const userCheckIns = await UserCheckIn.findAll({ where: { venueId } });

  for (const checkIn of userCheckIns) {
    userIds.push(checkIn.userId);
  }

  let users = await User.findAll({
    where: { id: userIds, activeStatus: "true" },
    include: [UserPicture, { model: CheckInGoals, attributes: ["goal"] }],
  });

  return { categoryCounts, users };
};

// Create a new venue
exports.createVenue = async (req, res) => {
  try {
    const { placeId } = req.body;

    let venue = await Venue.findOne({ where: { placeId } });

    if (venue) {
      return res
        .status(409)
        .json({ status: false, message: "Venue already exists" });
    }

    venue = await Venue.create({ placeId, totalCheckIns: 0 });

    res
      .status(201)
      .json({ status: true, message: "Venue created successfully", venue });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// Create a new venue
exports.getAllVenue = async (req, res) => {
  try {
    let venues = await Venue.findAll();
    if (!venues) {
      return res
        .status(401)
        .json({ status: false, message: "Venue not found" });
    }
    res
      .status(201)
      .json({ status: true, message: "Venues has been fetched", venues });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get venue details or all venues
exports.getVenues = async (req, res) => {
  try {
    //both ageRange in dash separated, checkingoals comma separated
    let { placeid, userId, ageRange, checkInGoals, rangeFlag } = req.query;

    if (ageRange) {
      ageRange = ageRange.split("-").map(Number);

      if (rangeFlag) {
        ageRange[0] -= 5;
        ageRange[1] += 5;
      }
    }

    if (checkInGoals) {
      checkInGoals = checkInGoals.split(",");
    }

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "User ID is required" });
    }

    // Check if user exists using UId
    const user = await User.findOne({
      where: { UId: userId },
      include: [UserPicture],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Get blocked user list of the current user
    const blockedByCurrentUser = await BlockedService.getAllBlocks(user.id);
    const blockedUserIds = blockedByCurrentUser.map(
      (blockedUser) => blockedUser.blocked_user_id
    );

    // Get list of users who have blocked the current user
    const blockedCurrentUser = await BlockedUser.findAll({
      where: { blocked_user_id: user.id },
    });
    const blockedCurrentUserIds = blockedCurrentUser.map(
      (blockedUser) => blockedUser.user_id
    );

    // Combine both lists of blocked user IDs
    const allBlockedUserIds = [
      ...new Set([...blockedUserIds, ...blockedCurrentUserIds]),
    ];

    // Get friends list of the current user based on the Request model
    const friendRequests = await Request.findAll({
      where: {
        [Op.or]: [
          { sender_id: user.id, request_status: "accepted" },
          { receiver_id: user.id, request_status: "accepted" },
        ],
      },
    });

    const friendIds = friendRequests.map((request) =>
      request.sender_id === user.id ? request.receiver_id : request.sender_id
    );

    // Get list of users to whom the current user has sent a pending friend request
    const pendingRequestsSent = await Request.findAll({
      where: {
        sender_id: user.id,
        request_status: "pending",
      },
    });

    let OutOfAgeRange;
    let OutOfAgeRangeIds;

    if (ageRange) {
      OutOfAgeRange = await User.findAll({
        where: {
          age: { [Op.notBetween]: ageRange },
        },
        attributes: ["id"],
      });
    }

    OutOfAgeRangeIds = OutOfAgeRange
      ? OutOfAgeRange.map((user) => user.id)
      : [];

    let usersNotWithGoals;
    let OutOfGoalsIds;

    if (checkInGoals) {
      usersNotWithGoals = await User.findAll({
        include: [
          {
            model: UserCheckIn,
            where: {
              category: { [Op.notIn]: checkInGoals },
            },
            attributes: ["id"],
          },
        ],
      });
    }

    OutOfGoalsIds = usersNotWithGoals
      ? usersNotWithGoals.map((user) => user.id)
      : [];

    const pendingRequestSentIds = pendingRequestsSent.map(
      (request) => request.receiver_id
    );

    const unionOfIds = [...new Set([...OutOfGoalsIds, ...OutOfAgeRangeIds])];

    // Combine all filtered user IDs (blocked users, filters, friends, and pending requests sent)
    const allFilteredUserIds = [
      ...new Set([
        ...allBlockedUserIds,
        ...friendIds,
        //...pendingRequestSentIds,
        ...unionOfIds,
      ]),
    ];

    if (placeid) {
      // Ensure placeid is an array
      if (!Array.isArray(placeid)) {
        placeid = placeid.split(",");
      }

      const venuesWithDetails = [];

      // Fetch details for each placeid
      for (const id of placeid) {
        const venue = await Venue.findOne({ where: { placeId: id } });
        if (venue) {
          const { categoryCounts, users } = await getCategoryCountsAndUsers(
            venue.venueId
          );

          // Filter out blocked users, friends, and users with pending requests from the users list
          const filteredUsers = users.filter(
            (fetchedUser) => !allFilteredUserIds.includes(fetchedUser.id)
          );

          // Add userStatus to each user
          let enrichedUsers = await Promise.all(
            filteredUsers.map(async (fetchedUser) => {
              if (fetchedUser.id === user.id) {
                fetchedUser.dataValues.userStatus = "yourself";
              } else {
                const request = await Request.findOne({
                  where: {
                    [Op.or]: [
                      {
                        sender_id: fetchedUser.id,
                        receiver_id: user.id,
                        request_status: "pending",
                      },
                      {
                        sender_id: user.id,
                        receiver_id: fetchedUser.id,
                        request_status: "pending",
                      },
                    ],
                  },
                });

                if (request) {
                  fetchedUser.dataValues.userStatus = "pending";
                } else {
                  fetchedUser.dataValues.userStatus = "Not Friend";
                }
              }

              return fetchedUser;
            })
          );

          enrichedUsers = enrichedUsers.map((user) => {
            let userJSON = user.toJSON();
            userJSON.CheckInGoals = user.CheckInGoals.map((goal) => goal.goal);
            return userJSON;
          });

          venuesWithDetails.push({
            ...venue.dataValues,
            categoryCounts,
            users: enrichedUsers,
          });
        }
      }

      if (venuesWithDetails.length > 0) {
        return res.status(200).json({
          status: true,
          message: "Venues found",
          venues: venuesWithDetails,
        });
      } else {
        return res.status(200).json({
          status: false,
          message: "No venues found for the given place IDs",
          venues: [],
        });
      }
    } else {
      // If no placeid query parameter is provided, return all venues
      const allVenues = await Venue.findAll();
      const allVenuesWithDetails = await Promise.all(
        allVenues.map(async (venue) => {
          const { categoryCounts, users } = await getCategoryCountsAndUsers(
            venue.venueId
          );

          // Filter out blocked users, friends, and users with pending requests from the users list
          const filteredUsers = users.filter(
            (fetchedUser) => !allFilteredUserIds.includes(fetchedUser.id)
          );

          // Add userStatus to each user
          let enrichedUsers = await Promise.all(
            filteredUsers.map(async (fetchedUser) => {
              if (fetchedUser.id === user.id) {
                fetchedUser.dataValues.userStatus = "yourself";
              } else { 
      
              const request = await Request.findOne({
                where: {
                  [Op.or]: [
                    {
                      sender_id: fetchedUser.id,
                      receiver_id: user.id,
                      request_status: "pending",
                    },
                    {
                      sender_id: user.id,
                      receiver_id: fetchedUser.id,
                      request_status: "pending",
                    },
                  ],
                },
              });

                if (request) {
                  fetchedUser.dataValues.userStatus = "pending";
                } else {
                  fetchedUser.dataValues.userStatus = "Not Friend";
                }
              }

              return fetchedUser;
            })
          );

          enrichedUsers = enrichedUsers.map((user) => {
            let userJSON = user.toJSON();
            userJSON.CheckInGoals = user.CheckInGoals.map((goal) => goal.goal);
            return userJSON;
          });

          return {
            ...venue.dataValues,
            categoryCounts,
            users: enrichedUsers,
          };
        })
      );

      return res.status(200).json({
        status: true,
        message: "All venues fetched successfully",
        venues: allVenuesWithDetails,
      });
    }
  } catch (error) {
    console.error("Error fetching venues: ", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Check in user to venue
exports.checkInUser = async (req, res) => {
  try {
    const { userId, placeId, category, venueLoc, userLoc } = req.body;

    if (!venueLoc)
      return res
        .status(400)
        .json({ status: false, message: "Venue Location required" });
    // Check if user exists using UId
    if (!userLoc)
      return res
        .status(400)
        .json({ status: false, message: "User Location required" });
    // Check if user exists using UId

    if (!venueLoc.latitude || !venueLoc.longitude)
      return res.status(400).json({
        status: false,
        message: "venueLoc must have latitude and longitude",
      });
    if (!userLoc.latitude || !userLoc.longitude)
      return res.status(400).json({
        status: false,
        message: "userLoc must have latitude and longitude",
      });

    const user = await User.findOne({
      where: { UId: userId },
      include: [UserPicture],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const distance = calculateDistance(
      venueLoc.latitude,
      venueLoc.longitude,
      userLoc.latitude,
      userLoc.longitude
    );

    if (distance > 100)
      return res.status(401).json({
        status: false,
        message:
          "You cannot checkin the desired venue because you are not in the 50 m radius",
      });

    //Check if user is already checked in at any venue
    const previousCheckIn = await UserCheckIn.findOne({
      where: { userId: user.id },
    });

    if (previousCheckIn) {
      // Decrement the total count for the previous venue, ensuring it does not go below zero
      const previousVenue = await Venue.findByPk(previousCheckIn.venueId);
      if (previousVenue.totalCheckIns > 0) {
        previousVenue.totalCheckIns -= 1;
      }
      await previousVenue.save();

      await UserCheckIn.destroy({
        where: { userId: user.id, venueId: previousVenue.venueId },
      });
    }

    let venue = await Venue.findOne({ where: { placeId } });

    if (!venue) {
      // Create new venue if it does not exist
      venue = await Venue.create({ placeId, totalCheckIns: 0 });
    }

    //Edit the check in goal for the user
    
    // Delete pre-existing check-in goals and update with new ones
    await CheckInGoals.destroy({ where: { userId: user.id } });

    //create new checkin goal
    await CheckInGoals.create({userId: user.id, goal: category});

    await UserCheckIn.create({
      userId: user.id,
      venueId: venue.venueId,
      category,
    });

    // Increment total check-ins for the venue
    venue.totalCheckIns += 1;
    await venue.save();

    // Fetch updated category counts and users
    const { categoryCounts, users } = await getCategoryCountsAndUsers(
      venue.venueId
    );

    // Get blocked user list of the current user
    const blockedByCurrentUser = await BlockedService.getAllBlocks(user.id);
    const blockedUserIds = blockedByCurrentUser.map(
      (blockedUser) => blockedUser.blocked_user_id
    );

    // Get list of users who have blocked the current user
    const blockedCurrentUser = await BlockedUser.findAll({
      where: { blocked_user_id: user.id },
    });
    const blockedCurrentUserIds = blockedCurrentUser.map(
      (blockedUser) => blockedUser.user_id
    );

    // Combine both lists of blocked user IDs
    const allBlockedUserIds = [
      ...new Set([...blockedUserIds, ...blockedCurrentUserIds]),
    ];

    // Get friends list of the current user based on the Request model
    const friendRequests = await Request.findAll({
      where: {
        [Op.or]: [
          { sender_id: user.id, request_status: "accepted" },
          { receiver_id: user.id, request_status: "accepted" },
        ],
      },
    });

    const friendIds = friendRequests.map((request) =>
      request.sender_id === user.id ? request.receiver_id : request.sender_id
    );

    // Get list of users to whom the current user has sent a pending friend request
    const pendingRequestsSent = await Request.findAll({
      where: {
        sender_id: user.id,
        request_status: "pending",
      },
    });

    const pendingRequestSentIds = pendingRequestsSent.map(
      (request) => request.receiver_id
    );

    // Combine all filtered user IDs (blocked users, friends, and pending requests sent)
    const allFilteredUserIds = [
      ...new Set([
        ...allBlockedUserIds,
        ...friendIds,
        //...pendingRequestSentIds,
      ]),
    ];

    // Filter out blocked users, friends, and users with pending requests from the users list
    const filteredUsers = users.filter(
      (fetchedUser) => !allFilteredUserIds.includes(fetchedUser.id)
    );

    // Add userStatus to each user
    let enrichedUsers = await Promise.all(
      filteredUsers.map(async (fetchedUser) => {
        if (fetchedUser.id === user.id) {
          fetchedUser.dataValues.userStatus = "yourself";
        } else {
          const request = await Request.findOne({
            where: {
              [Op.or]: [
                {
                  sender_id: fetchedUser.id,
                  receiver_id: user.id,
                  request_status: "pending",
                },
                {
                  sender_id: user.id,
                  receiver_id: fetchedUser.id,
                  request_status: "pending",
                },
              ],
            },
          });

          if (request) {
            fetchedUser.dataValues.userStatus = "pending";
          } else {
            fetchedUser.dataValues.userStatus = "Not Friend";
          }
        }

        return fetchedUser;
      })
    );
    enrichedUsers = enrichedUsers.map((user) => {
      let userJSON = user.toJSON();
      userJSON.CheckInGoals = user.CheckInGoals.map((goal) => goal.goal);
      return userJSON;
    });

    res.status(200).json({
      status: true,
      message: "User checked in successfully",
      venue: {
        ...venue.dataValues,
        categoryCounts,
        users: enrichedUsers,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// Check out user from venue
exports.checkOutUser = async (req, res) => {
  try {
    const { userId, placeId } = req.body;

    // Check if user exists using UId
    const user = await User.findOne({
      where: { UId: userId },
      include: [UserPicture],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Check if the venue exists
    const venue = await Venue.findOne({ where: { placeId } });
    if (!venue) {
      return res
        .status(404)
        .json({ status: false, message: "Venue not found" });
    }

    // Check if user is checked in at the given venue
    const userCheckIn = await UserCheckIn.findOne({
      where: { userId: user.id, venueId: venue.venueId },
    });
    if (!userCheckIn) {
      return res.status(409).json({
        status: false,
        message: "User is not checked in at this venue",
      });
    }

    // Decrement the total count for the venue, ensuring it does not go below zero
    if (venue.totalCheckIns > 0) {
      venue.totalCheckIns -= 1;
    }
    await venue.save();

    // Remove the check-in entry
    await UserCheckIn.destroy({
      where: { userId: user.id, venueId: venue.venueId },
    });

    // Fetch updated category counts and users
    const { categoryCounts, users } = await getCategoryCountsAndUsers(
      venue.venueId
    );

    res.status(200).json({
      status: true,
      message: "User checked out successfully",
      venue: {
        ...venue.dataValues,
        categoryCounts,
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.checkOutUserByVenueId = async (req, res) => {
  try {
    const { userId, venueId } = req.body;

    // Check if user exists using UId
    const user = await User.findOne({
      where: { UId: userId },
      include: [UserPicture],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Check if the venue exists
    const venue = await Venue.findOne({ where: { venueId } });
    if (!venue) {
      return res
        .status(404)
        .json({ status: false, message: "Venue not found" });
    }

    // Check if user is checked in at the given venue
    const userCheckIn = await UserCheckIn.findOne({
      where: { userId: user.id, venueId: venue.venueId },
    });
    if (!userCheckIn) {
      return res.status(409).json({
        status: false,
        message: "User is not checked in at this venue",
      });
    }

    // Decrement the total count for the venue, ensuring it does not go below zero
    if (venue.totalCheckIns > 0) {
      venue.totalCheckIns -= 1;
    }
    await venue.save();

    // Remove the check-in entry
    await UserCheckIn.destroy({
      where: { userId: user.id, venueId: venue.venueId },
    });

    // Fetch updated category counts and users
    const { categoryCounts, users } = await getCategoryCountsAndUsers(
      venue.venueId
    );

    res.status(200).json({
      status: true,
      message: "User checked out successfully",
      venue: {
        ...venue.dataValues,
        categoryCounts,
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
