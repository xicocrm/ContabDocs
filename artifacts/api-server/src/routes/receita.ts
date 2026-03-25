import { Router, type IRouter } from "express";

const router: IRouter = Router();

function limparMascara(valor: string): string {
  return valor.replace(/\D/g, "");
}

function validarCnpjLocal(cnpj: string): boolean {
  cnpj = limparMascara(cnpj);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  let soma = 0, peso = 5;
  for (let i = 0; i < 12; i++) { soma += parseInt(cnpj[i]) * peso; peso = peso === 2 ? 9 : peso - 1; }
  let digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(cnpj[12]) !== digito) return false;
  soma = 0; peso = 6;
  for (let i = 0; i < 13; i++) { soma += parseInt(cnpj[i]) * peso; peso = peso === 2 ? 9 : peso - 1; }
  digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(cnpj[13]) === digito;
}

function validarCpfLocal(cpf: string): boolean {
  cpf = limparMascara(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(cpf[9]) !== digito) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(cpf[10]) === digito;
}

// ── Normaliza dados da BrasilAPI ou cnpj.ws em formato único ──
function normalizarBrasilAPI(data: Record<string, unknown>, cnpj: string) {
  const socios: Array<{ nome: string; qualificacao: string; cpfCnpj?: string }> = [];
  if (Array.isArray(data.qsa)) {
    for (const s of data.qsa as Array<Record<string, unknown>>) {
      socios.push({
        nome: String(s.nome_socio || s.nome || ""),
        qualificacao: String(s.qualificacao_socio || s.qualificacao || ""),
        cpfCnpj: s.cnpj_cpf_do_socio ? String(s.cnpj_cpf_do_socio) : undefined,
      });
    }
  }
  const cnaePrincipalCodigo = String(data.cnae_fiscal || "");
  const cnaePrincipalDescricao = String(data.cnae_fiscal_descricao || "");
  const cnaesSecundarios: Array<{ codigo: string; descricao: string }> = [];
  if (Array.isArray(data.cnaes_secundarios)) {
    for (const c of data.cnaes_secundarios as Array<Record<string, unknown>>) {
      cnaesSecundarios.push({ codigo: String(c.codigo || ""), descricao: String(c.descricao || "") });
    }
  }
  return {
    cnpj: String(data.cnpj || cnpj),
    razaoSocial: String(data.razao_social || ""),
    nomeFantasia: String(data.nome_fantasia || ""),
    situacao: String(data.descricao_situacao_cadastral || ""),
    dataAbertura: String(data.data_inicio_atividade || ""),
    naturezaJuridica: String(data.descricao_natureza_juridica || data.natureza_juridica || ""),
    porte: String(data.porte || ""),
    capitalSocial: String(data.capital_social || ""),
    atividadePrincipal: cnaePrincipalCodigo
      ? `${cnaePrincipalCodigo} - ${cnaePrincipalDescricao}`
      : cnaePrincipalDescricao,
    cnaePrincipalCodigo,
    cnaePrincipalDescricao,
    cnaesSecundarios,
    logradouro: String(data.logradouro || ""),
    numero: String(data.numero || ""),
    complemento: String(data.complemento || ""),
    bairro: String(data.bairro || ""),
    municipio: String(data.municipio || ""),
    uf: String(data.uf || ""),
    cep: String(data.cep || "").replace(/\D/g, ""),
    telefone: String(data.ddd_telefone_1 || ""),
    email: String(data.email || ""),
    socios,
    // Simples Nacional / MEI (BrasilAPI CNPJ endpoint inclui esses campos diretamente)
    simplesOptante:    data.opcao_pelo_simples ?? null,
    simplesDataOpcao:  data.data_opcao_pelo_simples ?? null,
    simplesDataExclusao: data.data_exclusao_do_simples ?? null,
    meiOptante:        data.opcao_pelo_mei ?? null,
    meiDataOpcao:      data.data_opcao_pelo_mei ?? null,
    meiDataExclusao:   data.data_exclusao_do_mei ?? null,
  };
}

function normalizarCnpjWS(data: Record<string, unknown>, cnpj: string) {
  const estab = (data.estabelecimento || {}) as Record<string, unknown>;
  const simples = (data.simples || {}) as Record<string, unknown>;
  const atPrincipal = (estab.atividade_principal || {}) as Record<string, unknown>;
  const atSecundarias = Array.isArray(estab.atividades_secundarias)
    ? (estab.atividades_secundarias as Array<Record<string, unknown>>).map(a => ({
        codigo: String(a.id || ""), descricao: String(a.descricao || ""),
      }))
    : [];
  const socios: Array<{ nome: string; qualificacao: string; cpfCnpj?: string }> = [];
  if (Array.isArray(data.socios)) {
    for (const s of data.socios as Array<Record<string, unknown>>) {
      socios.push({ nome: String(s.nome || ""), qualificacao: String(s.qualificacao?.descricao || s.tipo?.descricao || ""), cpfCnpj: s.cnpj_cpf_do_socio ? String(s.cnpj_cpf_do_socio) : undefined });
    }
  }
  const cnaePrincipalCodigo = String(atPrincipal.id || "");
  const cnaePrincipalDescricao = String(atPrincipal.descricao || "");
  return {
    cnpj: String(estab.cnpj || cnpj),
    razaoSocial: String(data.razao_social || ""),
    nomeFantasia: String(estab.nome_fantasia || ""),
    situacao: String(estab.situacao_cadastral || ""),
    dataAbertura: String(estab.data_inicio_atividade || ""),
    naturezaJuridica: String(data.natureza_juridica?.descricao || ""),
    porte: String(data.porte?.descricao || ""),
    capitalSocial: String(data.capital_social || ""),
    atividadePrincipal: cnaePrincipalCodigo
      ? `${cnaePrincipalCodigo} - ${cnaePrincipalDescricao}`
      : cnaePrincipalDescricao,
    cnaePrincipalCodigo,
    cnaePrincipalDescricao,
    cnaesSecundarios: atSecundarias,
    logradouro: String(estab.logradouro || ""),
    numero: String(estab.numero || ""),
    complemento: String(estab.complemento || ""),
    bairro: String(estab.bairro || ""),
    municipio: String(estab.cidade?.nome || estab.municipio || ""),
    uf: String(estab.estado?.sigla || estab.uf || ""),
    cep: String(estab.cep || "").replace(/\D/g, ""),
    telefone: String(estab.telefone1 || ""),
    email: String(estab.email || ""),
    socios,
    simplesOptante:    simples.simples ?? null,
    simplesDataOpcao:  simples.data_opcao_simples ?? null,
    simplesDataExclusao: simples.data_exclusao_simples ?? null,
    meiOptante:        simples.mei ?? null,
    meiDataOpcao:      simples.data_opcao_mei ?? null,
    meiDataExclusao:   simples.data_exclusao_mei ?? null,
  };
}

router.get("/cnpj/:cnpj", async (req, res) => {
  const cnpj = limparMascara(req.params.cnpj);
  if (!validarCnpjLocal(cnpj)) {
    res.status(400).json({ message: "CNPJ inválido" }); return;
  }

  // Tenta BrasilAPI primeiro
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "Accept": "application/json", "User-Agent": "ContabDOC/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (r.ok) {
      const data = await r.json() as Record<string, unknown>;
      return res.json(normalizarBrasilAPI(data, cnpj));
    }
    if (r.status !== 404 && r.status !== 429) throw new Error(`BrasilAPI: ${r.status}`);
  } catch (e: any) {
    req.log.warn({ err: e?.message }, "BrasilAPI CNPJ falhou, tentando cnpj.ws");
  }

  // Fallback: cnpj.ws
  try {
    const r2 = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      headers: { "Accept": "application/json", "User-Agent": "ContabDOC/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (r2.ok) {
      const data2 = await r2.json() as Record<string, unknown>;
      return res.json(normalizarCnpjWS(data2, cnpj));
    }
    if (r2.status === 404) {
      return res.status(404).json({ message: "CNPJ não encontrado na Receita Federal" });
    }
    throw new Error(`cnpj.ws: ${r2.status}`);
  } catch (e: any) {
    req.log.error({ err: e?.message }, "cnpj.ws também falhou");
    return res.status(502).json({ message: "Receita Federal temporariamente indisponível. Tente novamente em instantes." });
  }
});

router.get("/cpf/:cpf", (req, res) => {
  const cpf = limparMascara(req.params.cpf);
  const valido = validarCpfLocal(cpf);
  res.json({ cpf, valido, situacao: valido ? "Regular" : "CPF inválido" });
});

export default router;
