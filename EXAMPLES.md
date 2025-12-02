# NTAG 424 DNA - Exemplos de Uso

## 1. Registro de Asset e Geração de Hash

```typescript
import { TagRegistryService } from './services/tag-registry/TagRegistryService';

const tagRegistry = new TagRegistryService();

// Preparar asset para encoding
const result = await tagRegistry.prepareAssetForEncoding({
  assetType: 'VEICULO',
  assetCategory: 'CARRO',
  linkedSubjectId: 'subject-uuid',
  configDescription: 'Veículo Quantum Cert',
  operatorId: 'operator-uuid',
  stationId: 'station-uuid',
});

console.log('Queue Item:', result.queueItem.id);
console.log('Hash Truncado:', result.hashTruncated);
```

## 2. Verificação de Tag

### Via cURL

```bash
curl -X POST http://localhost:3000/api/v1/quantum-cert/verify-tag \
  -H "Content-Type: application/json" \
  -d '{
    "d": "A1B2C3D4E5F6...",
    "r": "123456",
    "m": "ABCD1234EFGH5678"
  }'
```

### Via TypeScript

```typescript
import axios from 'axios';

const verifyTag = async () => {
  const response = await axios.post('http://localhost:3000/api/v1/quantum-cert/verify-tag', {
    d: 'hex-encoded-sdmenc',
    r: '123456',
    m: 'hex-encoded-mac',
    deviceId: 'mobile-app-v1',
    appId: 'quantum-cert-android',
  });

  console.log('Status:', response.data.status_validacao);
  console.log('Certificado:', response.data.numero_certificado);
};
```

## 3. Criar Incidente

```bash
curl -X POST http://localhost:3000/api/v1/quantum-cert/incidentes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tagId": "tag-uuid",
    "type": "FURTO",
    "description": "Veículo furtado em estacionamento",
    "incidentDate": "2025-11-28T10:00:00Z"
  }'
```

## 4. Aprovar Incidente

```bash
curl -X POST http://localhost:3000/api/v1/quantum-cert/incidentes/{id}/aprovar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reviewNotes": "Incidente verificado e aprovado"
  }'
```

## 5. Teste de Crypto Services

```typescript
import { SDMCryptoService } from './services/security/SDMCryptoService';

const sdmCrypto = new SDMCryptoService();

// Simular derivação de chaves
const kSdm = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');
const uid = Buffer.from('04112233445566', 'hex');
const counter = 12345;

const { encKey, macKey } = sdmCrypto.deriveSDMSessionKeys(kSdm, uid, counter);

console.log('ENC Key:', encKey.toString('hex'));
console.log('MAC Key:', macKey.toString('hex'));

// Teste de encrypt/decrypt
const plaintext = Buffer.from('Test data');
const encrypted = sdmCrypto.encryptSDMFileData(plaintext, encKey);
const decrypted = sdmCrypto.decryptSDMFileData(encrypted, encKey);

console.log('Decrypt match:', decrypted.equals(plaintext));
```

## 6. Executar Testes

```bash
# Rodar todos os testes
npm test

# Rodar com coverage
npm test -- --coverage

# Rodar testes específicos
npm test -- SDMCryptoService
```

## 7. Verificar Logs de Verificação

```typescript
import { prisma } from './database/prismaClient';

const logs = await prisma.tagVerificationLog.findMany({
  where: {
    tagId: 'your-tag-id',
    status: 'VALID',
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

console.log('Últimas verificações válidas:', logs);
```

## 8. Simular Ataque de Replay

```typescript
// Primeira verificação (válida)
await verifyTag({ d: 'enc', r: '100', m: 'mac' }); // ✅ VALID

// Segunda verificação com mesmo contador (replay)
await verifyTag({ d: 'enc', r: '100', m: 'mac' }); // ❌ REPLAY_ATTACK

// Verificação com contador maior (válida)
await verifyTag({ d: 'enc', r: '101', m: 'mac' }); // ✅ VALID
```

## Variáveis de Ambiente de Teste

Criar `.env.test`:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/qc_test"
QUANTUM_SEED="test-seed-not-for-production"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="000000000000"
SDM_URL_TEMPLATE="http://localhost:3000/api/v1/verify-tag?d={SDMENC}&r={SDMReadCtr}&m={SDMMAC}"
```
