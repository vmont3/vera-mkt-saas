import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSubject = async (req: Request, res: Response) => {
    try {
        const { name, description, category, estimatedValue, serialNumber } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Process uploaded images
        const files = req.files as any[];
        const imageUrls = files?.map((file: any) => `/uploads/${file.filename}`) || [];

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
                ...subject.publicMetadata as any,
                createdAt: subject.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
};

export const getSubjects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

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
            ...subject.publicMetadata as any,
            createdAt: subject.createdAt
        }));

        res.json({ success: true, subjects: formattedSubjects });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
};

export const getSubjectById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

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
                ...subject.publicMetadata as any,
                createdAt: subject.createdAt
            }
        });
    } catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ error: 'Failed to fetch subject' });
    }
};

export const updateSubject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, category, estimatedValue, serialNumber } = req.body;
        const userId = (req as any).user?.userId;

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
            ...(existingSubject.publicMetadata as any),
            name: name || (existingSubject.publicMetadata as any)?.name,
            description: description || (existingSubject.publicMetadata as any)?.description,
            category: category || (existingSubject.publicMetadata as any)?.category,
            estimatedValue: estimatedValue ? parseFloat(estimatedValue) : (existingSubject.publicMetadata as any)?.estimatedValue,
            serialNumber: serialNumber || (existingSubject.publicMetadata as any)?.serialNumber
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
                ...subject.publicMetadata as any,
                createdAt: subject.createdAt
            }
        });
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({ error: 'Failed to update subject' });
    }
};

export const deleteSubject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

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
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: 'Failed to delete subject' });
    }
};
