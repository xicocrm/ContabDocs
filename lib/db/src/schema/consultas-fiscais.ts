import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const consultasFiscaisTable = pgTable("consultas_fiscais", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  tipo: text("tipo").notNull(),
  descricao: text("descricao"),
  resultado: text("resultado"),
  status: text("status").notNull().default("pendente"),
  dataConsulta: text("data_consulta"),
  dataRetorno: text("data_retorno"),
  responsavel: text("responsavel"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConsultaFiscalSchema = createInsertSchema(consultasFiscaisTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsultaFiscal = z.infer<typeof insertConsultaFiscalSchema>;
export type ConsultaFiscal = typeof consultasFiscaisTable.$inferSelect;
