import { Router, type IRouter } from "express";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router: IRouter = Router();
const SECRET = process.env.JWT_SECRET || "contabdoc-jwt-secret-2025";

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      res.status(400).json({ message: "Informe email e senha" }); return;
    }

    const [user] = await db.select().from(usuariosTable)
      .where(eq(usuariosTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      res.status(401).json({ message: "Email ou senha incorretos" }); return;
    }

    if (!user.ativo) {
      res.status(403).json({ message: "Usuário inativo. Contate o administrador." }); return;
    }

    if (!user.senha) {
      res.status(401).json({ message: "Senha não configurada. Contate o administrador." }); return;
    }

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      res.status(401).json({ message: "Email ou senha incorretos" }); return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome, perfil: user.perfil },
      SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
    });
  } catch (err) {
    req.log.error({ err }, "Erro no login");
    res.status(500).json({ message: "Erro ao processar login" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Não autenticado" }); return;
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, SECRET) as any;
    const [user] = await db.select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      email: usuariosTable.email,
      perfil: usuariosTable.perfil,
      ativo: usuariosTable.ativo,
    }).from(usuariosTable).where(eq(usuariosTable.id, decoded.id)).limit(1);
    if (!user || !user.ativo) {
      res.status(401).json({ message: "Não autenticado" }); return;
    }
    res.json(user);
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
});

router.post("/setup", async (req, res) => {
  try {
    const count = await db.select().from(usuariosTable);
    if (count.length > 0 && count.some(u => u.senha)) {
      res.status(400).json({ message: "Sistema já configurado" }); return;
    }
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      res.status(400).json({ message: "Informe nome, email e senha" }); return;
    }
    const hash = await bcrypt.hash(senha, 10);
    if (count.length === 0) {
      await db.insert(usuariosTable).values({ nome, email: email.toLowerCase(), senha: hash, perfil: "admin" });
    } else {
      await db.update(usuariosTable).set({ senha: hash, perfil: "admin" }).where(eq(usuariosTable.email, email.toLowerCase()));
    }
    res.json({ message: "Configuração concluída! Faça login." });
  } catch (err) {
    req.log.error({ err }, "Erro no setup");
    res.status(500).json({ message: "Erro ao configurar" });
  }
});

router.put("/senha", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Não autenticado" }); return;
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, SECRET) as any;
    const { senhaAtual, novaSenha } = req.body;
    if (!senhaAtual || !novaSenha) {
      res.status(400).json({ message: "Informe a senha atual e a nova senha" }); return;
    }
    const [user] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, decoded.id));
    if (!user) { res.status(404).json({ message: "Usuário não encontrado" }); return; }
    if (user.senha) {
      const ok = await bcrypt.compare(senhaAtual, user.senha);
      if (!ok) { res.status(401).json({ message: "Senha atual incorreta" }); return; }
    }
    const hash = await bcrypt.hash(novaSenha, 10);
    await db.update(usuariosTable).set({ senha: hash, updatedAt: new Date() }).where(eq(usuariosTable.id, decoded.id));
    res.json({ message: "Senha alterada com sucesso" });
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
});

router.get("/check-setup", async (_req, res) => {
  try {
    const users = await db.select().from(usuariosTable);
    const hasSenha = users.some(u => u.senha && u.ativo);
    res.json({ needsSetup: !hasSenha });
  } catch {
    res.json({ needsSetup: false });
  }
});

export default router;
