import { Request, Response } from 'express';
import { VerificationService } from '../services/verification/VerificationService';

export class VerificationController {
    private static verificationService = new VerificationService();

    /**
     * POST /v1/quantum-cert/verify-tag
     * Main verification endpoint
     */
    static async verifyTag(req: Request, res: Response) {
        try {
            const { url, d, r, m, deviceId, appId, geoLocation } = req.body;

            const result = await VerificationController.verificationService.verifyTag({
                url,
                d,
                r,
                m,
                deviceId,
                appId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                geoLocation,
            });

            res.json(result);
        } catch (error: any) {
            console.error('Verification error:', error);
            res.status(400).json({
                status_validacao: 'ERRO',
                mensagem: error.message || 'Erro na verificação',
            });
        }
    }

    /**
     * POST /v1/quantum-cert/verify-offline-sync
     * Batch offline verification sync
     */
    static async verifyOfflineSync(req: Request, res: Response) {
        try {
            const { verifications } = req.body;

            if (!Array.isArray(verifications)) {
                return res.status(400).json({ error: 'verifications must be an array' });
            }

            const results = await Promise.all(
                verifications.map((v: any) =>
                    VerificationController.verificationService.verifyTag({
                        ...v,
                        ipAddress: req.ip,
                        isOfflineSync: true,
                        offlineTimestamp: v.timestamp,
                    }).catch((error) => ({
                        status_validacao: 'ERRO',
                        mensagem: error.message,
                        original: v,
                    }))
                )
            );

            res.json({ results });
        } catch (error: any) {
            console.error('Offline sync error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
