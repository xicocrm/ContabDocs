import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campanhasTable = pgTable("campanhas", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  canal: text("canal").notNull().default("email"),
  publicoAlvo: text("publico_alvo"),
  mensagem: text("mensagem"),
  status: text("status").notNull().default("rascunho"),
  dataInicio: text("data_inicio"),
  dataFim: text("data_fim"),
  totalEnviados: integer("total_enviados").default(0),
  totalAbertos: integer("total_abertos").default(0),
  totalCliques: integer("total_cliques").default(0),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampanhaSchema = createInsertSchema(campanhasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampanha = z.infer<typeof insertCampanhaSchema>;
export type Campanha = typeof campanhasTable.$inferSelect;
