import { Request, Response } from 'express';
import { OwnershipTransferService } from '../services/ownership/OwnershipTransferService';

const ownershipService = new OwnershipTransferService();

export const initiateTransfer = async (req: Request, res: Response) => {
    try {
        const { assetId, toOwnerId } = req.body;
        const fromOwnerId = (req as any).user.id; // Assumes auth middleware populates user

        const transfer = await ownershipService.initiateTransfer(assetId, fromOwnerId, toOwnerId);
        res.status(201).json(transfer);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const acceptTransfer = async (req: Request, res: Response) => {
    try {
        const { transferId } = req.params;
        const newOwnerId = (req as any).user.id;

        const result = await ownershipService.acceptTransfer(transferId, newOwnerId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const rejectTransfer = async (req: Request, res: Response) => {
    try {
        const { transferId } = req.params;
        const userId = (req as any).user.id;

        const result = await ownershipService.rejectTransfer(transferId, userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const cancelTransfer = async (req: Request, res: Response) => {
    try {
        const { transferId } = req.params;
        const userId = (req as any).user.id;

        const result = await ownershipService.cancelTransfer(transferId, userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getUserTransfers = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const transfers = await ownershipService.getUserTransfers(userId);
        res.json(transfers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
