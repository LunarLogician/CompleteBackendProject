const User = require('../models/User');
const VoucherUser = require('../models/VoucherUser');

const checkRequest = async (req, res, next) =>{
    try {
        const { senderUID } = req.body;

        if (!senderUID) return res.status(400).json({ status: false, message: "sender UID cannot be Null" });
    
        const userExists = await User.findOne({
          where: { UId: senderUID },
        });
    
        if (!userExists) return res.status(404).json({ status: false, message: "Sender Not Found", error: "User not found"});

        //check if the user is subscribed and the expiry date of the subscription
        if(userExists.subscribed){
            //check if expiry date of the user has passed
            const voucherSubscribed = await VoucherUser.findOne({where: {userId: userExists.id}});
            
            const currentDate = new Date();
  
            // Parse the expiry date
            const expiryDateObj = new Date(voucherSubscribed.expiryDate);            

            if(currentDate>expiryDateObj){
                userExists.subscribed = false;
                await userExists.save();

                await VoucherUser.destroy({where: {userId: userExists.id}});
            }
        }

        next();
    } catch (error) {
        return res.status(500).json({status: false, message: "Error in Checking Subscription", error: error.message});
    }
};

module.exports = {checkRequest};