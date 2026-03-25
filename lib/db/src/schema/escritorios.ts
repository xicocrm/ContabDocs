import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const escritoriosTable = pgTable("escritorios", {
  id: serial("id").primaryKey(),
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
  situacao: text("situacao"),
  slug: text("slug").unique(),
  logoUrl: text("logo_url"),
  contadorNome: text("contador_nome"),
  contadorCrc: text("contador_crc"),
  contadorCpf: text("contador_cpf"),
  contadorEmail: text("contador_email"),
  contadorTelefone: text("contador_telefone"),
  contadorAssinatura: text("contador_assinatura"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEscritorioSchema = createInsertSchema(escritoriosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEscritorio = z.infer<typeof insertEscritorioSchema>;
export type Escritorio = typeof escritoriosTable.$inferSelect;
