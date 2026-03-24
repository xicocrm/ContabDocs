import { Router, type IRouter } from "express";
import { db, clientesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    let query = db.select().from(clientesTable).$dynamic();
    if (req.query.escritorioId) {
      const eid = parseInt(String(req.query.escritorioId));
      if (!isNaN(eid)) {
        query = query.where(eq(clientesTable.escritorioId, eid));
      }
    }
    const rows = await query.orderBy(clientesTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar clientes");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const rows = await db.select().from(clientesTable).where(eq(clientesTable.id, id));
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar cliente");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const rows = await db.insert(clientesTable).values(req.body).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar cliente");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    const dateFields = ["dataNascimento", "dataAbertura", "createdAt", "updatedAt"];
    for (const field of dateFields) {
      if (body[field] && typeof body[field] === "string") {
        body[field] = new Date(body[field]);
      }
    }
    const rows = await db.update(clientesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(clientesTable.id, id))
      .returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar cliente");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(clientesTable).where(eq(clientesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir cliente");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
