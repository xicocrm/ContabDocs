import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propostasTable = pgTable("propostas", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  numero: text("numero").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  servicos: text("servicos"),
  valor: text("valor"),
  validade: text("validade"),
  status: text("status").notNull().default("rascunho"),
  dataEnvio: text("data_envio"),
  dataResposta: text("data_resposta"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPropostaSchema = createInsertSchema(propostasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposta = z.infer<typeof insertPropostaSchema>;
export type Proposta = typeof propostasTable.$inferSelect;
