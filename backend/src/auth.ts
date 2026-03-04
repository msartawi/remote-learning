import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

type AuthContext = {
  roles: string[];
  orgIds?: string[];
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const authRequired = process.env.AUTH_REQUIRED === "true";
const issuer = process.env.KEYCLOAK_ISSUER;
const jwksUrl = process.env.KEYCLOAK_JWKS_URL;
const audience = process.env.KEYCLOAK_AUDIENCE;

const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  if (!authRequired) {
    const devRoles = (req.header("x-dev-roles") || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const devOrgIds = (req.header("x-dev-org-ids") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    req.auth = { roles: devRoles, orgIds: devOrgIds };
    return next();
  }

  if (!issuer || !jwks) {
    return next(new Error("Keycloak config missing: KEYCLOAK_ISSUER/KEYCLOAK_JWKS_URL"));
  }

  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return next(new Error("Missing bearer token"));
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: audience || undefined,
    });
    const roles = Array.isArray((payload as any)?.realm_access?.roles)
      ? (payload as any).realm_access.roles
      : [];
    const rawOrgIds = (payload as any)?.org_ids ?? (payload as any)?.orgs ?? [];
    const orgIds: string[] = [];
    if (Array.isArray(rawOrgIds)) {
      orgIds.push(...rawOrgIds.map((id) => String(id)));
    } else if (typeof rawOrgIds === "string") {
      orgIds.push(rawOrgIds);
    }
    if (typeof (payload as any)?.org_id === "string") {
      orgIds.push((payload as any).org_id);
    }
    req.auth = { roles, orgIds: Array.from(new Set(orgIds)) };
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireAnyRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!authRequired) return next();
    const userRoles = req.auth?.roles || [];
    const allowed = roles.some((role) => userRoles.includes(role));
    if (!allowed) {
      return next(Object.assign(new Error("Forbidden"), { status: 403 }));
    }
    return next();
  };
}

