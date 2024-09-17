const User = require('../models/User');
const VoucherUser = require('../models/VoucherUser');
const Voucher = require('../models/Voucher');

const categoryName = {
    "0": "Specific",
    "1": "Category",
};
const checkSubscription = async (req, res, next) =>{
    try {
        const { userId } = req.query;

        if (!userId) return res.status(400).json({ status: false, message: "User UID cannot be Null" });
        
        req.showResult = false;

        const userExists = await User.findOne({
          where: { UId: userId },
        });
    
        if (!userExists) return res.status(404).json({ status: false, message: "User Not Found", error: "User not found"});

        //check if the user is subscribed and the expiry date of the subscription
        if(userExists.subscribed){
            //check if expiry date of the user has passed
            const voucherSubscribed = await VoucherUser.findOne({where: {userId: userExists.id}});
            
            const VoucherExists = await Voucher.findOne({where: {id: voucherSubscribed.voucherId}});

            const currentDate = new Date();
            const currentDay = currentDate.getDay();

            if(categoryName[parseInt(VoucherExists.category)] === "Specific")
                req.showResult = await VoucherExists.activeDays.includes(currentDay)  ? true : false;
            else
                req.showResult = true

            // Parse the expiry date
            const expiryDateObj = new Date(voucherSubscribed.expiryDate);            

            if(currentDate > expiryDateObj){
                userExists.subscribed = false;
                userExists.radius = 100;
                req.showResult = false;
                await userExists.save();

                await VoucherUser.destroy({where: {userId: userExists.id}});
            }
        }

        req.user = userExists;
        
        next();
        
    } catch (error) {
        return res.status(500).json({status: false, message: "Error in Checking Subscription", error: error.message});
    }
};

module.exports = {checkSubscription};