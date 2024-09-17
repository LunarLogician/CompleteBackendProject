const ReportUser = require('../models/Report');
const UserPicture = require('../models/UserPicture');
const User = require('../models/User');
const Sequelize = require('../config/database');

exports.createReport = async(data) =>{
    return await ReportUser.create(data);
};

exports.findReportedUser = async(id) =>{
    return await ReportUser.findOne({where: {reported_user_id: id}});
};

exports.getReportedUsers = async () => {
    try {
      // Fetch the reported users along with the IDs of the users who reported them
      const reportedUsers = await ReportUser.findAll({
        attributes: ['reported_user_id', 'user_id'],  // Fetch both reported_user_id and user_id
      });
  
      // Create a map where each reported user ID maps to an array of user IDs who reported them
      const userReportsMap = {};
      reportedUsers.forEach(rep => {
        if (!userReportsMap[rep.reported_user_id]) {
          userReportsMap[rep.reported_user_id] = [];
        }
        userReportsMap[rep.reported_user_id].push(rep.user_id);
      });
  
      const UniqueIds = Object.keys(userReportsMap).map(id => parseInt(id, 10));
  
      // Fetch users along with their pictures
      const users = await User.findAll({
        where: { id: UniqueIds },
        include: [UserPicture],
      });
  
      // Attach the array of reporting user IDs to each reported user
      const result = users.map(user => {
        return {
          ...user.toJSON(),
          reportedByUserIds: userReportsMap[user.id] || [],
        };
      });
  
      return result;
    } catch (error) {
      console.error('Error fetching reported users:', error);
      throw error;
    }
};