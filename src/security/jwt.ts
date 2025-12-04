import jwt from 'jsonwebtoken';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ? Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf-8') : '';
const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ? Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf-8') : '';

if (!PRIVATE_KEY || !PUBLIC_KEY) {
    console.warn('⚠️ JWT Keys not configured. Using insecure fallback for development only.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-me';

const JWT_SIGN_OPTS: jwt.SignOptions = {
    expiresIn: '1h',
    issuer: 'quantum-cert-backend',
    audience: 'quantum-cert-users'
};

const JWT_VERIFY_OPTS: jwt.VerifyOptions = {
    issuer: 'quantum-cert-backend',
    audience: 'quantum-cert-users'
};

const REFRESH_SIGN_OPTS: jwt.SignOptions = {
    expiresIn: '7d',
    issuer: 'quantum-cert-backend',
    audience: 'quantum-cert-users'
};

const REFRESH_VERIFY_OPTS: jwt.VerifyOptions = {
    issuer: 'quantum-cert-backend',
    audience: 'quantum-cert-users'
};

export const generateAccessToken = (userId: string, role: string) => {
    if (PRIVATE_KEY) {
        return jwt.sign({ userId, role }, PRIVATE_KEY, { ...JWT_SIGN_OPTS, algorithm: 'RS256' });
    }
    return jwt.sign({ userId, role }, JWT_SECRET, { ...JWT_SIGN_OPTS, algorithm: 'HS256' });
};

export const verifyAccessToken = (token: string) => {
    try {
        if (PUBLIC_KEY) {
            return jwt.verify(token, PUBLIC_KEY, { ...JWT_VERIFY_OPTS, algorithms: ['RS256'] });
        }
        return jwt.verify(token, JWT_SECRET, { ...JWT_VERIFY_OPTS, algorithms: ['HS256'] });
    } catch (error) {
        return null;
    }
};

export const generateRefreshToken = (userId: string) => {
    if (PRIVATE_KEY) {
        return jwt.sign({ userId, type: 'refresh' }, PRIVATE_KEY, { ...REFRESH_SIGN_OPTS, algorithm: 'RS256' });
    }
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { ...REFRESH_SIGN_OPTS, algorithm: 'HS256' });
};

export const verifyRefreshToken = (token: string) => {
    try {
        if (PUBLIC_KEY) {
            return jwt.verify(token, PUBLIC_KEY, { ...REFRESH_VERIFY_OPTS, algorithms: ['RS256'] });
        }
        return jwt.verify(token, JWT_SECRET, { ...REFRESH_VERIFY_OPTS, algorithms: ['HS256'] });
    } catch (error) {
        return null;
    }
};
