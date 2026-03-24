import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const negociacoesTable = pgTable("negociacoes", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  valor: text("valor"),
  status: text("status").notNull().default("prospeccao"),
  probabilidade: integer("probabilidade").default(0),
  responsavel: text("responsavel"),
  dataInicio: text("data_inicio"),
  dataPrevFechamento: text("data_prev_fechamento"),
  dataFechamento: text("data_fechamento"),
  motivoPerda: text("motivo_perda"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNegociacaoSchema = createInsertSchema(negociacoesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNegociacao = z.infer<typeof insertNegociacaoSchema>;
export type Negociacao = typeof negociacoesTable.$inferSelect;
