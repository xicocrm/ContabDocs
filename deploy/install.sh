#!/bin/bash
set -e

# ══════════════════════════════════════════════════════════════════════
#  ContabDOC — Script de Instalação Automática para VPS Ubuntu
#  IP: 187.77.229.111
# ══════════════════════════════════════════════════════════════════════

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[ContabDOC]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗] ERRO: $1${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║       ContabDOC — Instalação no VPS              ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está na raiz do projeto
if [ ! -f "pnpm-workspace.yaml" ]; then
  fail "Execute este script na raiz do projeto ContabDOC (onde está pnpm-workspace.yaml)"
fi

DB_PASSWORD="Chico1010@@@"

# ── 1. Atualizar sistema ──────────────────────────────────────────────
log "Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq
ok "Sistema atualizado"

# ── 2. Instalar dependências ──────────────────────────────────────────
log "Instalando dependências do sistema..."
apt-get install -y -qq \
  curl wget git ca-certificates gnupg lsb-release \
  ufw fail2ban unzip
ok "Dependências instaladas"

# ── 3. Instalar Docker ────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Instalando Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  ok "Docker instalado"
else
  ok "Docker já instalado ($(docker --version))"
fi

# ── 4. Verificar Docker Compose ───────────────────────────────────────
if ! docker compose version &>/dev/null; then
  log "Instalando Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
  ok "Docker Compose instalado"
else
  ok "Docker Compose disponível ($(docker compose version --short))"
fi

# ── 5. Criar arquivo .env ─────────────────────────────────────────────
log "Configurando variáveis de ambiente..."
cat > deploy/.env <<EOF
DB_PASSWORD=${DB_PASSWORD}
NODE_ENV=production
EOF
ok "Arquivo .env criado"

# ── 6. Configurar firewall ────────────────────────────────────────────
log "Configurando firewall (UFW)..."
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow ssh >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ok "Firewall configurado (SSH, HTTP, HTTPS)"

# ── 7. Build e iniciar containers ─────────────────────────────────────
log "Fazendo build da aplicação (pode demorar alguns minutos)..."
cd deploy
docker compose --env-file .env build --no-cache

log "Iniciando todos os serviços..."
docker compose --env-file .env up -d

# ── 8. Aguardar serviços iniciarem ────────────────────────────────────
log "Aguardando serviços ficarem prontos..."
sleep 15

# ── 9. Verificar status ───────────────────────────────────────────────
log "Verificando status dos containers..."
docker compose --env-file .env ps

# ── 10. Teste de conectividade ────────────────────────────────────────
log "Testando API..."
sleep 5
if curl -sf http://localhost/api/health >/dev/null 2>&1; then
  ok "API respondendo corretamente"
else
  echo -e "${YELLOW}[!]${NC} API ainda iniciando, aguarde alguns segundos..."
fi

# ── Resumo final ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✓ INSTALAÇÃO CONCLUÍDA!                    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Sistema:   http://187.77.229.111                    ║${NC}"
echo -e "${GREEN}║  API:       http://187.77.229.111/api                ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Comandos úteis:                                     ║${NC}"
echo -e "${GREEN}║  Ver logs:  docker compose logs -f                   ║${NC}"
echo -e "${GREEN}║  Reiniciar: docker compose restart                   ║${NC}"
echo -e "${GREEN}║  Parar:     docker compose down                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
