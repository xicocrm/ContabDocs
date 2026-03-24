import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface EscritorioContextType {
  escritorioId: number | null;
  escritorioNome: string;
  setEscritorio: (id: number, nome: string) => void;
  clearEscritorio: () => void;
}

const EscritorioContext = createContext<EscritorioContextType>({
  escritorioId: null,
  escritorioNome: "",
  setEscritorio: () => {},
  clearEscritorio: () => {},
});

export function EscritorioProvider({ children }: { children: ReactNode }) {
  const [escritorioId, setEscritorioId] = useState<number | null>(null);
  const [escritorioNome, setEscritorioNome] = useState("");

  useEffect(() => {
    const savedId = localStorage.getItem("escritorioId");
    const savedNome = localStorage.getItem("escritorioNome");
    if (savedId) {
      setEscritorioId(parseInt(savedId));
      setEscritorioNome(savedNome || "");
    }
  }, []);

  const setEscritorio = (id: number, nome: string) => {
    setEscritorioId(id);
    setEscritorioNome(nome);
    localStorage.setItem("escritorioId", String(id));
    localStorage.setItem("escritorioNome", nome);
  };

  const clearEscritorio = () => {
    setEscritorioId(null);
    setEscritorioNome("");
    localStorage.removeItem("escritorioId");
    localStorage.removeItem("escritorioNome");
  };

  return (
    <EscritorioContext.Provider value={{ escritorioId, escritorioNome, setEscritorio, clearEscritorio }}>
      {children}
    </EscritorioContext.Provider>
  );
}

export function useEscritorio() {
  return useContext(EscritorioContext);
}
