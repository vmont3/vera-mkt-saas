import { Request, Response } from 'express';
import { IncidentService } from '../services/incidents/IncidentService';

export class IncidentController {
    private static incidentService = new IncidentService();

    /**
     * POST /v1/quantum-cert/incidentes
     * User-reported incident
     */
    static async createIncident(req: Request, res: Response) {
        try {
            const {
                tagId,
                subjectId,
                partnerAssetId,
                type,
                description,
                incidentDate,
                attachments,
            } = req.body;

            const incident = await IncidentController.incidentService.createIncident({
                tagId,
                subjectId,
                partnerAssetId,
                type,
                description,
                reportedBy: (req as any).user?.id, // Assuming auth middleware
                incidentDate: new Date(incidentDate),
                attachments,
            });

            res.status(201).json(incident);
        } catch (error: any) {
            console.error('Create incident error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * POST /v1/quantum-cert/incidentes/delegado
     * Authority-reported incident with audit
     */
    static async createAuthorityIncident(req: Request, res: Response) {
        try {
            const {
                tagId,
                subjectId,
                partnerAssetId,
                type,
                description,
                incidentDate,
                authorityOrg,
                authorityId,
                officialProtocol,
                externalRefs,
                notes,
                auditAttachments,
            } = req.body;

            const incident = await IncidentController.incidentService.createAuthorityIncident({
                tagId,
                subjectId,
                partnerAssetId,
                type,
                description,
                reportedBy: (req as any).user?.id,
                incidentDate: new Date(incidentDate),
                authorityOrg,
                authorityId,
                officialProtocol,
                externalRefs,
                notes,
                auditAttachments,
                ipAddress: req.ip,
            });

            res.status(201).json(incident);
        } catch (error: any) {
            console.error('Create authority incident error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * GET /v1/quantum-cert/incidentes/pendentes
     * List pending incidents for logged-in owner
     */
    static async listPending(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const incidents = await IncidentController.incidentService.listPendingIncidents(userId);

            res.json(incidents);
        } catch (error: any) {
            console.error('List pending error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /v1/quantum-cert/incidentes/:id/aprovar
     * Approve incident
     */
    static async approve(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reviewNotes } = req.body;
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const incident = await IncidentController.incidentService.approveIncident(
                id,
                userId,
                reviewNotes
            );

            res.json(incident);
        } catch (error: any) {
            console.error('Approve incident error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * POST /v1/quantum-cert/incidentes/:id/rejeitar
     * Reject incident
     */
    static async reject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reviewNotes } = req.body;
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!reviewNotes) {
                return res.status(400).json({ error: 'reviewNotes required for rejection' });
            }

            const incident = await IncidentController.incidentService.rejectIncident(
                id,
                userId,
                reviewNotes
            );

            res.json(incident);
        } catch (error: any) {
            console.error('Reject incident error:', error);
            res.status(400).json({ error: error.message });
        }
    }
}
