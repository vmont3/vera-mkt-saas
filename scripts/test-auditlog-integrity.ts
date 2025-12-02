import { AuditLogService } from '../src/services/audit/AuditLogService';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const auditService = new AuditLogService();

async function main() {
    console.log('🔒 Testing AuditLog Chain-of-Custody Integrity...');

    // 1. Clean up old logs (optional, for clean test)
    // await prisma.auditLog.deleteMany({}); 

    // 2. Create a sequence of logs
    console.log('📝 Creating 3 audit logs...');
    await auditService.log({
        eventType: 'TEST_EVENT_1',
        severity: 'INFO',
        actorType: 'SYSTEM',
        payload: { step: 1 }
    });
    await new Promise(r => setTimeout(r, 100)); // Ensure timestamp diff
    await auditService.log({
        eventType: 'TEST_EVENT_2',
        severity: 'WARNING',
        actorType: 'USER',
        payload: { step: 2 }
    });
    await new Promise(r => setTimeout(r, 100));
    await auditService.log({
        eventType: 'TEST_EVENT_3',
        severity: 'CRITICAL',
        actorType: 'API',
        payload: { step: 3 }
    });

    // 3. Verify Integrity (Should be valid)
    console.log('🕵️  Verifying Chain Integrity (Expect Valid)...');
    const result1 = await auditService.verifyChainIntegrity(5);
    if (result1.valid) {
        console.log('✅ Chain is VALID.');
    } else {
        console.error('❌ Chain is INVALID (Unexpected):', result1.reason);
        process.exit(1);
    }

    // 4. Tamper with the middle log
    console.log('😈 Tampering with the middle log...');
    const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 3 });
    const middleLog = logs[1]; // The second one (index 1 from desc is the middle one? No, desc means 2, 1, 0. So index 1 is middle)

    // Tamper payload but keep hash same (Signature mismatch if we rehash? No, hash mismatch if we rehash)
    // Actually, verifyChainIntegrity recalculates hash from data.
    // So if we change data in DB, calculated hash will differ from stored hash.
    await prisma.auditLog.update({
        where: { id: middleLog.id },
        data: {
            payload: { step: 2, tampered: true }
        }
    });

    // 5. Verify Integrity (Should be broken)
    console.log('🕵️  Verifying Chain Integrity (Expect Broken)...');
    const result2 = await auditService.verifyChainIntegrity(5);
    if (!result2.valid) {
        console.log('✅ Tampering DETECTED successfully!');
        console.log(`   Reason: ${result2.reason}`);
        console.log(`   Broken at ID: ${result2.brokenAtId}`);
    } else {
        console.error('❌ Tampering NOT DETECTED (Failed).');
        process.exit(1);
    }

    console.log('🎉 AuditLog Integrity Test Passed!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
