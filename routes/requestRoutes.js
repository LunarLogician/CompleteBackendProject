const express = require('express');
const requestController = require('../controllers/requestController');
const upload = require('../utils/storage');
const {authenticateToken} = require('../middleware/verifyToken');
const {checkSubscription} = require('../middleware/checkSubscription');
const {checkRequest} = require('../middleware/checkRequestSend');

const router = express.Router();


router.post('/sendRequest', upload.none(), checkRequest, requestController.sendRequest);
router.get('/getRequests', checkSubscription, requestController.getRequests);
router.put('/acceptRequest', upload.none(), requestController.acceptRequest);
router.put('/rejectRequest', upload.none(), requestController.rejectRequest);

router.get('/getFriendList', requestController.getFriendList);

module.exports = router;