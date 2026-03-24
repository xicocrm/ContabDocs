-- ContabDOC - Script de inicialização completo do banco de dados
-- Cria todas as tabelas (idempotente - usa IF NOT EXISTS)

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
  slug TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS integracoes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  config TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS processos (
  id SERIAL PRIMARY KEY,
  escritorio_id INTEGER NOT NULL,
  cliente_id INTEGER,
  numero TEXT NOT NULL,
  tipo TEXT,
  tribunal TEXT,
  vara TEXT,
  comarca TEXT,
  descricao TEXT,
  valor_causa TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  data_abertura TEXT,
  data_ultimo_andamento TEXT,
  data_encerramento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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

-- Colunas adicionais (idempotentes)
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE escritorios ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_cliente TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_portal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS senha_portal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ativo_portal BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha TEXT;
