export const formatters = {
  cnpj: (value: string) => {
    if (!value) return "";
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .substring(0, 18);
  },
  cpf: (value: string) => {
    if (!value) return "";
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  },
  cep: (value: string) => {
    if (!value) return "";
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .substring(0, 9);
  },
  phone: (value: string) => {
    if (!value) return "";
    let v = value.replace(/\D/g, "");
    if (v.length > 10) {
      // Celular (11 digits)
      return v
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .substring(0, 15);
    } else {
      // Fixo (10 digits)
      return v
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .substring(0, 14);
    }
  },
  currency: (value: string) => {
    if (!value) return "";
    let v = value.replace(/\D/g, "");
    if (v.length === 0) return "";
    
    // pad with zeros
    while (v.length < 3) {
      v = "0" + v;
    }
    
    const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const result = new Intl.NumberFormat('pt-BR', options).format(
      parseFloat(v) / 100
    );
    return `R$ ${result}`;
  },
  date: (value: string) => {
    if (!value) return "";
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .substring(0, 10);
  },
  competencia: (value: string) => {
    if (!value) return "";
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1/$2")
      .substring(0, 7);
  },
  displayDate: (value?: string | null): string => {
    if (!value) return "—";
    const v = value.trim();
    const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    const brMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) return v;
    return v;
  },
  displayDateTime: (value?: string | null): string => {
    if (!value) return "—";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch { return value || "—"; }
  },
  unmask: (value: string) => {
    if (!value) return "";
    return value.replace(/\D/g, "");
  },
  unmaskCurrency: (value: string) => {
     if (!value) return "";
     const v = value.replace(/\D/g, "");
     if (!v) return "";
     return (parseFloat(v) / 100).toString();
  }
};
