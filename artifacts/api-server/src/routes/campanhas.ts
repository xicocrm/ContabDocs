import { Router, type IRouter } from "express";
import { db, campanhasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const eid = parseInt(String(req.query.escritorioId || ""));
    if (isNaN(eid)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }
    const rows = await db.select().from(campanhasTable).where(eq(campanhasTable.escritorioId, eid)).orderBy(campanhasTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar campanhas");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    if (!body.escritorioId) { res.status(400).json({ message: "Selecione um escritório antes de salvar" }); return; }
    if (!body.titulo || String(body.titulo).trim() === "") { res.status(400).json({ message: "Informe o título da campanha" }); return; }
    const rows = await db.insert(campanhasTable).values(body).returning();
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro ao criar campanha");
    const detail = err?.cause?.message || err?.message || "";
    res.status(500).json({ message: detail.slice(0, 120) || "Erro ao salvar campanha" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    const rows = await db.update(campanhasTable).set({ ...body, updatedAt: new Date() }).where(eq(campanhasTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar campanha");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(campanhasTable).where(eq(campanhasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir campanha");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
