# ContabDOC — Deploy no VPS

## Pré-requisitos
- VPS Ubuntu 20.04/22.04/24.04
- Acesso root via SSH
- IP: 187.77.229.111

---

## Como fazer o deploy

### Passo 1 — Baixar o projeto do Replit
No Replit, clique nos **3 pontinhos (...)** no topo e depois em **Download as zip**.

### Passo 2 — Enviar para o VPS
No seu computador (terminal), descompacte o zip e envie para o VPS:

```bash
# Descompactar
unzip workspace.zip -d contabdoc

# Enviar para o VPS
scp -r contabdoc/ root@187.77.229.111:~/contabdoc
```

### Passo 3 — Conectar ao VPS e instalar
```bash
# Conectar via SSH
ssh root@187.77.229.111

# Entrar na pasta do projeto
cd ~/contabdoc

# Dar permissão e executar o instalador
chmod +x deploy/install.sh
bash deploy/install.sh
```

### Passo 4 — Acessar o sistema
Abra no navegador: **http://187.77.229.111**

---

## Gerenciar os serviços

```bash
# Ver status
cd ~/contabdoc/deploy && docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Ver logs só da API
docker compose logs -f api

# Reiniciar tudo
docker compose restart

# Parar tudo
docker compose down

# Atualizar após mudanças no código
docker compose build --no-cache && docker compose up -d
```

---

## Estrutura dos containers

| Container         | Função                        | Porta       |
|-------------------|-------------------------------|-------------|
| contabdoc_db      | Banco de dados PostgreSQL     | interno     |
| contabdoc_migrate | Executa as migrações do DB    | interno     |
| contabdoc_api     | API Node.js (Express)         | interno     |
| contabdoc_web     | Frontend (React) + Nginx      | **80**      |

---

## Backup do banco de dados

```bash
# Fazer backup
docker exec contabdoc_db pg_dump -U contabdoc contabdoc > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i contabdoc_db psql -U contabdoc contabdoc < backup_20240101.sql
```
