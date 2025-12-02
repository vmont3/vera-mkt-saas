"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../../../security/jwt");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user and wallet transactionally
        const user = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    kycStatus: 'pending'
                },
            });
            // 2. Create Wallet for User
            await tx.wallet.create({
                data: {
                    userId: newUser.id,
                    creditsBalance: 0,
                    moneyAvailable: 0,
                    moneyPending: 0
                }
            });
            return newUser;
        });
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user.id, 'user');
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                kycStatus: user.kycStatus
            }
        });
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
        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        // Verify password
        const isValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isValid)
            return res.status(401).json({ error: 'Invalid credentials' });
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user.id, 'user'); // Default role 'user' for now
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                kycStatus: user.kycStatus
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
