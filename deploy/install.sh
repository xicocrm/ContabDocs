#!/bin/bash
set -e

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
echo -e "${YELLOW}║       ContabDOC — Instalação Automática VPS      ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════╝${NC}"
echo ""

GITHUB_REPO="https://github.com/xicocrm/ContabDocs"
INSTALL_DIR="/opt/contabdoc"
DB_PASSWORD="Chico1010@@@"
VPS_IP="187.77.229.111"

# ── 1. Atualizar sistema ──────────────────────────────────────────────
log "Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq 2>/dev/null
ok "Sistema atualizado"

# ── 2. Instalar dependências ──────────────────────────────────────────
log "Instalando dependências..."
apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release ufw
ok "Dependências instaladas"

# ── 3. Instalar Docker ────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Instalando Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
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
  ok "Docker já instalado"
fi

# ── 4. Baixar código do GitHub ────────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  log "Atualizando código existente..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  log "Baixando código do GitHub..."
  git clone "$GITHUB_REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
ok "Código atualizado"

# ── 5. Criar arquivo .env ─────────────────────────────────────────────
log "Configurando variáveis de ambiente..."
cat > "$INSTALL_DIR/deploy/.env" <<EOF
DB_PASSWORD=${DB_PASSWORD}
NODE_ENV=production
EOF
ok ".env configurado"

# ── 6. Configurar firewall ────────────────────────────────────────────
log "Configurando firewall..."
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow ssh >/dev/null 2>&1
ufw allow 80/tcp >/dev/null 2>&1
ufw allow 443/tcp >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1
ok "Firewall configurado"

# ── 7. Build e iniciar containers ─────────────────────────────────────
cd "$INSTALL_DIR/deploy"
log "Fazendo build (pode levar alguns minutos)..."
docker compose --env-file .env down 2>/dev/null || true
docker compose --env-file .env build --no-cache

log "Iniciando todos os serviços..."
docker compose --env-file .env up -d

# ── 8. Aguardar e verificar ───────────────────────────────────────────
log "Aguardando serviços iniciarem..."
sleep 20

log "Status dos containers:"
docker compose --env-file .env ps

# ── 9. Configurar reinício automático ─────────────────────────────────
log "Configurando reinício automático..."
cat > /etc/systemd/system/contabdoc.service <<EOF
[Unit]
Description=ContabDOC
Requires=docker.service
After=docker.service

[Service]
WorkingDirectory=${INSTALL_DIR}/deploy
ExecStart=/usr/bin/docker compose --env-file .env up
ExecStop=/usr/bin/docker compose --env-file .env down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable contabdoc
ok "Reinício automático configurado"

# ── Resumo ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✓  INSTALAÇÃO CONCLUÍDA COM SUCESSO!         ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  🌐 Acesse:  http://${VPS_IP}             ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Comandos úteis (dentro de /opt/contabdoc/deploy):   ║${NC}"
echo -e "${GREEN}║  Ver logs:    docker compose logs -f                 ║${NC}"
echo -e "${GREEN}║  Reiniciar:   docker compose restart                 ║${NC}"
echo -e "${GREEN}║  Parar:       docker compose down                    ║${NC}"
echo -e "${GREEN}║  Atualizar:   bash /opt/contabdoc/deploy/install.sh  ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
