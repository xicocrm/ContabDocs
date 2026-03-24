import { Router, type IRouter } from "express";
import { db, contratosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    let query = db.select().from(contratosTable).$dynamic();
    if (req.query.clienteId) {
      const cid = parseInt(String(req.query.clienteId));
      if (!isNaN(cid)) {
        query = query.where(eq(contratosTable.clienteId, cid));
      }
    }
    const rows = await query.orderBy(contratosTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar contratos");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const rows = await db.select().from(contratosTable).where(eq(contratosTable.id, id));
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar contrato");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const rows = await db.insert(contratosTable).values(req.body).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar contrato");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    const dateFields = ["dataInicio", "dataVencimento", "dataRenovacao", "createdAt", "updatedAt"];
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === "string") body[f] = new Date(body[f]);
    }
    const rows = await db.update(contratosTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(contratosTable.id, id))
      .returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar contrato");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(contratosTable).where(eq(contratosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir contrato");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
