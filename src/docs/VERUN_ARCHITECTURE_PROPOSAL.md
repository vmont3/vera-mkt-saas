# Verun System — Architecture Proposal v1.0

## 1. Visão do Produto
O **Verun System** é uma plataforma universal de consulta de procedência ("Nada Consta") para ativos físicos. Ele agrega dados de fontes confiáveis (como Quantum Cert) e bases públicas para fornecer um status de segurança instantâneo.

**Objetivo**: Ser a "Tabela FIPE da Segurança/Procedência".

---

## 2. Modelo de Dados (Segmentado)

Para garantir escalabilidade e consultas rápidas (estilo FIPE), os dados devem ser estruturados hierarquicamente:

### 2.1 Estrutura Hierárquica
1.  **Segmento** (Ex: `Eletrônicos`, `Ciclismo`, `Veículos`, `Relógios`)
2.  **Marca** (Ex: `Apple`, `Specialized`, `Rolex`)
3.  **Modelo** (Ex: `iPhone 15 Pro`, `Tarmac SL7`, `Submariner`)
4.  **Identificador Único** (Serial Number, IMEI, Chassi, Tag ID)

### 2.2 O "Nada Consta" (Status)
Cada item consultado retornará um status consolidado:
*   🟢 **LIMPO (Clean)**: Registrado, verificado e sem ocorrências.
*   🔴 **ALERTA (Stolen/Lost)**: Consta registro de roubo/furto/perda.
*   🟡 **SUSPEITO (Flagged)**: Anomalias detectadas (ex: replay attack recorrente, serial duplicado em locais diferentes).
*   ⚪ **DESCONHECIDO (Unknown)**: Não consta na base (risco neutro).

---

## 3. Arquitetura Técnica

### 3.1 Microsserviço Independente
Recomendamos que o Verun seja um serviço separado (`verun-backend`) para isolar a carga de leitura pública da segurança crítica do Quantum Cert.

### 3.2 Stack Recomendada
*   **Database de Leitura (Search Engine)**: **Elasticsearch** ou **Meilisearch**.
    *   *Por que?* Permite buscas ultra-rápidas por serial parcial, correção de erros de digitação (typo-tolerance) e filtros facetados (Marca/Modelo).
*   **Database de Escrita (Source of Truth)**: **PostgreSQL**.
*   **Cache**: **Redis** (para endpoints de alta frequência).

### 3.3 API Universal
A API deve ser RESTful, versionada e monetizável (API Keys).

**Endpoints Sugeridos:**
*   `GET /v1/check?serial=XYZ&brand=Apple` -> Retorna Status.
*   `GET /v1/catalog/brands?segment=ciclismo` -> Lista marcas (FIPE style).
*   `GET /v1/catalog/models?brand=specialized` -> Lista modelos.

---

## 4. Integração Quantum Cert -> Verun

O Quantum Cert atua como uma **Autoridade de Confiança** (Trusted Source) para o Verun.

### 4.1 Fluxo Bidirecional

A integração é uma via de mão dupla com responsabilidades distintas:

#### A. QC -> Verun (Sinistros)
O Quantum Cert notifica o Verun sobre **roubos, furtos e perdas** reportados pelos proprietários.
*   **Mecanismo**: Webhooks (`incident.opened`).
*   **Objetivo**: Atualizar o status no Verun para 🔴 ALERTA.

#### B. Verun -> QC (Achados)
O Verun notifica o Quantum Cert sobre **itens encontrados** (recuperados por terceiros ou autoridades).
*   **Mecanismo**: API de Autoridade (`POST /incidentes/delegado`).
*   **Objetivo**: O QC notifica o proprietário legítimo ("Seu item foi encontrado!").

#### C. Terceiros -> Verun
Bases externas (Seguradoras, Polícia) alimentam o Verun com dados de sinistros.
*   **Objetivo**: Manter o "Nada Consta" universal atualizado.

### 4.2 Fluxo de Dados
```mermaid
graph LR
    User[Usuário QC] -->|Reporta Roubo| QC[Quantum Cert Backend]
    QC -->|Webhook (Incident)| Verun[Verun System API]
    Verun -->|Indexa| ES[Elasticsearch]
    Public[Comprador/Lojista] -->|Consulta Serial| Verun
    Verun -->|Retorna| Status[🔴 ROUBADO]
```

---

## 5. Próximos Passos para Implementação

1.  **Criar Repositório**: `verun-backend`.
2.  **Definir Schema**: Criar as tabelas de Catálogo (Segmento/Marca/Modelo).
3.  **Conectar Webhooks**: Configurar o Quantum Cert para disparar eventos para o endpoint de ingestão do Verun.
