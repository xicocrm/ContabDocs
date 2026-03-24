import { Router, type IRouter } from "express";
import { db, escritoriosTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(escritoriosTable).orderBy(escritoriosTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar escritórios");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const rows = await db.select().from(escritoriosTable).where(eq(escritoriosTable.id, id));
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar escritório");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;
    const cnpj = body.cnpj ? String(body.cnpj).replace(/\D/g, "") : null;
    const cpf  = body.cpf  ? String(body.cpf).replace(/\D/g, "")  : null;
    const filters = [];
    if (cnpj) filters.push(eq(escritoriosTable.cnpj, cnpj));
    if (cpf)  filters.push(eq(escritoriosTable.cpf, cpf));
    if (filters.length > 0) {
      const existing = await db.select({ id: escritoriosTable.id, razaoSocial: escritoriosTable.razaoSocial })
        .from(escritoriosTable).where(or(...filters)).limit(1);
      if (existing[0]) {
        res.status(409).json({ message: `Este escritório já está cadastrado: "${existing[0].razaoSocial || 'ID ' + existing[0].id}"` });
        return;
      }
    }
    const rows = await db.insert(escritoriosTable).values(body).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar escritório");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;
    const rows = await db.update(escritoriosTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(escritoriosTable.id, id))
      .returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar escritório");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(escritoriosTable).where(eq(escritoriosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir escritório");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
