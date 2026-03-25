import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeColor = "blue" | "emerald" | "violet" | "rose" | "amber" | "cyan" | "indigo" | "orange";

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({ themeColor: "blue", setThemeColor: () => {} });

const THEME_COLORS: Record<ThemeColor, { primary: string; ring: string; chart1: string; sidebarPrimary: string; sidebarRing: string }> = {
  blue:    { primary: "217 91% 60%", ring: "217 91% 60%", chart1: "217 91% 60%", sidebarPrimary: "217 91% 60%", sidebarRing: "217 91% 60%" },
  emerald: { primary: "160 84% 39%", ring: "160 84% 39%", chart1: "160 84% 39%", sidebarPrimary: "160 84% 39%", sidebarRing: "160 84% 39%" },
  violet:  { primary: "263 70% 50%", ring: "263 70% 50%", chart1: "263 70% 50%", sidebarPrimary: "263 70% 50%", sidebarRing: "263 70% 50%" },
  rose:    { primary: "347 77% 50%", ring: "347 77% 50%", chart1: "347 77% 50%", sidebarPrimary: "347 77% 50%", sidebarRing: "347 77% 50%" },
  amber:   { primary: "38 92% 50%",  ring: "38 92% 50%",  chart1: "38 92% 50%",  sidebarPrimary: "38 92% 50%",  sidebarRing: "38 92% 50%" },
  cyan:    { primary: "188 94% 43%", ring: "188 94% 43%", chart1: "188 94% 43%", sidebarPrimary: "188 94% 43%", sidebarRing: "188 94% 43%" },
  indigo:  { primary: "239 84% 67%", ring: "239 84% 67%", chart1: "239 84% 67%", sidebarPrimary: "239 84% 67%", sidebarRing: "239 84% 67%" },
  orange:  { primary: "25 95% 53%",  ring: "25 95% 53%",  chart1: "25 95% 53%",  sidebarPrimary: "25 95% 53%",  sidebarRing: "25 95% 53%" },
};

export const THEME_LABELS: Record<ThemeColor, string> = {
  blue: "Azul Profissional",
  emerald: "Esmeralda",
  violet: "Violeta",
  rose: "Rosa",
  amber: "Âmbar",
  cyan: "Ciano",
  indigo: "Índigo",
  orange: "Laranja",
};

export const THEME_HEX: Record<ThemeColor, string> = {
  blue: "#3b82f6",
  emerald: "#10b981",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  orange: "#f97316",
};

function applyTheme(color: ThemeColor) {
  const root = document.documentElement;
  const vars = THEME_COLORS[color];
  root.style.setProperty("--primary", vars.primary);
  root.style.setProperty("--ring", vars.ring);
  root.style.setProperty("--chart-1", vars.chart1);
  root.style.setProperty("--sidebar-primary", vars.sidebarPrimary);
  root.style.setProperty("--sidebar-ring", vars.sidebarRing);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem("contabdoc-theme-color");
    return (saved as ThemeColor) || "blue";
  });

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem("contabdoc-theme-color", color);
    applyTheme(color);
  };

  useEffect(() => {
    applyTheme(themeColor);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
