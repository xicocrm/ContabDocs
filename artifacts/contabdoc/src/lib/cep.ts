export interface CepData {
  logradouro: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

export async function buscarCep(cep: string): Promise<CepData> {
  const raw = cep.replace(/\D/g, "");
  if (raw.length !== 8) throw new Error("CEP deve ter 8 dígitos");
  const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
  if (!res.ok) throw new Error("Erro ao consultar os Correios");
  const data = await res.json();
  if (data.erro) throw new Error("CEP não encontrado nos Correios");
  return {
    cep: raw,
    logradouro: data.logradouro || "",
    complemento: data.complemento || "",
    bairro: data.bairro || "",
    municipio: data.localidade || "",
    uf: data.uf || "",
  };
}
