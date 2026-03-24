import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alvarasTable = pgTable("alvaras", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  tipo: text("tipo").notNull(),
  numero: text("numero"),
  orgaoExpedidor: text("orgao_expedidor"),
  dataEmissao: text("data_emissao"),
  vencimento: text("vencimento"),
  status: text("status").default("ativo"),
  arquivo: text("arquivo"),
  arquivoNome: text("arquivo_nome"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAlvaraSchema = createInsertSchema(alvarasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAlvara = z.infer<typeof insertAlvaraSchema>;
export type Alvara = typeof alvarasTable.$inferSelect;
