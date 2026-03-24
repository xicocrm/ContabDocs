import { Router, type IRouter } from "express";
import { db, alvarasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const clienteId = parseInt(String(req.query.clienteId || ""));
    if (isNaN(clienteId)) { res.status(400).json({ message: "clienteId obrigatório" }); return; }
    const rows = await db.select().from(alvarasTable).where(eq(alvarasTable.clienteId, clienteId)).orderBy(alvarasTable.vencimento);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar alvarás");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    if (!body.clienteId) { res.status(400).json({ message: "clienteId obrigatório" }); return; }
    if (!body.tipo) { res.status(400).json({ message: "Tipo do alvará obrigatório" }); return; }
    const rows = await db.insert(alvarasTable).values(body).returning();
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro ao criar alvará");
    res.status(500).json({ message: "Erro ao salvar alvará: " + (err?.message || "").slice(0, 120) });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    const rows = await db.update(alvarasTable).set({ ...body, updatedAt: new Date() }).where(eq(alvarasTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ message: "Alvará não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar alvará");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(alvarasTable).where(eq(alvarasTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir alvará");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
