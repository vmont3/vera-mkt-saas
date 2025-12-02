"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubject = exports.updateSubject = exports.getSubjectById = exports.getSubjects = exports.createSubject = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createSubject = async (req, res) => {
    try {
        const { name, description, category, estimatedValue, serialNumber } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Process uploaded images
        const files = req.files;
        const imageUrls = files?.map((file) => `/uploads/${file.filename}`) || [];
        const subject = await prisma.subject.create({
            data: {
                type: category || 'general',
                ownerId: userId,
                publicMetadata: {
                    name,
                    description,
                    category,
                    estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
                    serialNumber,
                    images: imageUrls,
                    status: 'active'
                }
            }
        });
        res.status(201).json({
            success: true,
            subject: {
                id: subject.id,
                ...subject.publicMetadata,
                createdAt: subject.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
};
exports.createSubject = createSubject;
const getSubjects = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const subjects = await prisma.subject.findMany({
            where: { ownerId: userId },
            orderBy: { createdAt: 'desc' }
        });
        const formattedSubjects = subjects.map(subject => ({
            id: subject.id,
            type: subject.type,
            ...subject.publicMetadata,
            createdAt: subject.createdAt
        }));
        res.json({ success: true, subjects: formattedSubjects });
    }
    catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
};
exports.getSubjects = getSubjects;
const getSubjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const subject = await prisma.subject.findFirst({
            where: {
                id,
                ownerId: userId
            }
        });
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        res.json({
            success: true,
            subject: {
                id: subject.id,
                type: subject.type,
                ...subject.publicMetadata,
                createdAt: subject.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ error: 'Failed to fetch subject' });
    }
};
exports.getSubjectById = getSubjectById;
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, estimatedValue, serialNumber } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const existingSubject = await prisma.subject.findFirst({
            where: { id, ownerId: userId }
        });
        if (!existingSubject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        const updatedMetadata = {
            ...existingSubject.publicMetadata,
            name: name || existingSubject.publicMetadata?.name,
            description: description || existingSubject.publicMetadata?.description,
            category: category || existingSubject.publicMetadata?.category,
            estimatedValue: estimatedValue ? parseFloat(estimatedValue) : existingSubject.publicMetadata?.estimatedValue,
            serialNumber: serialNumber || existingSubject.publicMetadata?.serialNumber
        };
        const subject = await prisma.subject.update({
            where: { id },
            data: {
                type: category || existingSubject.type,
                publicMetadata: updatedMetadata
            }
        });
        res.json({
            success: true,
            subject: {
                id: subject.id,
                ...subject.publicMetadata,
                createdAt: subject.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({ error: 'Failed to update subject' });
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const subject = await prisma.subject.findFirst({
            where: { id, ownerId: userId }
        });
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        await prisma.subject.delete({ where: { id } });
        res.json({ success: true, message: 'Subject deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: 'Failed to delete subject' });
    }
};
exports.deleteSubject = deleteSubject;
