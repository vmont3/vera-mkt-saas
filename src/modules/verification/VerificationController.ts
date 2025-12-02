import { Request, Response } from 'express';
import { VerificationService } from './VerificationService';

export class VerificationController {
    private service: VerificationService;

    constructor() {
        this.service = new VerificationService();
    }

    /**
     * POST /verify-tag
     * Recebe parâmetros da URL NDEF (via body JSON) e retorna dados públicos do ativo.
     */
    verify = async (req: Request, res: Response) => {
        try {
            // Espera receber { d, m, r, uid } no corpo da requisição
            // O frontend/mobile deve extrair da URL ou passar a URL completa para parsing (se implementado)
            const { d, m, r, uid } = req.body;

            if (!d || !m || !uid) {
                return res.status(400).json({
                    error: "Parâmetros obrigatórios ausentes. Necessário: d (enc), m (mac), uid (mirror), r (ctr - opcional/mirror)"
                });
            }

            const result = await this.service.verifyTag({ d, m, r, uid });

            return res.json(result);
        } catch (error: any) {
            console.error("[VerificationController] Erro na verificação:", error);
            // Retorna 400 ou 403 dependendo do erro, mas para segurança genérica 400/500
            return res.status(400).json({
                error: error.message || "Falha na verificação da tag."
            });
        }
    }
}
