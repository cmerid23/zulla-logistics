import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@zulla/shared";

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ ok: false, error: { message: "Not authenticated" } });
    }
    if (!allowed.includes(role)) {
      return res.status(403).json({ ok: false, error: { message: "Forbidden" } });
    }
    next();
  };
}
