import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader ) {
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }
  console.log(authHeader)
  const token = authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next(); // proceed to the protected route
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
