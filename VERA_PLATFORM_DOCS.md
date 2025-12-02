# 🧠 VERA: Plataforma de Inteligência de Marketing Autônoma (SaaS)
## Documentação Técnica & API Reference (v2.0)

**Destinatários**: Desenvolvedores, Parceiros de Integração, CTOs.
**Data**: 02/12/2025
**Versão**: 2.0.0 (Multi-Tenant)

---

## 1. Visão do Produto (VaaS)

A **Vera** evoluiu de um módulo interno para uma **Plataforma de IA como Serviço (VaaS)**. Ela oferece uma API unificada que permite a qualquer empresa (Quantum Cert, Verun, Parceiros Externos) instanciar sua própria "Agência de Marketing Autônoma".

**Diferenciais:**
*   **Multi-Tenant**: Cada cliente tem sua própria memória, tom de voz e regras.
*   **API-First**: Integração simples via REST/Webhooks.
*   **Auto-Evolução**: O motor de Meta-Learning beneficia todos os clientes, mas as estratégias são isoladas.

---

## 2. Arquitetura Multi-Tenant

O sistema opera com isolamento lógico baseado em `API Keys`.

### 2.1. Fluxo de Requisição
1.  **Cliente** (ex: Verun App) faz POST para `api.vera.ai/v1/campaign`.
2.  **API Gateway** valida a `x-api-key`.
3.  **TenantConfigService** carrega o perfil da marca (ex: "Tom: Sustentável, Foco: Gen Z").
4.  **AgentOrchestrator** instancia os agentes com esse contexto.
5.  **MemoryStream** grava/lê apenas na partição do `tenant_id`.

---

## 3. API Reference

### 3.1. Autenticação
Todas as requisições devem incluir o header:
`x-api-key: sk_live_...`

### 3.2. Endpoints Principais

#### `POST /v1/vera/interact`
Conversa direta com a Vera (para Chatbots de Atendimento).
```json
{
  "message": "O cliente perguntou sobre reembolso.",
  "context": {"userId": "123", "channel": "WHATSAPP"}
}
```

#### `POST /v1/vera/campaign`
Solicita a criação de uma campanha ou conteúdo.
```json
{
  "brief": "Lançamento da nova coleção de verão",
  "channel": "INSTAGRAM",
  "objective": "CONVERSION"
}
```

#### `POST /v1/vera/config` (Admin)
Atualiza a personalidade da marca.
```json
{
  "brandVoice": "Formal, Luxury, Minimalist",
  "bannedKeywords": ["barato", "promoção"],
  "postingSchedule": "09:00, 18:00"
}
```

---

## 4. Integração com Produtos Internos

### 4.1. Quantum Cert (Tenant ID: `quantum-core`)
*   **Uso**: Suporte ao Cliente e Marketing B2B.
*   **Config**: Tom "Tech, Seguro, Institucional".

### 4.2. Verun (Tenant ID: `verun-eco`)
*   **Uso**: Geração de Reels Virais e Comunidade.
*   **Config**: Tom "Jovem, Ativista, Dinâmico".

---

## 5. Roadmap de Comercialização

1.  **Fase 1 (Atual)**: Uso interno (Quantum + Verun).
2.  **Fase 2 (Beta)**: Liberar API para parceiros estratégicos (Fabricantes).
3.  **Fase 3 (Public)**: Dashboard Self-Service para qualquer empresa contratar a Vera.

---
**Vera Platform - Sua Agência de IA, em qualquer lugar.**
