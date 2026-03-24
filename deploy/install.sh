#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[ContabDOC]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[ERRO] $1${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}     ContabDOC - Instalacao Automatica VPS        ${NC}"
echo -e "${YELLOW}==================================================${NC}"
echo ""

GITHUB_REPO="https://github.com/xicocrm/ContabDocs"
INSTALL_DIR="/opt/contabdoc"
DB_PASSWORD="Chico1010@@@"
VPS_IP="187.77.229.111"

# 1. Atualizar sistema (sem prompts)
log "Atualizando sistema..."
apt-get update -qq
apt-get -y -qq \
  -o Dpkg::Options::="--force-confold" \
  -o Dpkg::Options::="--force-confdef" \
  upgrade
ok "Sistema atualizado"

# 2. Instalar dependencias
log "Instalando dependencias..."
apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release ufw
ok "Dependencias instaladas"

# 3. Instalar Docker
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
  ok "Docker ja instalado"
fi

# 4. Baixar codigo do GitHub
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Atualizando codigo existente..."
  cd "$INSTALL_DIR"
  git fetch origin
  git reset --hard origin/main
else
  log "Baixando codigo do GitHub..."
  rm -rf "$INSTALL_DIR"
  git clone "$GITHUB_REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
ok "Codigo atualizado"

# 5. Criar arquivo .env
log "Configurando variaveis de ambiente..."
cat > "$INSTALL_DIR/deploy/.env" <<ENVEOF
DB_PASSWORD=${DB_PASSWORD}
NODE_ENV=production
ENVEOF
ok ".env configurado"

# 6. Configurar firewall
log "Configurando firewall..."
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow ssh >/dev/null 2>&1
ufw allow 80/tcp >/dev/null 2>&1
ufw allow 443/tcp >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1
ok "Firewall configurado"

# 7. Build e iniciar containers
cd "$INSTALL_DIR/deploy"
log "Fazendo build (pode levar alguns minutos)..."
docker compose --env-file .env down 2>/dev/null || true
docker compose --env-file .env build --no-cache

log "Iniciando todos os servicos..."
docker compose --env-file .env up -d

# 8. Aguardar e verificar
log "Aguardando servicos iniciarem..."
sleep 20
docker compose --env-file .env ps

# 9. Configurar reinicio automatico
log "Configurando reinicio automatico..."
cat > /etc/systemd/system/contabdoc.service <<SVCEOF
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
SVCEOF
systemctl daemon-reload
systemctl enable contabdoc
ok "Reinicio automatico configurado"

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}    INSTALACAO CONCLUIDA COM SUCESSO!             ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Acesse: http://${VPS_IP}                        ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
