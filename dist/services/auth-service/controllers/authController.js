"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const jwt_1 = require("../../../security/jwt");
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // const hashedPassword = await bcrypt.hash(password, 10);
        // Simulate user creation
        // const user = await prisma.user.create({
        //   data: {
        //     email,
        //     // password: hashedPassword, // Note: Schema doesn't have password field yet, assuming it will be added or handled via identity service
        //   },
        // });
        // For now, just return success
        return res.status(201).json({ success: true, message: 'User registered successfully (simulation)' });
    }
    catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Simulate user lookup
        // const user = await prisma.user.findUnique({ where: { email } });
        // if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        // Simulate password check
        // const isValid = await bcrypt.compare(password, user.password);
        // if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
        // Mock user for token generation
        const mockUserId = 'user-uuid-placeholder';
        const mockRole = 'user';
        const accessToken = (0, jwt_1.generateAccessToken)(mockUserId, mockRole);
        const refreshToken = (0, jwt_1.generateRefreshToken)(mockUserId);
        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: mockUserId,
                email,
                role: mockRole
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
