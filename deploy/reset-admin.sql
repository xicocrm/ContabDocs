-- reset-admin.sql: Redefine a senha do administrador para Contab@2025
-- Usar quando o login estiver com erro 401
-- Comando seguro no VPS:
--   docker cp /opt/contabdoc/deploy/reset-admin.sql contabdoc_db:/tmp/reset-admin.sql
--   docker exec contabdoc_db psql -U contabdoc -d contabdoc -f /tmp/reset-admin.sql

INSERT INTO usuarios (nome, email, senha, perfil, ativo)
VALUES (
  'Administrador',
  'xicocet@gmail.com',
  '$2b$10$JjVzud9NPvIqzGBNt7No/uUIICO.lksj19BsZZNg2wii.AjJr11za',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  senha  = '$2b$10$JjVzud9NPvIqzGBNt7No/uUIICO.lksj19BsZZNg2wii.AjJr11za',
  perfil = 'admin',
  ativo  = true;

SELECT id, nome, email, perfil, ativo FROM usuarios WHERE email = 'xicocet@gmail.com';
