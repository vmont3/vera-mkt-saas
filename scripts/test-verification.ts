/**
 * Test script for Tag Verification API
 * 
 * This script demonstrates how to test the verification endpoint with mock data.
 * In production, these values would come from an actual NTAG 424 DNA tag.
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Mock verification payload
 * In production, these would be extracted from the NFC tag's NDEF URL
 */
const mockVerificationPayload = {
    // d = SDMENC (encrypted: UID + CTR + Hash + TagID + Schema)
    d: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',

    // m = SDMMAC (authentication)
    m: '1234567890abcdef1234567890abcdef',

    // r = SDMReadCtr (counter for anti-replay)
    r: '000001',

    // uid = UID Mirror (7 bytes hex)
    uid: '04a1b2c3d4e5f6'
};

async function testVerification() {
    console.log('🧪 Testing Tag Verification API\n');
    console.log('Endpoint:', `${API_BASE_URL}/v1/quantum-cert/verify-tag`);
    console.log('Payload:', JSON.stringify(mockVerificationPayload, null, 2));
    console.log('\n---\n');

    try {
        const response = await axios.post(
            `${API_BASE_URL}/v1/quantum-cert/verify-tag`,
            mockVerificationPayload,
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log('✅ Verification successful!\n');
        console.log('Public Asset Data:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n---\n');

        // Validate response structure
        const requiredFields = [
            'status_validacao',
            'contador_validacoes',
            'nivel_confianca'
        ];

        const missingFields = requiredFields.filter(
            field => !(field in response.data)
        );

        if (missingFields.length > 0) {
            console.warn('⚠️  Missing required fields:', missingFields);
        }

        // Validate sensitive data is NOT exposed
        const forbiddenFields = [
            'uid',
            'hashTruncated',
            'masterHashVaultKey',
            'lastAcceptedCtr'
        ];

        const exposedSecrets = forbiddenFields.filter(
            field => field in response.data
        );

        if (exposedSecrets.length > 0) {
            console.error('🚨 SECURITY VIOLATION: Sensitive data exposed!', exposedSecrets);
        } else {
            console.log('✅ Security check passed: No sensitive data in response\n');
        }

    } catch (error: any) {
        if (error.response) {
            console.error('❌ Verification failed');
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('❌ Network error:', error.message);
        }
    }
}

async function testReplayAttack() {
    console.log('\n🔒 Testing Anti-Replay Protection\n');

    try {
        // First verification
        console.log('Attempt 1: First verification...');
        await axios.post(
            `${API_BASE_URL}/v1/quantum-cert/verify-tag`,
            mockVerificationPayload
        );
        console.log('✅ First attempt succeeded\n');

        // Replay attack with same counter
        console.log('Attempt 2: Replay with same counter...');
        await axios.post(
            `${API_BASE_URL}/v1/quantum-cert/verify-tag`,
            mockVerificationPayload
        );

        console.error('🚨 SECURITY FAILURE: Replay attack was not blocked!');
    } catch (error: any) {
        if (error.response?.status === 400 &&
            error.response?.data?.error?.includes('Replay')) {
            console.log('✅ Anti-replay protection working correctly\n');
        } else {
            console.error('❌ Unexpected error:', error.response?.data || error.message);
        }
    }
}

// Run tests
(async () => {
    console.log('═══════════════════════════════════════════════');
    console.log('  QUANTUM CERT - TAG VERIFICATION TEST SUITE  ');
    console.log('═══════════════════════════════════════════════\n');

    await testVerification();
    // Uncomment to test replay protection (requires actual DB)
    // await testReplayAttack();

    console.log('═══════════════════════════════════════════════');
    console.log('  Test suite completed');
    console.log('═══════════════════════════════════════════════\n');
})();
