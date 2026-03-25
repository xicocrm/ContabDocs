import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "contabdoc-jwt-secret-2025";

export interface AuthPayload {
  id: number;
  email: string;
  nome: string;
  perfil: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Não autenticado" });
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), SECRET) as any;
    if (payload.type === "portal") {
      res.status(403).json({ message: "Acesso negado — token de portal não autorizado" });
      return;
    }
    req.user = {
      id: payload.id,
      email: payload.email,
      nome: payload.nome,
      perfil: payload.perfil,
    };
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
}
