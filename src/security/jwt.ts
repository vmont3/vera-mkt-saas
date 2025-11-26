import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'changeme';

export const generateAccessToken = (userId: string, role: string) => {
    return jwt.sign({ userId, role }, SECRET, { expiresIn: '1h', algorithm: 'HS256' });
};

export const verifyAccessToken = (token: string) => {
    try {
        return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        return null;
    }
};

export const generateRefreshToken = (userId: string) => {
    return jwt.sign({ userId, type: 'refresh' }, SECRET, { expiresIn: '7d', algorithm: 'HS256' });
};

export const verifyRefreshToken = (token: string) => {
    try {
        return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        return null;
    }
};
