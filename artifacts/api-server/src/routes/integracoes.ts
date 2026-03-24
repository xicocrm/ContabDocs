import { Router, type IRouter } from "express";
import { db, integracoesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const INTEGRACOES_PADRAO = [
  { nome: "Wavoip", tipo: "comunicacao" },
  { nome: "FalePaco", tipo: "comunicacao" },
  { nome: "Whatiket", tipo: "comunicacao" },
  { nome: "Asaas", tipo: "banco" },
  { nome: "Inter", tipo: "banco" },
  { nome: "Efi Pay", tipo: "banco" },
  { nome: "Mercado Pago", tipo: "banco" },
  { nome: "PagBank", tipo: "banco" },
  { nome: "Caixa", tipo: "banco" },
  { nome: "Bradesco", tipo: "banco" },
  { nome: "Itaú", tipo: "banco" },
];

async function garantirIntegracoesPadrao() {
  const existentes = await db.select().from(integracoesTable);
  if (existentes.length === 0) {
    await db.insert(integracoesTable).values(
      INTEGRACOES_PADRAO.map((i) => ({ ...i, ativo: false }))
    );
  }
}

router.get("/", async (req, res) => {
  try {
    await garantirIntegracoesPadrao();
    const rows = await db.select().from(integracoesTable).orderBy(integracoesTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar integrações");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/", async (req, res) => {
  const { nome, tipo, ativo, config } = req.body;
  try {
    const existente = await db.select().from(integracoesTable).where(eq(integracoesTable.nome, nome));
    let result;
    if (existente[0]) {
      const rows = await db.update(integracoesTable)
        .set({ tipo, ativo, config, updatedAt: new Date() })
        .where(eq(integracoesTable.nome, nome))
        .returning();
      result = rows[0];
    } else {
      const rows = await db.insert(integracoesTable).values({ nome, tipo, ativo, config }).returning();
      result = rows[0];
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Erro ao salvar integração");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
