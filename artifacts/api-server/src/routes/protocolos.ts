import { Router, type IRouter } from "express";
import { db, protocolosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const eid = parseInt(String(req.query.escritorioId || ""));
    if (isNaN(eid)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }
    const rows = await db.select().from(protocolosTable).where(eq(protocolosTable.escritorioId, eid)).orderBy(protocolosTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar protocolos");
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

    if (!body.assunto || String(body.assunto).trim() === "") {
      res.status(400).json({ message: "Informe o nome/assunto do documento" }); return;
    }

    if (!body.numero || String(body.numero).trim() === "") {
      const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(protocolosTable).where(eq(protocolosTable.escritorioId, parseInt(body.escritorioId)));
      body.numero = `DOC-${String(Number(c) + 1).padStart(4, "0")}`;
    }

    const rows = await db.insert(protocolosTable).values(body).returning();
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro ao criar protocolo");
    const detail = err?.cause?.message || err?.message || "";
    if (detail.includes("not-null")) {
      res.status(400).json({ message: "Preencha todos os campos obrigatórios" });
    } else {
      res.status(500).json({ message: "Erro ao salvar protocolo: " + detail.slice(0, 120) });
    }
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const body = { ...req.body };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    const rows = await db.update(protocolosTable).set({ ...body, updatedAt: new Date() }).where(eq(protocolosTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar protocolo");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(protocolosTable).where(eq(protocolosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir protocolo");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
