import jwt from 'jsonwebtoken';

const SECRET = 'YOUR_SUPER_SECRET_KEY'; // keep in environment variables

export function verifyAdminToken(token: string) {
  try {
    const payload = jwt.verify(token, SECRET);
    return true;
  } catch (e) {
    return false;
  }
}
