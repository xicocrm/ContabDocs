import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id"),
  tipo: text("tipo").notNull().default("PJ"),
  cnpj: text("cnpj"),
  cpf: text("cpf"),
  razaoSocial: text("razao_social"),
  nomeFantasia: text("nome_fantasia"),
  nomeResponsavel: text("nome_responsavel"),
  email: text("email"),
  telefone: text("telefone"),
  celular: text("celular"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  municipio: text("municipio"),
  uf: text("uf"),
  situacaoReceita: text("situacao_receita"),
  socios: text("socios"),
  regimeTributario: text("regime_tributario"),
  atividadePrincipal: text("atividade_principal"),
  codigoCliente: text("codigo_cliente"),
  emailPortal: text("email_portal"),
  senhaPortal: text("senha_portal"),
  ativoPortal: boolean("ativo_portal").default(false),
  jucebNumero: text("juceb_numero"),
  jucebData: text("juceb_data"),
  jucebSituacao: text("juceb_situacao"),
  jucebObservacoes: text("juceb_observacoes"),
  inscricaoMunicipal: text("inscricao_municipal"),
  jucebUf: text("juceb_uf").default("BA"),
  inscricaoEstadual: text("inscricao_estadual"),
  arquivoInscricaoMunicipal: text("arquivo_inscricao_municipal"),
  arquivoInscricaoMunicipalNome: text("arquivo_inscricao_municipal_nome"),
  arquivoInscricaoEstadual: text("arquivo_inscricao_estadual"),
  arquivoInscricaoEstadualNome: text("arquivo_inscricao_estadual_nome"),
  documentoPessoal: text("documento_pessoal"),
  documentoPessoalNome: text("documento_pessoal_nome"),
  comprovanteEndereco: text("comprovante_endereco"),
  comprovanteEnderecoNome: text("comprovante_endereco_nome"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
