const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stayhub_super_secret_jwt_key_2026_dbms_viva_project';

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Authentication token required.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired authentication token.' });
    }
}

// Middleware to authorize specific user roles
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access forbidden: Insufficient permissions. Required role: ${allowedRoles.join(' or ')}.` 
            });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRoles,
    JWT_SECRET
};

