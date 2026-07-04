import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.config.js';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';

function signAccessToken(admin) {
  const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
  return jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, jwtSecret, { expiresIn: ACCESS_EXPIRES });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, errors: { email: 'required', password: 'required' } });

  try {
    const normalizedEmail = email.toLowerCase();
    const admin = await db.get('SELECT * FROM admins WHERE email = ?', [normalizedEmail]);
    const isDevAdminCredentials = process.env.DEV_ADMIN_EMAIL && process.env.DEV_ADMIN_PASSWORD && normalizedEmail === process.env.DEV_ADMIN_EMAIL.toLowerCase() && password === process.env.DEV_ADMIN_PASSWORD;

    // If no admin exists and env provides a dev admin, allow creation for dev convenience.
    if (!admin && isDevAdminCredentials) {
      const id = uuidv4();
      const hash = await bcrypt.hash(password, 10);
      await db.run('INSERT INTO admins (id, email, password_hash, role) VALUES (?,?,?,?)', [id, normalizedEmail, hash, 'admin']);
      const created = { id, email: normalizedEmail, role: 'admin' };
      const accessToken = signAccessToken(created);
      const refreshToken = uuidv4();
      await db.run('UPDATE admins SET refresh_token = ? WHERE id = ?', [refreshToken, id]);
      return res.json({ success: true, data: { accessToken, refreshToken, user: created } });
    }

    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (isDevAdminCredentials) {
      const hash = await bcrypt.hash(password, 10);
      await db.run('UPDATE admins SET password_hash = ?, role = ? WHERE id = ?', [hash, 'admin', admin.id]);
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const accessToken = signAccessToken(admin);
    const refreshToken = uuidv4();
    await db.run('UPDATE admins SET refresh_token = ? WHERE id = ?', [refreshToken, admin.id]);

    return res.json({ success: true, data: { accessToken, refreshToken, user: { id: admin.id, email: admin.email, role: admin.role } } });
  } catch (err) {
    console.error('Admin login error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ success: false, errors: { refreshToken: 'required' } });

  try {
    const admin = await db.get('SELECT * FROM admins WHERE refresh_token = ?', [refreshToken]);
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const accessToken = signAccessToken(admin);
    const newRefreshToken = uuidv4();
    await db.run('UPDATE admins SET refresh_token = ? WHERE id = ?', [newRefreshToken, admin.id]);

    return res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    console.error('Refresh token error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export default { login, refresh };
