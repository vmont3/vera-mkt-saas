import { TagRepository } from "../../repositories/TagRepository";
import { getPrismaClient } from "../../database";

export interface PublicAssetData {
    numero_certificado?: string;
    tipo_registro?: string;
    id_usuario_mascarado?: string; // e.g. "Vin***"
    numero_serie?: string; // Chassi, ID produto, etc.
    status_validacao: string; // "VÁLIDO", "SUSPEITO", "BLOQUEADO"
    data_emissao?: Date;
    data_validade?: Date;
    origem_registro?: string; // "Quantum Cert", "Partner X"
    resumo_incidentes?: string[]; // Lista de tipos de incidentes
    contador_validacoes: number;
    nivel_confianca: string; // "ALTO", "MÉDIO", "BAIXO"
}

export class TagRegistry {
    private repository: TagRepository;

    constructor(repository?: TagRepository) {
        this.repository = repository || new TagRepository();
    }

    /**
     * Busca uma tag pelo ID interno (UUID)
     */
    async findByTagInternalId(id: string) {
        return this.repository.findById(id);
    }

    /**
     * Salva o UID real da tag após encoding
     */
    async saveUid(tagInternalId: string, uid: string | null): Promise<void> {
        if (!uid) return;

        // Verifica se já existe outra tag com esse UID (anti-clonagem simples no DB)
        const existing = await this.repository.findByUid(uid);

        if (existing && existing.id !== tagInternalId) {
            throw new Error(`UID ${uid} já está em uso por outra tag (${existing.id})`);
        }

        await this.repository.update(tagInternalId, { uid });
    }

    /**
     * Atualiza o status do encoding/tag
     */
    async saveEncodingStatus(tagInternalId: string, status: string): Promise<void> {
        await this.repository.updateStatus(tagInternalId, status);
    }

    /**
     * Resolve e valida o ativo associado à tag para exibição pública
     * 
     * @param hashTruncado Hash extraído da URL (verificação de integridade)
     * @param tagInternalId ID interno da tag
     */
    async resolveAssetForTag(hashTruncado: string, tagInternalId: string): Promise<PublicAssetData> {
        const tag = await this.findByTagInternalId(tagInternalId);

        if (!tag) {
            throw new Error("Tag não encontrada no registro.");
        }

        // 1. Validação de Integridade (Hash Truncado)
        if (tag.hashTruncated !== hashTruncado) {
            console.warn(`[TagRegistry] Hash mismatch! Tag: ${tagInternalId}, Received: ${hashTruncado}, Expected: ${tag.hashTruncated}`);
            throw new Error("Integridade da tag falhou (Hash inválido).");
        }

        // 2. Determinar Status da Validação
        let statusValidacao = "VÁLIDO";
        let nivelConfianca = "ALTO";

        if (tag.status === 'BLOCKED' || tag.status === 'STOLEN') {
            statusValidacao = "BLOQUEADO";
            nivelConfianca = "ZERO";
        } else if (tag.status === 'CANCELLED') {
            statusValidacao = "CANCELADO";
            nivelConfianca = "NULO";
        } else if (tag.status === 'PENDING_ENCODING') {
            statusValidacao = "NÃO ATIVADO";
            nivelConfianca = "BAIXO";
        }

        // 3. Verificar Incidentes
        const incidentes = tag.incidents.map((i: any) => i.type);
        if (incidentes.length > 0) {
            statusValidacao = "COM INCIDENTES";
            nivelConfianca = "MÉDIO/BAIXO";
        }

        // 4. Montar Dados Públicos (Sanitização)
        const asset = tag.partnerAsset;
        const subject = tag.linkedSubject;

        // Tenta extrair dados do PartnerAsset ou Subject
        const numeroSerie = asset?.metadata ? (asset.metadata as any).serialNumber || (asset.metadata as any).chassi : "N/A";
        const origem = asset?.partnerId ? "Parceiro Certificado" : "Quantum Cert Core";

        // Mascarar usuário (se houver owner)
        const ownerId = asset?.ownerId || subject?.ownerId;
        const idUsuarioMascarado = ownerId ? `${ownerId.substring(0, 4)}***${ownerId.substring(ownerId.length - 4)}` : "Não atribuído";

        return {
            numero_certificado: tag.id.split('-')[0].toUpperCase(), // Exemplo simples
            tipo_registro: asset?.type || subject?.type || "Desconhecido",
            id_usuario_mascarado: idUsuarioMascarado,
            numero_serie: numeroSerie,
            status_validacao: statusValidacao,
            data_emissao: tag.encodedAt || tag.createdAt,
            data_validade: undefined, // Implementar lógica de validade se necessário
            origem_registro: origem,
            resumo_incidentes: incidentes,
            contador_validacoes: 0, // TODO: Pegar do count de verificações
            nivel_confianca: nivelConfianca
        };
    }

    /**
     * Creates NTAG424Tag record after successful encoding
     * Called by TagEncodingService when encoder returns UID
     * 
     * @param params UID and queue job ID
     * @returns Created NTAG424Tag record
     */
    async createTagFromEncodingJob(params: {
        uid: string;
        queueJobId: string;
    }): Promise<any> {
        const { EncoderQueueRepository } = require("../../repositories/EncoderQueueRepository");
        const queueRepo = new EncoderQueueRepository();

        const queueJob = await queueRepo.findById(params.queueJobId);

        if (!queueJob) {
            throw new Error(`Encoding queue job ${params.queueJobId} not found`);
        }

        // Check if UID already exists (anti-cloning protection)
        const existingTag = await this.repository.findByUid(params.uid);

        if (existingTag) {
            throw new Error(`UID ${params.uid} already exists in database (tag: ${existingTag.id}). Possible cloning attempt!`);
        }

        // Create the NTAG424Tag record
        const tag = await this.repository.create({
            uid: params.uid,
            config: { connect: { id: queueJob.configId } },

            masterHashVaultKey: queueJob.masterHashVaultKey,
            hashTruncated: queueJob.hashTruncated,
            truncatedBits: 128,

            linkedSubject: queueJob.subjectId ? { connect: { id: queueJob.subjectId } } : undefined,
            partnerAsset: queueJob.partnerAssetId ? { connect: { id: queueJob.partnerAssetId } } : undefined,

            status: 'ACTIVE', // Tag is now encoded and ready for production
            lastAcceptedCtr: 0, // Initialize anti-replay counter

            encodedAt: new Date(),
            encodedBy: queueJob.operatorId,
            encoderStation: queueJob.stationId ? { connect: { id: queueJob.stationId } } : undefined
        });

        // Update the queue job with the created tag ID
        await queueRepo.complete(params.queueJobId, tag.id);

        console.log(`[TagRegistry] ✅ Created NTAG424Tag ${tag.id} for UID ${params.uid}`);

        return tag;
    }
}
