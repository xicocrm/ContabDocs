import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const processosTable = pgTable("processos", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  numero: text("numero").notNull(),
  tipo: text("tipo"),
  tribunal: text("tribunal"),
  vara: text("vara"),
  comarca: text("comarca"),
  descricao: text("descricao"),
  valorCausa: text("valor_causa"),
  status: text("status").notNull().default("ativo"),
  dataAbertura: text("data_abertura"),
  dataUltimoAndamento: text("data_ultimo_andamento"),
  dataEncerramento: text("data_encerramento"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProcessoSchema = createInsertSchema(processosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProcesso = z.infer<typeof insertProcessoSchema>;
export type Processo = typeof processosTable.$inferSelect;
