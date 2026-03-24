# ContabDOC - Sistema de Gestão Contábil

## Overview

Sistema completo de gestão para escritórios de contabilidade. Inclui cadastro de escritório e clientes (PJ/PF com busca na Receita Federal), módulo jurídico com contratos, gestão de usuários e integrações com bancos e serviços de comunicação.

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
- **Configurações** (`/configuracoes`) — usuários, permissões, integrações

### Backend Routes
- `GET /api/receita/cnpj/:cnpj` — consulta CNPJ via BrasilAPI (Receita Federal)
- `GET /api/receita/cpf/:cpf` — validação local de CPF
- `GET/POST/PUT/DELETE /api/escritorios` — CRUD escritórios
- `GET/POST/PUT/DELETE /api/clientes` — CRUD clientes
- `GET/POST/PUT/DELETE /api/contratos` — CRUD contratos
- `GET/POST/PUT/DELETE /api/usuarios` — CRUD usuários (passwords hashed with bcrypt)
- `GET/PUT /api/integracoes` — configurações de integrações
- `POST /api/auth/login` — autenticação JWT (email + senha)
- `GET /api/auth/me` — dados do usuário autenticado
- `GET /api/auth/check-setup` — verifica se admin precisa de setup inicial
- `POST /api/auth/setup` — cria primeiro usuário admin
- `PUT /api/auth/senha` — altera senha do usuário logado
- `POST /api/portal/login` — login do cliente no portal (slug + email + senha)
- `GET /api/portal/arquivos` — lista arquivos do cliente no portal
- `POST /api/portal/upload` — cliente envia arquivo ao portal
- `GET /api/portal/download/:id` — download de arquivo
- `GET /api/portal/escritorio/arquivos` — back-office: lista arquivos
- `POST /api/portal/escritorio/upload` — back-office: envia arquivo ao cliente
- `DELETE /api/portal/arquivos/:id` — exclui arquivo
- `GET /api/portal/info/:slug` — info pública do portal

### Authentication
- JWT tokens, expiry 8h (app) / 12h (portal)
- Secret: `JWT_SECRET` env var (fallback: hardcoded dev secret)
- Frontend: token stored in `localStorage` as `contabdoc_token`
- Protected routes redirect to `/login` if not authenticated
- Setup wizard on first run if no users with passwords exist

### Portal do Cliente
- Each escritório has a `slug` field for portal URL: `/portal/:slug`
- Clients access: `/portal/:slug` (login) → `/portal/:slug/dashboard`
- Back-office management: `/portal-gerenciar` (new sidebar item)
- File uploads stored in `uploads/` dir (configurable via `UPLOADS_DIR`)

### Database Tables
- `escritorios` — dados do escritório contábil (+ slug)
- `clientes` — clientes PJ/PF (+ emailPortal, senhaPortal hash, ativoPortal)
- `contratos` — contratos jurídicos
- `usuarios` — usuários do sistema (senha: bcrypt hash)
- `integracoes` — configurações de integrações (Wavoip, FalePaco, Whatiket, Asaas, Inter, Efi, Mercado Pago, PagBank, Caixa, Bradesco, Itaú)
- `portal_arquivos` — arquivos trocados entre escritório e clientes

## Field Masks
- CNPJ: `XX.XXX.XXX/XXXX-XX`
- CPF: `XXX.XXX.XXX-XX`
- CEP: `XXXXX-XXX`
- Telefone: `(XX) XXXX-XXXX`
- Celular: `(XX) XXXXX-XXXX`
- Valor: `R$ X.XXX,XX`
- Data: `DD/MM/AAAA`

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
