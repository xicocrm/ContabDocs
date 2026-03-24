import { Router, type IRouter } from "express";
import { db, consultasFiscaisTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const eid = parseInt(String(req.query.escritorioId || ""));
    if (isNaN(eid)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }
    const rows = await db.select().from(consultasFiscaisTable).where(eq(consultasFiscaisTable.escritorioId, eid)).orderBy(consultasFiscaisTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar consultas");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;

    if (!body.escritorioId) {
      res.status(400).json({ message: "Selecione um escritório antes de salvar" }); return;
    }
    if (!body.tipo || String(body.tipo).trim() === "") {
      res.status(400).json({ message: "Selecione o tipo de consulta fiscal" }); return;
    }

    const rows = await db.insert(consultasFiscaisTable).values(body).returning();
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro ao criar consulta");
    const detail = err?.cause?.message || err?.message || "";
    if (detail.includes("not-null")) {
      res.status(400).json({ message: "Preencha todos os campos obrigatórios" });
    } else {
      res.status(500).json({ message: "Erro ao salvar consulta: " + detail.slice(0, 120) });
    }
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    const rows = await db.update(consultasFiscaisTable).set({ ...body, updatedAt: new Date() }).where(eq(consultasFiscaisTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar consulta");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(consultasFiscaisTable).where(eq(consultasFiscaisTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir consulta");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
