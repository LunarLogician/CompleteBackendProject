const express = require('express');

const messageController = require('../controllers/messageController');
const upload = require('../utils/storage');

const router = express.Router();

const {authenticateToken} = require('../middleware/verifyToken');

router.post('/send-message', upload.none(), messageController.sendmessage);
router.get('/get-messages', messageController.getMessages);
router.get('/getRecentMessages', messageController.getRecentMessages);


module.exports = router;