const BlockedUser = require("../models/Blocked");

exports.createBlockUser = async (data) => {
  return await BlockedUser.create(data);
};

exports.findBlockUser = async (id, blocker) => {
  return await BlockedUser.findOne({
    where: { user_id: blocker, blocked_user_id: id },
  });
};

exports.getAllBlocks = async (id) => {
  return await BlockedUser.findAll({ where: { user_id: id } });
};
exports.getAllRealBlocks = async () => {
  return await BlockedUser.findAll();
};
