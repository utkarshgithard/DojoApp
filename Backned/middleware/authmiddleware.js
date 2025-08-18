import jwt from 'jsonwebtoken';
import {User} from '../models/User.js';

export const verifyToken = async(req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('--------token-----:::')
  console.log(authHeader)
  if (!authHeader ) {
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }
  // console.log(authHeader)
  const token = authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded)
   
    req.userId = decoded.userId;
    const user = await User.findById(decoded.userId).select('-password');
    req.user = user;
    next(); // proceed to the protected route
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export function verifySocketToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

