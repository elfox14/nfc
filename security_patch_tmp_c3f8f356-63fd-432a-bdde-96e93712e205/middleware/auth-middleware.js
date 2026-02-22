const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    // ????? ??? ?????? ?? Authorization header ?? ?? ??????
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.cookies && req.cookies.token);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ??????: ???? ?? JWT_SECRET ????? ?? ?????/Secret Manager
