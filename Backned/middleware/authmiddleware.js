import jwt from 'jsonwebtoken';
import {User} from '../models/User.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader ) {
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }
  // console.log(authHeader)
  const token = authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded)
   
    req.userId = decoded.userId;
    next(); // proceed to the protected route
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token and get user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB and attach to req
      req.user = await User.findById(decoded.id).select('-password');

      next(); // pass control to next middleware/route
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};