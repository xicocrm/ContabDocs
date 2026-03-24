import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const protocolosTable = pgTable("protocolos", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  numero: text("numero").notNull(),
  tipo: text("tipo"),
  orgao: text("orgao"),
  assunto: text("assunto").notNull(),
  status: text("status").notNull().default("pendente"),
  dataProtocolo: text("data_protocolo"),
  dataPrazo: text("data_prazo"),
  dataResposta: text("data_resposta"),
  responsavel: text("responsavel"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProtocoloSchema = createInsertSchema(protocolosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProtocolo = z.infer<typeof insertProtocoloSchema>;
export type Protocolo = typeof protocolosTable.$inferSelect;
