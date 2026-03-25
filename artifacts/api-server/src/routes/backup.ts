import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/status", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM clientes) as total_clientes,
        (SELECT count(*) FROM escritorios) as total_escritorios,
        (SELECT count(*) FROM contratos) as total_contratos,
        (SELECT count(*) FROM tarefas) as total_tarefas,
        (SELECT count(*) FROM contas) as total_contas,
        (SELECT count(*) FROM usuarios) as total_usuarios,
        (SELECT count(*) FROM processos) as total_processos,
        (SELECT count(*) FROM protocolos) as total_protocolos,
        (SELECT count(*) FROM propostas) as total_propostas,
        (SELECT count(*) FROM negociacoes) as total_negociacoes,
        (SELECT count(*) FROM campanhas) as total_campanhas,
        (SELECT count(*) FROM consultas_fiscais) as total_consultas,
        (SELECT count(*) FROM integracoes) as total_integracoes,
        now() as server_time
    `);
    const row = result.rows[0];
    const dbSizeBytes = Number(row.db_size || 0);
    const dbSizeMB = (dbSizeBytes / (1024 * 1024)).toFixed(2);

    res.json({
      dbSize: `${dbSizeMB} MB`,
      dbSizeBytes,
      serverTime: row.server_time,
      totals: {
        clientes: Number(row.total_clientes),
        escritorios: Number(row.total_escritorios),
        contratos: Number(row.total_contratos),
        tarefas: Number(row.total_tarefas),
        contas: Number(row.total_contas),
        usuarios: Number(row.total_usuarios),
        processos: Number(row.total_processos),
        protocolos: Number(row.total_protocolos),
        propostas: Number(row.total_propostas),
        negociacoes: Number(row.total_negociacoes),
        campanhas: Number(row.total_campanhas),
        consultas: Number(row.total_consultas),
        integracoes: Number(row.total_integracoes),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar status backup");
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/exportar", async (req, res) => {
  try {
    const tables = [
      "escritorios", "clientes", "contratos", "tarefas", "contas",
      "usuarios", "processos", "protocolos", "propostas", "negociacoes",
      "campanhas", "consultas_fiscais", "integracoes", "alvaras"
    ];
    const backup: Record<string, any[]> = {};
    for (const t of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT * FROM ${t} ORDER BY id`));
        backup[t] = result.rows;
      } catch {
        backup[t] = [];
      }
    }
    const exportData = {
      version: "1.9.7",
      exportedAt: new Date().toISOString(),
      tables: backup,
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=contabdoc_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(exportData);
  } catch (err) {
    req.log.error({ err }, "Erro ao exportar backup");
    res.status(500).json({ message: "Erro ao exportar" });
  }
});

export default router;
