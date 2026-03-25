import { Router, type IRouter } from "express";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const ALLOWED_USER_FIELDS = [
  "nome", "email", "perfil", "ativo", "permissoes",
] as const;

function pickUserFields(body: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of ALLOWED_USER_FIELDS) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

router.get("/", async (req, res) => {
  try {
    const rows = await db.select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      email: usuariosTable.email,
      perfil: usuariosTable.perfil,
      ativo: usuariosTable.ativo,
      permissoes: usuariosTable.permissoes,
      createdAt: usuariosTable.createdAt,
      updatedAt: usuariosTable.updatedAt,
    }).from(usuariosTable).orderBy(usuariosTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar usuários");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const fields = pickUserFields(req.body);
    const { senha } = req.body;
    const senhaHash = senha ? await bcrypt.hash(String(senha), 10) : undefined;
    const rows = await db.insert(usuariosTable).values({
      ...fields,
      ...(senhaHash ? { senha: senhaHash } : {}),
    }).returning();
    const { senha: _s, ...safe } = rows[0] as any;
    res.status(201).json(safe);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar usuário");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    const fields = pickUserFields(req.body);
    const { senha } = req.body;
    const updates: any = { ...fields, updatedAt: new Date() };
    if (senha) {
      updates.senha = await bcrypt.hash(String(senha), 10);
    }
    const rows = await db.update(usuariosTable).set(updates).where(eq(usuariosTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ message: "Não encontrado" }); return; }
    const { senha: _s, ...safe } = rows[0] as any;
    res.json(safe);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar usuário");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID inválido" }); return; }
  try {
    await db.delete(usuariosTable).where(eq(usuariosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro ao excluir usuário");
    res.status(500).json({ message: "Erro interno" });
  }
});

export default router;
