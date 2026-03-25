import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tarefasTable = pgTable("tarefas", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: text("tipo"),
  prioridade: text("prioridade").notNull().default("media"),
  status: text("status").notNull().default("pendente"),
  competencia: text("competencia"),
  departamento: text("departamento"),
  dataInicio: text("data_inicio"),
  dataVencimento: text("data_vencimento"),
  dataConclusao: text("data_conclusao"),
  responsavel: text("responsavel"),
  recorrencia: text("recorrencia").default("unica"),
  qtdRecorrencias: integer("qtd_recorrencias").default(1),
  tags: text("tags"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTarefaSchema = createInsertSchema(tarefasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTarefa = z.infer<typeof insertTarefaSchema>;
export type Tarefa = typeof tarefasTable.$inferSelect;
