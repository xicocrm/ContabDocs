# ContabDOC - Sistema de Gestão Contábil

## Overview

Sistema completo de gestão para escritórios de contabilidade. Inclui cadastro de escritório e clientes (PJ/PF com busca na Receita Federal), módulo jurídico com contratos, gestão de usuários, portal do cliente, tarefas recorrentes e integrações com bancos e serviços de comunicação.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 + Shadcn UI
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port auto-assigned)
│   └── contabdoc/          # React frontend (preview at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── deploy/                 # Docker deployment files
│   ├── Dockerfile.api      # Multi-stage API build
│   ├── Dockerfile.web      # Multi-stage Vite build + nginx
│   ├── docker-compose.yml  # Full stack: db + migrate + api + web
│   ├── nginx.conf          # Reverse proxy + security headers
│   ├── init.sql            # Database migrations
│   └── update.sh           # VPS deployment script
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Modules

### Frontend Pages
- **Dashboard** — métricas, gráfico de receita, contratos a vencer
- **Escritório** (`/escritorio`) — cadastro do escritório com busca CNPJ/validação CPF
- **Clientes** (`/clientes`) — CRUD de clientes PJ/PF com busca automática Receita Federal
- **Jurídico** (`/contratos`) — gestão de contratos com máscaras de campos
- **Tarefas** (`/tarefas`) — gestão de tarefas com 3 abas (Dados/Descrição/Repetir)
- **Configurações** (`/configuracoes`) — usuários, permissões, integrações
- **Portal Gerenciar** (`/portal-gerenciar`) — gestão de arquivos do portal
- **Portal do Cliente** (`/portal/:slug`) — área do cliente

### Backend Routes
- `GET /api/receita/cnpj/:cnpj` — consulta CNPJ via BrasilAPI (Receita Federal)
- `GET /api/receita/cpf/:cpf` — validação local de CPF
- `GET/POST/PUT/DELETE /api/escritorios` — CRUD escritórios (JWT protected)
- `GET/POST/PUT/DELETE /api/clientes` — CRUD clientes (JWT protected)
- `GET/POST/PUT/DELETE /api/contratos` — CRUD contratos (JWT protected)
- `GET/POST/PUT/DELETE /api/usuarios` — CRUD usuários (JWT protected)
- `GET/PUT /api/integracoes` — integrações (JWT protected)
- `GET/POST/PUT/DELETE /api/tarefas` — tarefas (JWT protected)
- `POST /api/auth/login` — autenticação JWT (rate limited: 10/15min)
- `GET /api/auth/me` — dados do usuário autenticado
- `GET /api/auth/check-setup` — verifica se admin precisa de setup inicial
- `POST /api/auth/setup` — cria primeiro usuário admin
- `PUT /api/auth/senha` — altera senha do usuário logado
- `POST /api/portal/login` — login do cliente no portal (slug + email + senha)
- `GET /api/portal/arquivos` — lista arquivos do cliente no portal
- `POST /api/portal/upload` — cliente envia arquivo (tipo validado)
- `GET /api/portal/download/:id` — download de arquivo
- `GET /api/portal/escritorio/arquivos` — back-office: lista arquivos
- `POST /api/portal/escritorio/upload` — back-office: envia arquivo (tipo validado)
- `DELETE /api/portal/arquivos/:id` — exclui arquivo
- `GET /api/portal/info/:slug` — info pública do portal

### Security (v1.9.5)
- **JWT middleware** on all admin routes (`requireAuth`)
- **Portal token isolation**: portal tokens cannot access admin routes
- **Rate limiting** on login endpoint (10 attempts per 15 minutes)
- **CORS restriction** via `CORS_ORIGINS` env var
- **File upload validation**: whitelist of allowed extensions (.pdf, .jpg, .doc, etc.)
- **Input sanitization**: field whitelisting on POST/PUT for clientes, escritorios, usuarios
- **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy

### Authentication
- JWT tokens, expiry 8h (app) / 12h (portal)
- Secret: `JWT_SECRET` env var (auto-generated strong secret on first deploy)
- Frontend: token stored in `localStorage` as `contabdoc_token`
- Protected routes redirect to `/login` if not authenticated
- Setup wizard on first run if no users with passwords exist

### Portal do Cliente
- Each escritório has a `slug` field for portal URL: `/portal/:slug`
- Clients access: `/portal/:slug` (login) → `/portal/:slug/dashboard`
- Back-office management: `/portal-gerenciar` (new sidebar item)
- File uploads stored in `uploads/` dir (configurable via `UPLOADS_DIR`)
- Allowed file types: PDF, images, Office docs, CSV, TXT, ZIP/RAR/7z

### Database Tables
- `escritorios` — dados do escritório contábil (+ slug)
- `clientes` — clientes PJ/PF (+ emailPortal, senhaPortal hash, ativoPortal)
- `contratos` — contratos jurídicos
- `usuarios` — usuários do sistema (senha: bcrypt hash)
- `integracoes` — configurações de integrações
- `portal_arquivos` — arquivos trocados entre escritório e clientes
- `tarefas` — tarefas com campos: competencia, departamento, dataInicio, qtdRecorrencias, tags
- `impostos` — dados fiscais
- `contas` — contas financeiras
- `negociacoes` — pipeline comercial
- `propostas` — propostas comerciais
- `processos` — processos jurídicos
- `protocolos` — protocolos de atendimento
- `campanhas` — campanhas de marketing
- `alvaras` — alvarás e licenças

## Field Masks
- CNPJ: `XX.XXX.XXX/XXXX-XX`
- CPF: `XXX.XXX.XXX-XX`
- CEP: `XXXXX-XXX`
- Telefone: `(XX) XXXX-XXXX`
- Celular: `(XX) XXXXX-XXXX`
- Valor: `R$ X.XXX,XX`
- Data: `DD/MM/AAAA`

## VPS Deployment
- **Server**: 187.77.229.111
- **GitHub**: `xicocrm/ContabDocs` (branch: `main`)
- **Update command**: `cd /opt/contabdoc && git fetch origin && git reset --hard origin/main && bash deploy/update.sh`
- **Docker stack**: PostgreSQL 16 + Node.js 20 API + nginx
- **Environment**: `.env` file in `/opt/contabdoc/deploy/` with DB_PASSWORD, JWT_SECRET, CORS_ORIGINS

## Development

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/contabdoc run dev

# Push DB schema changes
pnpm --filter @workspace/db run push

# Run codegen after OpenAPI changes
pnpm --filter @workspace/api-spec run codegen
```
