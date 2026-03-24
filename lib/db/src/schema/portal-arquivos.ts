import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalArquivosTable = pgTable("portal_arquivos", {
  id: serial("id").primaryKey(),
  escritorioId: integer("escritorio_id").notNull(),
  clienteId: integer("cliente_id"),
  nome: text("nome").notNull(),
  tipoArquivo: text("tipo_arquivo"),
  tamanho: text("tamanho"),
  descricao: text("descricao"),
  caminho: text("caminho").notNull(),
  enviadoPor: text("enviado_por").notNull().default("cliente"),
  status: text("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPortalArquivoSchema = createInsertSchema(portalArquivosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortalArquivo = z.infer<typeof insertPortalArquivoSchema>;
export type PortalArquivo = typeof portalArquivosTable.$inferSelect;
