import { Router, type IRouter } from "express";

const router: IRouter = Router();

function limparMascara(valor: string): string {
  return valor.replace(/\D/g, "");
}

function validarCnpjLocal(cnpj: string): boolean {
  cnpj = limparMascara(cnpj);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(cnpj[12]) !== digito) return false;

  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(cnpj[13]) === digito;
}

function validarCpfLocal(cpf: string): boolean {
  cpf = limparMascara(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  let digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(cpf[9]) !== digito) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(cpf[10]) === digito;
}

router.get("/cnpj/:cnpj", async (req, res) => {
  const cnpj = limparMascara(req.params.cnpj);

  if (!validarCnpjLocal(cnpj)) {
    res.status(400).json({ message: "CNPJ inválido" });
    return;
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "Accept": "application/json", "User-Agent": "ContabDOC/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        res.status(404).json({ message: "CNPJ não encontrado na Receita Federal" });
        return;
      }
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;

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

    const atividadePrincipal = data.cnae_fiscal_descricao
      ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`
      : String(data.cnae_fiscal || "");

    const resultado = {
      cnpj: String(data.cnpj || cnpj),
      razaoSocial: String(data.razao_social || ""),
      nomeFantasia: String(data.nome_fantasia || ""),
      situacao: String(data.descricao_situacao_cadastral || data.situacao_cadastral || ""),
      situacaoDescricao: String(data.descricao_situacao_cadastral || ""),
      dataAbertura: String(data.data_inicio_atividade || ""),
      naturezaJuridica: String(data.descricao_natureza_juridica || ""),
      atividadePrincipal,
      logradouro: String(data.logradouro || ""),
      numero: String(data.numero || ""),
      complemento: String(data.complemento || ""),
      bairro: String(data.bairro || ""),
      municipio: String(data.municipio || ""),
      uf: String(data.uf || ""),
      cep: String(data.cep || "").replace(/\D/g, ""),
      telefone: String(data.ddd_telefone_1 || ""),
      email: String(data.email || ""),
      capitalSocial: String(data.capital_social || ""),
      socios,
    };

    res.json(resultado);
  } catch (err: unknown) {
    req.log.error({ err }, "Erro ao consultar CNPJ");
    res.status(502).json({ message: "Erro ao consultar Receita Federal. Tente novamente." });
  }
});

router.get("/cpf/:cpf", (req, res) => {
  const cpf = limparMascara(req.params.cpf);
  const valido = validarCpfLocal(cpf);

  res.json({
    cpf,
    valido,
    nome: valido ? undefined : undefined,
    situacao: valido ? "Regular" : "CPF inválido",
  });
});

export default router;
