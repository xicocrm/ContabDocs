-- ContabDOC - Script de inicialização completo do banco de dados
-- Idempotente: seguro para rodar múltiplas vezes (IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)

-- ─── Tabela: escritorios ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escritorios (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'PJ',
  cnpj TEXT,
  cpf TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  nome_responsavel TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  situacao TEXT,
  slug TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: clientes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER,
  tipo TEXT NOT NULL DEFAULT 'PJ',
  cnpj TEXT,
  cpf TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  nome_responsavel TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  situacao_receita TEXT,
  socios TEXT,
  regime_tributario TEXT,
  atividade_principal TEXT,
  codigo_cliente TEXT,
  email_portal TEXT,
  senha_portal TEXT,
  ativo_portal BOOLEAN DEFAULT false,
  juceb_numero TEXT,
  juceb_data TEXT,
  juceb_situacao TEXT,
  juceb_observacoes TEXT,
  juceb_uf TEXT DEFAULT 'BA',
  inscricao_municipal TEXT,
  inscricao_estadual TEXT,
  arquivo_inscricao_municipal TEXT,
  arquivo_inscricao_municipal_nome TEXT,
  arquivo_inscricao_estadual TEXT,
  arquivo_inscricao_estadual_nome TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: usuarios ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT,
  perfil TEXT NOT NULL DEFAULT 'operador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  permissoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: contratos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  numero_contrato TEXT NOT NULL,
  valor_contrato TEXT,
  data_contrato TEXT,
  dia_vencimento INTEGER,
  data_vencimento TEXT,
  objeto TEXT,
  status TEXT DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: integracoes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integracoes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  config TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: contas ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  tipo TEXT NOT NULL DEFAULT 'receber',
  descricao TEXT NOT NULL,
  valor TEXT,
  categoria TEXT,
  data_vencimento TEXT,
  data_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  numero_documento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: negociacoes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negociacoes (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor TEXT,
  status TEXT NOT NULL DEFAULT 'prospeccao',
  probabilidade INTEGER DEFAULT 0,
  responsavel TEXT,
  data_inicio TEXT,
  data_prev_fechamento TEXT,
  data_fechamento TEXT,
  motivo_perda TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: propostas ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS propostas (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  numero TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  servicos TEXT,
  valor TEXT,
  validade TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  data_envio TEXT,
  data_resposta TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: processos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processos (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  numero TEXT NOT NULL,
  tipo TEXT,
  orgao TEXT,
  protocolo_orgao TEXT,
  prioridade TEXT DEFAULT 'normal',
  tribunal TEXT,
  vara TEXT,
  comarca TEXT,
  descricao TEXT,
  descricao_ia TEXT,
  valor_causa TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  cc_email TEXT,
  cc_whatsapp TEXT,
  data_abertura TEXT,
  data_ultimo_andamento TEXT,
  data_encerramento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: protocolos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocolos (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  numero TEXT NOT NULL,
  tipo TEXT,
  orgao TEXT,
  assunto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_protocolo TEXT,
  data_prazo TEXT,
  data_resposta TEXT,
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: campanhas ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhas (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  canal TEXT NOT NULL DEFAULT 'email',
  publico_alvo TEXT,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  data_inicio TEXT,
  data_fim TEXT,
  total_enviados INTEGER DEFAULT 0,
  total_abertos INTEGER DEFAULT 0,
  total_cliques INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: consultas_fiscais ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultas_fiscais (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  tipo TEXT NOT NULL,
  descricao TEXT,
  resultado TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_consulta TEXT,
  data_retorno TEXT,
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: portal_arquivos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_arquivos (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  nome TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho TEXT,
  descricao TEXT,
  caminho TEXT NOT NULL,
  enviado_por TEXT NOT NULL DEFAULT 'cliente',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Tabela: alvaras ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alvaras (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  numero TEXT,
  orgao_expedidor TEXT,
  data_emissao TEXT,
  vencimento TEXT,
  status TEXT DEFAULT 'ativo',
  arquivo TEXT,
  arquivo_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Tabela: impostos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impostos (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  tipo TEXT NOT NULL DEFAULT '',
  competencia TEXT NOT NULL DEFAULT '',
  vencimento TEXT,
  valor TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  arquivo_caminho TEXT,
  arquivo_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Migrações idempotentes (ADD COLUMN IF NOT EXISTS) ───────────────────────

-- escritorios: colunas adicionadas em versões posteriores
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS contador_nome TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS contador_crc TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS contador_cpf TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS contador_email TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS contador_telefone TEXT;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS contador_assinatura TEXT;

-- clientes: colunas adicionadas em versões posteriores
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_cliente TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_portal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS senha_portal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ativo_portal BOOLEAN DEFAULT false;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS socios TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS regime_tributario TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS atividade_principal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS juceb_numero TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS juceb_data TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS juceb_situacao TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS juceb_observacoes TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS juceb_uf TEXT DEFAULT 'BA';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS arquivo_inscricao_municipal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS arquivo_inscricao_municipal_nome TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS arquivo_inscricao_estadual TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS arquivo_inscricao_estadual_nome TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documento_pessoal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documento_pessoal_nome TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS comprovante_endereco TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS comprovante_endereco_nome TEXT;

-- usuarios: colunas adicionadas em versões posteriores
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissoes TEXT;

-- processos: colunas adicionadas em versões posteriores
ALTER TABLE processos ADD COLUMN IF NOT EXISTS orgao TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS protocolo_orgao TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'normal';
ALTER TABLE processos ADD COLUMN IF NOT EXISTS descricao_ia TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS cc_email TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS cc_whatsapp TEXT;

-- ─── Índice único para slug (seguro se já existir) ───────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS escritorios_slug_key ON escritorios (slug) WHERE slug IS NOT NULL;

-- ─── Usuário admin padrão ─────────────────────────────────────────────────────
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

-- ─── Auto-gera slug para escritórios sem slug ─────────────────────────────────
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT id, nome_fantasia, razao_social FROM escritorios WHERE slug IS NULL LOOP
    base_slug := REGEXP_REPLACE(LOWER(COALESCE(r.nome_fantasia, r.razao_social, 'escritorio')), '[^a-z0-9]', '', 'g');
    IF base_slug = '' THEN base_slug := 'escritorio'; END IF;
    final_slug := base_slug;
    counter := 1;
    LOOP
      BEGIN
        UPDATE escritorios SET slug = final_slug WHERE id = r.id AND slug IS NULL;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        final_slug := base_slug || counter::text;
        counter := counter + 1;
      END;
    END LOOP;
  END LOOP;
END $$;
