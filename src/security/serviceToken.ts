import jwt from 'jsonwebtoken';

const SERVICE_SECRET = process.env.SERVICE_JWT_SECRET || 'service-secret-changeme';

export const generateServiceToken = (serviceName: string) => {
    return jwt.sign({ service: serviceName, type: 'service' }, SERVICE_SECRET, { expiresIn: '1d' });
};

export const verifyServiceToken = (token: string) => {
    try {
        return jwt.verify(token, SERVICE_SECRET);
    } catch (error) {
        return null;
    }
};
