import jwt from 'jsonwebtoken';
import db from '../config/db.config.js';

export async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const token = auth.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const payload = jwt.verify(token, jwtSecret);

    const user = await db.get('SELECT id, email, role FROM admins WHERE id = ?', [payload.sub]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token user' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export default { requireAdmin };
