const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        console.log('No token provided');
        return res.status(401).json({status: false, message: "No token Provided"});
    }

    // Extract the token part from the header
    const token = authHeader && authHeader.split(" ")[1]; // Extract the token part
    if (!token) {
        console.log('Invalid token format');
        return res.status(401).json({status: false, message: "Invalid token format"});
    }

    // Logging for debugging
    console.log('Received Token:', token);
    console.log('Secret Key:', process.env.MYSECRET);

    jwt.verify(token, process.env.MYSECRET, (err, decoded) => {
        if (err) {
            console.log('Token verification failed:', err);
            return res.status(500).json({ status: false, message: 'Failed to authenticate token' });
        }

        // Optionally, you can attach the decoded token to the request object
        req.user = decoded;
        
        next();
    });

};

module.exports = {authenticateToken};
