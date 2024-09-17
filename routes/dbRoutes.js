const express = require('express');

const router = express.Router();

const dbController = require('../controllers/dbController');

router.delete('/deleteAllUsers', dbController.deleteAllUsers);
router.delete('/deleteAllTables', dbController.deleteAllTables);
router.post('/clearTable/:tableName', dbController.clearTable);

module.exports = router;
