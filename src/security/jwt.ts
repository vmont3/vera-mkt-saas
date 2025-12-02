import jwt from 'jsonwebtoken';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ? Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf-8') : '';
const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ? Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf-8') : '';

if (!PRIVATE_KEY || !PUBLIC_KEY) {
    console.warn('⚠️ JWT Keys not configured. Using insecure fallback for development only.');
}

export const generateAccessToken = (userId: string, role: string) => {
    if (PRIVATE_KEY) {
        return jwt.sign({ userId, role }, PRIVATE_KEY, { expiresIn: '1h', algorithm: 'RS256' });
    }
    return jwt.sign({ userId, role }, SECRET, { expiresIn: '1h', algorithm: 'HS256' });
};

export const verifyAccessToken = (token: string) => {
    try {
        if (PUBLIC_KEY) {
            return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
        }
        return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        return null;
    }
};

export const generateRefreshToken = (userId: string) => {
    if (PRIVATE_KEY) {
        return jwt.sign({ userId, type: 'refresh' }, PRIVATE_KEY, { expiresIn: '7d', algorithm: 'RS256' });
    }
    return jwt.sign({ userId, type: 'refresh' }, SECRET, { expiresIn: '7d', algorithm: 'HS256' });
};

export const verifyRefreshToken = (token: string) => {
    try {
        if (PUBLIC_KEY) {
            return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
        }
        return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        return null;
    }
};
