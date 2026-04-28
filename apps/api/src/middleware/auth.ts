import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser, UserRole } from "@zulla/shared";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload extends AuthUser {
  iat: number;
  exp: number;
}

/**
 * Verifies the access token on `Authorization: Bearer <jwt>`. If `roles` is provided,
 * the authenticated user's role must be in the list — otherwise responds 403.
 */
export function requireAuth(roles?: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }
    const token = header.slice("Bearer ".length).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ ok: false, error: { message: "JWT not configured" } });
    }
    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ ok: false, error: { message: "Forbidden" } });
      }
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        companyName: decoded.companyName,
        contactName: decoded.contactName,
        phone: decoded.phone,
        emailVerified: decoded.emailVerified,
      };
      next();
    } catch {
      return res.status(401).json({ ok: false, error: { message: "Invalid or expired token" } });
    }
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) return next();
  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) return next();
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      companyName: decoded.companyName,
      contactName: decoded.contactName,
      phone: decoded.phone,
      emailVerified: decoded.emailVerified,
    };
  } catch {
    /* ignore */
  }
  next();
}
