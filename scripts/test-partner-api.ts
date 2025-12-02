import { PartnerService } from '../src/services/partner/PartnerService';
import { PartnerApiKeyService } from '../src/services/partner/PartnerApiKeyService';
import axios from 'axios';

const partnerService = new PartnerService();
const apiKeyService = new PartnerApiKeyService();

async function testPartnerApi() {
    console.log('🚀 Starting Partner API Test...');

    try {
        // 1. Create Partner
        console.log('1. Creating Test Partner...');
        const partner = await partnerService.createPartner({
            name: 'Test Manufacturer Inc.',
            slug: 'test-manufacturer-' + Date.now(),
            segment: 'electronics',
            maxAssets: 100
        });
        console.log('✅ Partner Created:', partner.id);

        // 2. Generate API Key
        console.log('2. Generating API Key...');
        const apiKey = await apiKeyService.createApiKey(partner.id, 'Test Key');
        console.log('✅ API Key Generated:', apiKey);

        // 3. Call API: Register Asset
        console.log('3. Registering Asset via API...');
        const registerResponse = await axios.post('http://localhost:3000/partner-api/assets', {
            type: 'laptop',
            externalId: 'sku-12345',
            metadata: {
                model: 'QuantumBook Pro',
                specs: '16GB RAM, 1TB SSD'
            }
        }, {
            headers: { 'X-QC-PARTNER-KEY': apiKey }
        });
        console.log('✅ Asset Registered:', registerResponse.data.id);
        const assetId = registerResponse.data.id;

        // 4. Call API: List Assets
        console.log('4. Listing Assets...');
        const listResponse = await axios.get('http://localhost:3000/partner-api/assets', {
            headers: { 'X-QC-PARTNER-KEY': apiKey }
        });
        console.log(`✅ Found ${listResponse.data.length} assets`);

        // 5. Call API: Get Asset Details
        console.log('5. Getting Asset Details...');
        const detailResponse = await axios.get(`http://localhost:3000/partner-api/assets/${assetId}`, {
            headers: { 'X-QC-PARTNER-KEY': apiKey }
        });
        console.log('✅ Asset Details Retrieved:', detailResponse.data.type);

        console.log('🎉 Partner API Test Completed Successfully!');

    } catch (error: any) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

// Run if called directly
if (require.main === module) {
    testPartnerApi();
}
