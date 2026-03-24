import { Router, type IRouter } from "express";
import { db, contasTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const eid = parseInt(String(req.query.escritorioId || ""));
    if (isNaN(eid)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }
    const rows = await db.select().from(contasTable)
      .where(eq(contasTable.escritorioId, eid))
      .orderBy(contasTable.dataVencimento);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar contas");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    const rows = await db.insert(contasTable).values(body).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar conta");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    const rows = await db.update(contasTable).set({ ...body, updatedAt: new Date() }).where(eq(contasTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar conta");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(contasTable).where(eq(contasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir conta");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
