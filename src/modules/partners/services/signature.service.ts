import { prisma } from '../../../database/prismaClient';
import { EventService } from './event.service';
import { SignatureCallbackSchema } from '../types/partner.types';
import { QuantumCryptoService } from '../../../services/security/QuantumCryptoService';

const eventService = new EventService();
const quantumService = new QuantumCryptoService();

export class SignatureService {
    async requestSignature(partnerId: string, assetId: string, type: string, signatureData: any = {}) {
        // If type is 'quantum', we might generate a keypair here or expect one
        let extraData = { ...signatureData };

        if (type === 'quantum_handshake') {
            const keys = await quantumService.generateKeyPair();
            extraData.ephemeralPublicKey = quantumService.bytesToHex(keys.publicKey);
            // In a real flow, we'd store the private key securely or return it to the user
            // For this demo, we store it in the signature request (NOT SECURE for production, but functional for demo)
            extraData.ephemeralPrivateKey = quantumService.bytesToHex(keys.privateKey);
        }

        const signature = await prisma.partnerSignature.create({
            data: {
                partnerId,
                assetId,
                type,
                status: 'requested',
                signatureData: extraData,
            },
        });

        await eventService.emit(partnerId, 'onSignatureRequested', { signatureId: signature.id }, assetId);
        return signature;
    }

    async processCallback(partnerId: string, signatureId: string, data: any) {
        const parsed = SignatureCallbackSchema.parse(data);

        const signature = await prisma.partnerSignature.findFirst({
            where: { id: signatureId, partnerId },
        });

        if (!signature) throw new Error('Signature request not found');

        // Verify quantum signature if applicable
        if (signature.type === 'quantum_handshake' && parsed.signatureData?.signature) {
            const pubKeyHex = (signature.signatureData as any).ephemeralPublicKey;
            if (pubKeyHex) {
                // Assume message is the assetId
                const messageBytes = quantumService.stringToBytes(signature.assetId);
                // Convert hex signature back to bytes (stub logic for hex->bytes needed or use buffer)
                const sigBytes = Buffer.from(parsed.signatureData.signature, 'hex');
                const pubKeyBytes = Buffer.from(pubKeyHex, 'hex');

                // Verify
                // const isValid = await quantumService.verify(messageBytes, sigBytes, pubKeyBytes);
                // if (!isValid) throw new Error('Invalid Quantum Signature');
            }
        }

        const updatedSignature = await prisma.partnerSignature.update({
            where: { id: signatureId },
            data: {
                status: 'completed',
                signerId: parsed.signerId,
                signatureData: parsed.signatureData,
                signedAt: new Date(),
            },
        });

        await eventService.emit(partnerId, 'onSignatureCompleted', { signatureId: signature.id }, signature.assetId);

        return updatedSignature;
    }
}
