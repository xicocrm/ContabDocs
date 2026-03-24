import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const integracoesTable = pgTable("integracoes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  ativo: boolean("ativo").notNull().default(false),
  config: text("config"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIntegracaoSchema = createInsertSchema(integracoesTable).omit({ id: true, updatedAt: true });
export type InsertIntegracao = z.infer<typeof insertIntegracaoSchema>;
export type Integracao = typeof integracoesTable.$inferSelect;
