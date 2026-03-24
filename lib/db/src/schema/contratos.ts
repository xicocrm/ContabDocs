import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contratosTable = pgTable("contratos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  numeroContrato: text("numero_contrato").notNull(),
  valorContrato: text("valor_contrato"),
  dataContrato: text("data_contrato"),
  diaVencimento: integer("dia_vencimento"),
  dataVencimento: text("data_vencimento"),
  objeto: text("objeto"),
  status: text("status").default("ativo"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContratoSchema = createInsertSchema(contratosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContrato = z.infer<typeof insertContratoSchema>;
export type Contrato = typeof contratosTable.$inferSelect;
