# Quantum Cert Backend (qc-backend)

Backend em microserviços para certificação física-digital com QR dinâmico, NFC, Algorand e KYC Gov.br.

## Estrutura de Pastas

- `src/`: Código fonte principal
- `src/services/`: Diretórios dos microserviços (auth, identity, wallet, etc.)
- `prisma/`: Configurações e schemas do ORM
- `docker/`: Arquivos Dockerfile e scripts relacionados
- `k8s/`: Manifestos Kubernetes

## Como rodar em desenvolvimento

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Próximas Etapas

- [ ] Criar docker-compose para infraestrutura local
- [ ] Configurar Prisma ORM
- [ ] Criar APIs dos serviços
