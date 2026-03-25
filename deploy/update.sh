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

# ── 2. Backup automático antes de atualizar ────────────────────
step "2/7 - Backup automático pré-atualização"
BACKUP_DIR="$INSTALL_DIR/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre_update_$(date +%Y%m%d_%H%M%S).sql.gz"
if docker exec contabdoc_db pg_isready -U contabdoc -d contabdoc &>/dev/null 2>&1; then
  docker exec contabdoc_db pg_dump -U contabdoc contabdoc | gzip > "$BACKUP_FILE" 2>/dev/null
  ok "Backup salvo em $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
  find "$BACKUP_DIR" -name "pre_update_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
else
  warn "Banco não disponível — pulando backup pré-atualização"
fi

# ── 3. Atualizar código do GitHub ───────────────────────────────
step "3/7 - Atualizando código do GitHub"
cd "$INSTALL_DIR"
git fetch origin
git reset --hard origin/main
ok "Código atualizado para a versão mais recente ($(git log --oneline -1))"

# ── 4. Garantir .env ────────────────────────────────────────────
step "4/7 - Verificando configuração"
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  warn ".env não encontrado — criando..."
  JWT_GENERATED=$(openssl rand -base64 48 | tr -d '\n/+=')
  RESET_KEY_GENERATED=$(openssl rand -base64 32 | tr -d '\n/+=')
  cat > "$DEPLOY_DIR/.env" <<ENVEOF
DB_PASSWORD=${DB_PASSWORD}
NODE_ENV=production
JWT_SECRET=${JWT_GENERATED}
ADMIN_RESET_KEY=${RESET_KEY_GENERATED}
CORS_ORIGINS=http://187.77.229.111,http://localhost
ENVEOF
  ok ".env criado com JWT_SECRET e ADMIN_RESET_KEY aleatórios"
else
  ok ".env já existe"
  if ! grep -q "ADMIN_RESET_KEY" "$DEPLOY_DIR/.env"; then
    RESET_KEY_GENERATED=$(openssl rand -base64 32 | tr -d '\n/+=')
    echo "ADMIN_RESET_KEY=${RESET_KEY_GENERATED}" >> "$DEPLOY_DIR/.env"
    ok "ADMIN_RESET_KEY adicionada ao .env"
  fi
  if ! grep -q "CORS_ORIGINS" "$DEPLOY_DIR/.env"; then
    echo "CORS_ORIGINS=http://187.77.229.111,http://localhost" >> "$DEPLOY_DIR/.env"
    ok "CORS_ORIGINS adicionada ao .env"
  fi
fi

# ── 5. Rebuild dos containers ───────────────────────────────────
step "5/7 - Compilando e atualizando containers"
cd "$DEPLOY_DIR"
log "Parando containers existentes..."
docker compose --env-file .env down --remove-orphans 2>/dev/null || true

log "Buildando API + Web (isso pode levar 3-5 min)..."
docker compose --env-file .env build --no-cache api web

log "Iniciando todos os serviços..."
docker compose --env-file .env up -d
ok "Containers iniciados"

# ── 6. Aguardar saúde dos serviços ──────────────────────────────
step "6/7 - Aguardando serviços ficarem saudáveis"
log "Aguardando banco de dados..."
timeout 60 bash -c 'until docker exec contabdoc_db pg_isready -U contabdoc -d contabdoc &>/dev/null; do sleep 2; done' \
  && ok "Banco de dados pronto" || warn "Timeout aguardando banco"

log "Executando migrações do banco..."
docker compose --env-file .env run --rm migrate 2>/dev/null || warn "Migrate retornou erro (verifique os logs)"
ok "Migrações executadas"

log "Garantindo que API e Web estão rodando após migrate..."
docker compose --env-file .env up -d api web 2>/dev/null || true

log "Aguardando API ficar saudável via nginx (até 90s)..."
timeout 90 bash -c 'until curl -sf http://localhost/api/health &>/dev/null; do sleep 3; done' \
  && ok "API saudável" || warn "API demorou mais que o esperado (verificar logs abaixo)"

# ── 7. Verificação final ────────────────────────────────────────
step "7/7 - Verificação final"
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
