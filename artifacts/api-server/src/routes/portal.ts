import { Router, type IRouter } from "express";
import { db, clientesTable, escritoriosTable, portalArquivosTable, impostosTable } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: IRouter = Router();
const SECRET = process.env.JWT_SECRET || "contabdoc-jwt-secret-2025";
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
  ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".odt", ".ods",
  ".zip", ".rar", ".7z",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error(`Tipo de arquivo não permitido: ${ext}`));
    return;
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

function verifyPortalToken(authHeader?: string): { clienteId: number; escritorioId: number } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), SECRET) as any;
  } catch { return null; }
}

function verifyMainToken(authHeader?: string): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  try { jwt.verify(authHeader.slice(7), SECRET); return true; } catch { return false; }
}

// ─── Portal Login ────────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { documento, email, senha, slug } = req.body;
    const identificador = documento || email;
    if (!identificador || !senha || !slug) {
      res.status(400).json({ message: "Informe o CNPJ/CPF, senha e escritório" }); return;
    }

    const [escritorio] = await db.select().from(escritoriosTable)
      .where(eq(escritoriosTable.slug, slug.toLowerCase().trim())).limit(1);

    if (!escritorio) {
      res.status(404).json({ message: "Escritório não encontrado. Verifique o endereço do portal." }); return;
    }

    const docLimpo = String(identificador).replace(/\D/g, "");
    let cliente = null;

    if (docLimpo.length >= 11) {
      const [found] = await db.select().from(clientesTable)
        .where(and(
          eq(clientesTable.escritorioId, escritorio.id),
          or(
            sql`REGEXP_REPLACE(${clientesTable.cnpj}, '[^0-9]', '', 'g') = ${docLimpo}`,
            sql`REGEXP_REPLACE(${clientesTable.cpf}, '[^0-9]', '', 'g') = ${docLimpo}`,
          )
        )).limit(1);
      cliente = found || null;
    }

    if (!cliente && identificador.includes("@")) {
      const [found] = await db.select().from(clientesTable)
        .where(and(
          eq(clientesTable.escritorioId, escritorio.id),
          eq(clientesTable.emailPortal, identificador.toLowerCase().trim())
        )).limit(1);
      cliente = found || null;
    }

    if (!cliente || !cliente.ativoPortal) {
      res.status(401).json({ message: "CNPJ/CPF não encontrado ou portal inativo. Contate o escritório." }); return;
    }

    if (!cliente.senhaPortal) {
      res.status(401).json({ message: "Senha não configurada. Contate o escritório." }); return;
    }

    const ok = await bcrypt.compare(senha, cliente.senhaPortal);
    if (!ok) {
      res.status(401).json({ message: "CNPJ/CPF ou senha incorretos" }); return;
    }

    const token = jwt.sign(
      { clienteId: cliente.id, escritorioId: escritorio.id, nome: cliente.razaoSocial || cliente.nomeResponsavel, slug, type: "portal" },
      SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      cliente: { id: cliente.id, nome: cliente.razaoSocial || cliente.nomeResponsavel, email: cliente.emailPortal, codigoCliente: cliente.codigoCliente },
      escritorio: { nome: escritorio.nomeFantasia || escritorio.razaoSocial, slug },
    });
  } catch (err) {
    req.log.error({ err }, "Erro no login do portal");
    res.status(500).json({ message: "Erro ao processar login" });
  }
});

// ─── Portal Me ───────────────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  const session = verifyPortalToken(req.headers.authorization);
  if (!session) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const [cliente] = await db.select({
      id: clientesTable.id,
      nome: clientesTable.razaoSocial,
      nomeResponsavel: clientesTable.nomeResponsavel,
      email: clientesTable.emailPortal,
      codigoCliente: clientesTable.codigoCliente,
    }).from(clientesTable).where(eq(clientesTable.id, session.clienteId));

    const [escritorio] = await db.select({
      nome: escritoriosTable.nomeFantasia,
      razaoSocial: escritoriosTable.razaoSocial,
      slug: escritoriosTable.slug,
    }).from(escritoriosTable).where(eq(escritoriosTable.id, session.escritorioId));

    res.json({ cliente, escritorio });
  } catch (err) {
    res.status(500).json({ message: "Erro ao carregar dados" });
  }
});

// ─── Arquivos (Portal cliente) ────────────────────────────────────────────────

router.get("/arquivos", async (req, res) => {
  const session = verifyPortalToken(req.headers.authorization);
  if (!session) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const rows = await db.select().from(portalArquivosTable)
      .where(and(eq(portalArquivosTable.escritorioId, session.escritorioId), eq(portalArquivosTable.clienteId, session.clienteId)))
      .orderBy(portalArquivosTable.id);
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ message: "Erro ao listar arquivos" });
  }
});

router.post("/upload", upload.single("arquivo"), async (req, res) => {
  const session = verifyPortalToken(req.headers.authorization);
  if (!session) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    if (!req.file) { res.status(400).json({ message: "Nenhum arquivo enviado" }); return; }
    const rows = await db.insert(portalArquivosTable).values({
      escritorioId: session.escritorioId,
      clienteId: session.clienteId,
      nome: req.body.nome || req.file.originalname,
      tipoArquivo: req.file.mimetype,
      tamanho: `${(req.file.size / 1024).toFixed(1)} KB`,
      descricao: req.body.descricao || "",
      caminho: req.file.filename,
      enviadoPor: "cliente",
    }).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Erro no upload");
    res.status(500).json({ message: "Erro ao enviar arquivo" });
  }
});

router.get("/download/:id", async (req, res) => {
  const session = verifyPortalToken(req.headers.authorization);
  if (!session) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const id = parseInt(req.params.id);
    const [arq] = await db.select().from(portalArquivosTable)
      .where(and(eq(portalArquivosTable.id, id), eq(portalArquivosTable.escritorioId, session.escritorioId)));
    if (!arq) { res.status(404).json({ message: "Arquivo não encontrado" }); return; }
    const filePath = path.join(UPLOADS_DIR, arq.caminho);
    if (!fs.existsSync(filePath)) { res.status(404).json({ message: "Arquivo não encontrado no servidor" }); return; }
    res.download(filePath, arq.nome);
  } catch (err) {
    res.status(500).json({ message: "Erro ao baixar arquivo" });
  }
});

// ─── Arquivos (Escritório) ────────────────────────────────────────────────────

router.get("/escritorio/arquivos", async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const escritorioId = parseInt(String(req.query.escritorioId || ""));
    const clienteId = parseInt(String(req.query.clienteId || ""));
    if (isNaN(escritorioId)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }

    let q = db.select().from(portalArquivosTable).where(eq(portalArquivosTable.escritorioId, escritorioId)).$dynamic();
    if (!isNaN(clienteId)) q = q.where(and(eq(portalArquivosTable.escritorioId, escritorioId), eq(portalArquivosTable.clienteId, clienteId)));
    const rows = await q.orderBy(portalArquivosTable.id);
    res.json(rows.reverse());
  } catch {
    res.status(401).json({ message: "Token inválido" });
  }
});

router.post("/escritorio/upload", upload.single("arquivo"), async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    if (!req.file) { res.status(400).json({ message: "Nenhum arquivo enviado" }); return; }
    const escritorioId = parseInt(req.body.escritorioId);
    const clienteId = req.body.clienteId ? parseInt(req.body.clienteId) : undefined;
    if (isNaN(escritorioId)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }
    const rows = await db.insert(portalArquivosTable).values({
      escritorioId,
      clienteId: clienteId || null,
      nome: req.body.nome || req.file.originalname,
      tipoArquivo: req.file.mimetype,
      tamanho: `${(req.file.size / 1024).toFixed(1)} KB`,
      descricao: req.body.descricao || "",
      caminho: req.file.filename,
      enviadoPor: "escritorio",
    }).returning();
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro no upload do escritório");
    res.status(500).json({ message: "Erro ao enviar arquivo" });
  }
});

router.delete("/arquivos/:id", async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const id = parseInt(req.params.id);
    const [arq] = await db.select().from(portalArquivosTable).where(eq(portalArquivosTable.id, id));
    if (arq) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, arq.caminho)); } catch {}
      await db.delete(portalArquivosTable).where(eq(portalArquivosTable.id, id));
    }
    res.status(204).send();
  } catch {
    res.status(401).json({ message: "Token inválido" });
  }
});

// ─── Impostos ─────────────────────────────────────────────────────────────────

router.get("/impostos", async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const escritorioId = parseInt(String(req.query.escritorioId || ""));
    if (isNaN(escritorioId)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }

    let conditions = [eq(impostosTable.escritorioId, escritorioId)];

    const clienteId = parseInt(String(req.query.clienteId || ""));
    if (!isNaN(clienteId)) conditions.push(eq(impostosTable.clienteId, clienteId));

    const status = String(req.query.status || "");
    if (status && status !== "todos") conditions.push(eq(impostosTable.status, status));

    const tipo = String(req.query.tipo || "");
    if (tipo && tipo !== "todos") conditions.push(eq(impostosTable.tipo, tipo));

    const rows = await db.select().from(impostosTable)
      .where(and(...conditions))
      .orderBy(impostosTable.id);
    res.json(rows.reverse());
  } catch (err) {
    req.log.error({ err }, "Erro ao listar impostos");
    res.status(500).json({ message: "Erro ao listar impostos" });
  }
});

router.post("/impostos", upload.single("arquivo"), async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const escritorioId = parseInt(req.body.escritorioId);
    if (isNaN(escritorioId)) { res.status(400).json({ message: "escritorioId obrigatório" }); return; }

    const clienteId = req.body.clienteId ? parseInt(req.body.clienteId) : null;
    const rows = await db.insert(impostosTable).values({
      escritorioId,
      clienteId: clienteId || null,
      tipo: req.body.tipo || "",
      competencia: req.body.competencia || "",
      vencimento: req.body.vencimento || null,
      valor: req.body.valor || null,
      status: req.body.status || "pendente",
      arquivoCaminho: req.file?.filename || null,
      arquivoNome: req.file?.originalname || null,
      observacoes: req.body.observacoes || null,
    }).returning();
    res.status(201).json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro ao criar imposto");
    res.status(500).json({ message: "Erro ao criar imposto" });
  }
});

router.put("/impostos/:id", upload.single("arquivo"), async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const id = parseInt(req.params.id);
    const update: Record<string, any> = { updatedAt: new Date() };

    if (req.body.tipo !== undefined) update.tipo = req.body.tipo;
    if (req.body.competencia !== undefined) update.competencia = req.body.competencia;
    if (req.body.vencimento !== undefined) update.vencimento = req.body.vencimento;
    if (req.body.valor !== undefined) update.valor = req.body.valor;
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.clienteId !== undefined) update.clienteId = req.body.clienteId ? parseInt(req.body.clienteId) : null;
    if (req.body.observacoes !== undefined) update.observacoes = req.body.observacoes;

    if (req.file) {
      const [old] = await db.select().from(impostosTable).where(eq(impostosTable.id, id));
      if (old?.arquivoCaminho) {
        try { fs.unlinkSync(path.join(UPLOADS_DIR, old.arquivoCaminho)); } catch {}
      }
      update.arquivoCaminho = req.file.filename;
      update.arquivoNome = req.file.originalname;
    }

    const rows = await db.update(impostosTable).set(update).where(eq(impostosTable.id, id)).returning();
    res.json(rows[0]);
  } catch (err: any) {
    req.log.error({ err }, "Erro ao atualizar imposto");
    res.status(500).json({ message: "Erro ao atualizar imposto" });
  }
});

router.delete("/impostos/:id", async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const id = parseInt(req.params.id);
    const [imp] = await db.select().from(impostosTable).where(eq(impostosTable.id, id));
    if (imp?.arquivoCaminho) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, imp.arquivoCaminho)); } catch {}
    }
    await db.delete(impostosTable).where(eq(impostosTable.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Erro ao excluir imposto" });
  }
});

router.get("/impostos/download/:id", async (req, res) => {
  if (!verifyMainToken(req.headers.authorization)) { res.status(401).json({ message: "Não autenticado" }); return; }
  try {
    const id = parseInt(req.params.id);
    const [imp] = await db.select().from(impostosTable).where(eq(impostosTable.id, id));
    if (!imp?.arquivoCaminho) { res.status(404).json({ message: "Sem arquivo anexo" }); return; }
    const filePath = path.join(UPLOADS_DIR, imp.arquivoCaminho);
    if (!fs.existsSync(filePath)) { res.status(404).json({ message: "Arquivo não encontrado" }); return; }
    res.download(filePath, imp.arquivoNome || "documento");
  } catch {
    res.status(500).json({ message: "Erro ao baixar arquivo" });
  }
});

// ─── Info Portal (público) ────────────────────────────────────────────────────

router.get("/info/:slug", async (req, res) => {
  try {
    const [escritorio] = await db.select({
      nomeFantasia: escritoriosTable.nomeFantasia,
      razaoSocial: escritoriosTable.razaoSocial,
      slug: escritoriosTable.slug,
      logoUrl: escritoriosTable.logoUrl,
    }).from(escritoriosTable).where(eq(escritoriosTable.slug, req.params.slug.toLowerCase()));
    if (!escritorio) { res.status(404).json({ message: "Portal não encontrado" }); return; }
    res.json(escritorio);
  } catch {
    res.status(500).json({ message: "Erro ao carregar portal" });
  }
});

export default router;
