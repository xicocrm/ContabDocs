import { pgTable, serial, text, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const impostosTable = pgTable("impostos", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  tipo: text("tipo").notNull().default(""),
  competencia: text("competencia").notNull().default(""),
  vencimento: text("vencimento"),
  valor: text("valor"),
  status: text("status").notNull().default("pendente"),
  arquivoCaminho: text("arquivo_caminho"),
  arquivoNome: text("arquivo_nome"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertImpostoSchema = createInsertSchema(impostosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertImposto = z.infer<typeof insertImpostoSchema>;
export type Imposto = typeof impostosTable.$inferSelect;
