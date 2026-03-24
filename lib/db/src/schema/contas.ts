import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contasTable = pgTable("contas", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  tipo: text("tipo").notNull().default("receber"),
  descricao: text("descricao").notNull(),
  valor: text("valor"),
  categoria: text("categoria"),
  dataVencimento: text("data_vencimento"),
  dataPagamento: text("data_pagamento"),
  status: text("status").notNull().default("pendente"),
  formaPagamento: text("forma_pagamento"),
  numeroDocumento: text("numero_documento"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContaSchema = createInsertSchema(contasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConta = z.infer<typeof insertContaSchema>;
export type Conta = typeof contasTable.$inferSelect;
