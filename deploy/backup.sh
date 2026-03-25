#!/bin/bash
BACKUP_DIR="/opt/contabdoc/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/contabdoc_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if docker exec contabdoc_db pg_isready -U contabdoc -d contabdoc &>/dev/null 2>&1; then
  docker exec contabdoc_db pg_dump -U contabdoc contabdoc | gzip > "$BACKUP_FILE"
  echo "[$(date)] Backup criado: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
  find "$BACKUP_DIR" -name "contabdoc_*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null
  echo "[$(date)] Backups com mais de ${RETENTION_DAYS} dias removidos"
else
  echo "[$(date)] ERRO: Banco de dados não disponível"
  exit 1
fi
