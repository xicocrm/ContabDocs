import { Router, type IRouter } from "express";
import { db, clientesTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
    const body = { ...req.body };
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;
    const eid = body.escritorioId ? parseInt(String(body.escritorioId)) : null;
    const cnpj = body.cnpj ? String(body.cnpj).replace(/\D/g, "") : null;
    const cpf  = body.cpf  ? String(body.cpf).replace(/\D/g, "")  : null;
    if (eid && (cnpj || cpf)) {
      const docFilters = [];
      if (cnpj) docFilters.push(eq(clientesTable.cnpj, cnpj));
      if (cpf)  docFilters.push(eq(clientesTable.cpf, cpf));
      const existing = await db.select({ id: clientesTable.id, razaoSocial: clientesTable.razaoSocial })
        .from(clientesTable).where(and(eq(clientesTable.escritorioId, eid), or(...docFilters))).limit(1);
      if (existing[0]) {
        res.status(409).json({ message: `Este cliente já está cadastrado: "${existing[0].razaoSocial || 'ID ' + existing[0].id}"` });
        return;
      }
    }
    if (body.senhaPortal) {
      body.senhaPortal = await bcrypt.hash(body.senhaPortal, 10);
    } else if (body.ativoPortal === true || body.ativoPortal === "true") {
      // Ativando portal na criação sem senha: usa dígitos do CNPJ/CPF como senha padrão
      const docDigitos = String(body.cnpj || body.cpf || "").replace(/\D/g, "");
      if (docDigitos.length >= 11) {
        body.senhaPortal = await bcrypt.hash(docDigitos, 10);
      }
    }
    const rows = await db.insert(clientesTable).values(body).returning();
    const { senhaPortal: _s, ...safe } = rows[0] as any;
    res.status(201).json(safe);
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
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;

    if (body.senhaPortal) {
      body.senhaPortal = await bcrypt.hash(body.senhaPortal, 10);
    } else if (body.ativoPortal === true || body.ativoPortal === "true") {
      // Ativando portal sem senha: define senha padrão = dígitos do CNPJ ou CPF
      const [atual] = await db.select().from(clientesTable).where(eq(clientesTable.id, id)).limit(1);
      if (atual && !atual.senhaPortal) {
        const docDigitos = String(body.cnpj || atual.cnpj || body.cpf || atual.cpf || "").replace(/\D/g, "");
        if (docDigitos.length >= 11) {
          body.senhaPortal = await bcrypt.hash(docDigitos, 10);
        }
      } else {
        delete body.senhaPortal;
      }
    } else {
      delete body.senhaPortal;
    }

    const rows = await db.update(clientesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(clientesTable.id, id))
      .returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    const { senhaPortal: _s, ...safe } = rows[0] as any;
    res.json(safe);
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
