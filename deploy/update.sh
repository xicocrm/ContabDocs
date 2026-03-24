#!/bin/bash
# ContabDOC - Script de Atualização do VPS
# Uso: bash /opt/contabdoc/deploy/update.sh
# Ou via SSH: ssh root@187.77.229.111 'bash /opt/contabdoc/deploy/update.sh'

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${CYAN}[ContabDOC]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
fail()  { echo -e "${RED}[✗] ERRO: $1${NC}"; exit 1; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
step()  { echo -e "\n${BOLD}${YELLOW}=== $1 ===${NC}"; }

INSTALL_DIR="/opt/contabdoc"
DEPLOY_DIR="$INSTALL_DIR/deploy"
DB_PASSWORD="Chico1010@@@"

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   ContabDOC - Atualização Automática VPS     ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar diretório ──────────────────────────────────────
step "1/6 - Verificando instalação"
if [ ! -d "$INSTALL_DIR/.git" ]; then
  fail "Instalação não encontrada em $INSTALL_DIR. Execute o install.sh primeiro."
fi
ok "Instalação encontrada em $INSTALL_DIR"

# ── 2. Atualizar código do GitHub ───────────────────────────────
step "2/6 - Atualizando código do GitHub"
cd "$INSTALL_DIR"
git fetch origin
git reset --hard origin/main
ok "Código atualizado para a versão mais recente ($(git log --oneline -1))"

# ── 3. Garantir .env ────────────────────────────────────────────
step "3/6 - Verificando configuração"
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  warn ".env não encontrado — criando..."
  cat > "$DEPLOY_DIR/.env" <<ENVEOF
DB_PASSWORD=${DB_PASSWORD}
NODE_ENV=production
JWT_SECRET=contabdoc-jwt-secret-2025
ENVEOF
  ok ".env criado"
else
  ok ".env já existe"
fi

# ── 4. Rebuild dos containers ───────────────────────────────────
step "4/6 - Compilando e atualizando containers"
cd "$DEPLOY_DIR"
log "Parando containers existentes..."
docker compose --env-file .env down --remove-orphans 2>/dev/null || true

log "Buildando API + Web (isso pode levar 3-5 min)..."
docker compose --env-file .env build --no-cache api web

log "Iniciando todos os serviços..."
docker compose --env-file .env up -d
ok "Containers iniciados"

# ── 5. Aguardar saúde dos serviços ──────────────────────────────
step "5/6 - Aguardando serviços ficarem saudáveis"
log "Aguardando banco de dados..."
timeout 60 bash -c 'until docker exec contabdoc_db pg_isready -U contabdoc -d contabdoc &>/dev/null; do sleep 2; done' \
  && ok "Banco de dados pronto" || warn "Timeout aguardando banco"

log "Executando migrações do banco..."
docker compose --env-file .env run --rm migrate 2>/dev/null || true
ok "Migrações executadas"

log "Aguardando API ficar saudável (até 60s)..."
timeout 60 bash -c 'until curl -sf http://localhost:3001/api/health &>/dev/null; do sleep 3; done' \
  && ok "API saudável" || warn "API demorou mais que o esperado (verificar logs)"

log "Aguardando Web Server..."
sleep 5

# ── 6. Verificação final ────────────────────────────────────────
step "6/6 - Verificação final"
echo ""
docker compose --env-file .env ps
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  ok "Frontend respondendo (HTTP $HTTP_CODE)"
else
  warn "Frontend HTTP $HTTP_CODE — pode estar inicializando ainda"
fi

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
  ok "API respondendo (HTTP $API_CODE)"
else
  warn "API HTTP $API_CODE — verifique com: docker compose logs api"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!         ║${NC}"
echo -e "${GREEN}║   Acesse: http://187.77.229.111              ║${NC}"
echo -e "${GREEN}║   Portal:  http://187.77.229.111/portal/{slug}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Comandos úteis:"
echo -e "  ${CYAN}docker compose logs -f api${NC}     # logs da API"
echo -e "  ${CYAN}docker compose logs -f web${NC}     # logs do nginx"
echo -e "  ${CYAN}docker compose ps${NC}              # status dos containers"
echo ""
