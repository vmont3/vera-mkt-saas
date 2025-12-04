# API Documentation - NTAG 424 DNA Core

## Base URL

```
http://localhost:3000/api/v1/quantum-cert
```

---

## Endpoints

### 1. Verificar Tag

**Endpoint:** `POST /verify-tag`  
**Auth:** Público (sem autenticação)

#### Request Body

```json
{
  "url": "https://api.quantumcert.com/v1/verify-tag?d=ABC123&r=456&m=DEF789",
  // OU
  "d": "ABC123",  // SDMENC (hex)
  "r": "456",     // SDMReadCtr (número)
  "m": "DEF789",  // SDMMAC (hex)
  
  // Opcional
  "deviceId": "mobile-001",
  "appId": "quantum-cert-android",
  "geoLocation": { "lat": -23.5505, "lon": -46.6333 }
}
```

#### Response (Sucesso)

```json
{
  "numero_certificado": "A1B2C3D4",
  "tipo_registro": "VEICULO",
  "status_validacao": "VALIDO",
  "data_emissao": "2025-11-28T00:00:00.000Z",
  "resumo_incidentes": "Sem ocorrências",
  "nivel_confianca": 100
}
```

#### Response (Erro)

```json
{
  "status_validacao": "INVALIDO",
  "mensagem": "MAC inválido"
}
```

#### Status Possíveis

- `VALIDO` - Tag autêntica e válida
- `INVALIDO` - Falha na verificação (decrypt/MAC/hash)
- `SUSPEITO` - Ataque de replay detectado
- `BLOQUEADO` - Tag revogada

---

### 2. Sync Offline

**Endpoint:** `POST /verify-offline-sync`  
**Auth:** Público

#### Request Body

```json
{
  "verifications": [
    {
      "d": "ABC123",
      "r": "456",
      "m": "DEF789",
      "timestamp": "2025-11-28T10:00:00Z"
    },
    {
      "d": "GHI456",
      "r": "789",
      "m": "JKL012",
      "timestamp": "2025-11-28T10:05:00Z"
    }
  ]
}
```

#### Response

```json
{
  "results": [
    {
      "numero_certificado": "A1B2C3D4",
      "status_validacao": "VALIDO",
      ...
    },
    {
      "status_validacao": "INVALIDO",
      "mensagem": "Hash inválido",
      ...
    }
  ]
}
```

---

### 3. Criar Incidente (Usuário)

**Endpoint:** `POST /incidentes`  
**Auth:** Bearer Token (JWT)

#### Request Body

```json
{
  "tagId": "tag-uuid",
  "subjectId": "subject-uuid",  // Opcional, se não usar tagId
  "type": "FURTO",  // FURTO, ROUBO, PERDA, ACHADO, etc.
  "description": "Veículo furtado no estacionamento do shopping",
  "incidentDate": "2025-11-28T08:00:00Z",
  "attachments": [
    {
      "url": "https://storage.com/bo.pdf",
      "type": "BO",
      "description": "Boletim de ocorrência"
    }
  ]
}
```

#### Response

```json
{
  "id": "incident-uuid",
  "status": "PENDING_APPROVAL",
  "createdAt": "2025-11-28T10:00:00Z",
  ...
}
```

---

### 4. Criar Incidente (Autoridade)

**Endpoint:** `POST /incidentes/delegado`  
**Auth:** Bearer Token (autoridade)

#### Request Body

```json
{
  "tagId": "tag-uuid",
  "type": "ROUBO",
  "description": "Veículo recuperado em operação policial",
  "incidentDate": "2025-11-28T12:00:00Z",
  
  // Campos de auditoria
  "authorityOrg": "Polícia Civil - SP",
  "authorityId": "123456",
  "officialProtocol": "BO-2025-12345",
  "notes": "Veículo estava com placas adulteradas",
  "externalRefs": {
    "ssp": "REF-12345",
    "detran": "PROC-67890"
  }
}
```

---

### 5. Listar Incidentes Pendentes

**Endpoint:** `GET /incidentes/pendentes`  
**Auth:** Bearer Token (owner)

#### Response

```json
[
  {
    "id": "incident-uuid",
    "type": "FURTO",
    "description": "...",
    "status": "PENDING_APPROVAL",
    "originType": "USER",
    "createdAt": "2025-11-28T10:00:00Z",
    "auditRecords": []
  },
  {
    "id": "incident-uuid-2",
    "type": "ROUBO",
    "description": "...",
    "status": "PENDING_APPROVAL",
    "originType": "AUTHORITY",
    "auditRecords": [
      {
        "authorityOrg": "Polícia Civil - SP",
        "officialProtocol": "BO-2025-12345"
      }
    ]
  }
]
```

---

### 6. Aprovar Incidente

**Endpoint:** `POST /incidentes/:id/aprovar`  
**Auth:** Bearer Token (owner)

#### Request Body

```json
{
  "reviewNotes": "Incidente verificado e aprovado. Veículo foi recuperado."
}
```

#### Response

```json
{
  "id": "incident-uuid",
  "status": "APPROVED",
  "reviewedAt": "2025-11-28T14:00:00Z",
  "reviewNotes": "...",
  ...
}
```

---

### 7. Rejeitar Incidente

**Endpoint:** `POST /incidentes/:id/rejeitar`  
**Auth:** Bearer Token (owner)

#### Request Body

```json
{
  "reviewNotes": "Informações incorretas. Veículo nunca foi furtado."
}
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - Token ausente/inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error |

---

## Headers Comuns

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

---

## Rate Limiting

- Verificação pública: 100 req/min
- Endpoints protegidos: 60 req/min (configurável por usuário)

---

## Exemplos de Integração

Ver [EXAMPLES.md](./EXAMPLES.md) para exemplos completos em TypeScript, cURL, e outras linguagens.
