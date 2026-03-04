import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

type AuthUser = {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
};

type AuthContext = {
  roles: string[];
  orgIds?: string[];
  user?: AuthUser;
};

declare module "express-session" {
  interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    roles?: string[];
    orgIds?: string[];
    user?: AuthUser;
  }
}

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
const audienceEnv = process.env.KEYCLOAK_AUDIENCE;
const audience = audienceEnv
  ? audienceEnv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  : undefined;

const keycloakBaseUrl =
  process.env.KEYCLOAK_BASE_URL || (issuer ? issuer.split("/realms/")[0] : undefined);
const keycloakRealm =
  process.env.KEYCLOAK_REALM || (issuer ? issuer.split("/realms/")[1] : undefined);
const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID || "femt-frontend";
const adminRealm = process.env.KEYCLOAK_ADMIN_REALM || "master";
const adminUser = process.env.KEYCLOAK_ADMIN_USER || process.env.KEYCLOAK_ADMIN;
const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;

const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
};

const publicPaths = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
]);

function getTokenEndpoint(realm?: string) {
  const resolvedRealm = realm || keycloakRealm;
  if (!keycloakBaseUrl || !resolvedRealm) {
    throw new Error("Keycloak base URL or realm is missing");
  }
  return `${keycloakBaseUrl}/realms/${resolvedRealm}/protocol/openid-connect/token`;
}

async function requestToken(params: URLSearchParams, realm?: string) {
  const endpoint = getTokenEndpoint(realm);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Token request failed (${response.status})`);
  }
  return (await response.json()) as TokenResponse;
}

export async function exchangePasswordToken(username: string, password: string) {
  const params = new URLSearchParams();
  params.set("grant_type", "password");
  params.set("client_id", keycloakClientId);
  params.set("username", username);
  params.set("password", password);
  params.set("scope", "openid profile email");
  return requestToken(params);
}

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("client_id", keycloakClientId);
  params.set("refresh_token", refreshToken);
  return requestToken(params);
}

async function getAdminToken() {
  if (!adminUser || !adminPassword) {
    throw new Error("Keycloak admin credentials missing");
  }
  const params = new URLSearchParams();
  params.set("grant_type", "password");
  params.set("client_id", "admin-cli");
  params.set("username", adminUser);
  params.set("password", adminPassword);
  const response = await requestToken(params, adminRealm);
  return response.access_token;
}

export async function createKeycloakUser(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
}) {
  if (!keycloakBaseUrl || !keycloakRealm) {
    throw new Error("Keycloak base URL or realm is missing");
  }
  const token = await getAdminToken();
  const createResponse = await fetch(`${keycloakBaseUrl}/admin/realms/${keycloakRealm}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: payload.email,
      email: payload.email,
      enabled: true,
      emailVerified: false,
      firstName: payload.firstName,
      lastName: payload.lastName,
      attributes: payload.organization ? { organization: [payload.organization] } : undefined,
    }),
  });

  if (createResponse.status === 409) {
    throw new Error("User already exists");
  }
  if (!createResponse.ok) {
    const text = await createResponse.text();
    throw new Error(text || `Failed to create user (${createResponse.status})`);
  }

  const location = createResponse.headers.get("location") || "";
  const userId = location.split("/").pop();
  if (!userId) {
    throw new Error("Unable to determine created user id");
  }

  const passwordResponse = await fetch(
    `${keycloakBaseUrl}/admin/realms/${keycloakRealm}/users/${userId}/reset-password`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "password",
        value: payload.password,
        temporary: false,
      }),
    }
  );
  if (!passwordResponse.ok) {
    const text = await passwordResponse.text();
    throw new Error(text || `Failed to set password (${passwordResponse.status})`);
  }

  return userId;
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  if (!issuer || !jwks) {
    throw new Error("Keycloak config missing: KEYCLOAK_ISSUER/KEYCLOAK_JWKS_URL");
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: audience && audience.length > 0 ? audience : undefined,
  });
  return extractAuthContext(payload);
}

function extractAuthContext(payload: any): AuthContext {
  const roles = Array.isArray(payload?.realm_access?.roles) ? payload.realm_access.roles : [];
  const rawOrgIds = payload?.org_ids ?? payload?.orgs ?? [];
  const orgIds: string[] = [];
  if (Array.isArray(rawOrgIds)) {
    orgIds.push(...rawOrgIds.map((id) => String(id)));
  } else if (typeof rawOrgIds === "string") {
    orgIds.push(rawOrgIds);
  }
  if (typeof payload?.org_id === "string") {
    orgIds.push(payload.org_id);
  }

  const user: AuthUser = {
    id: payload?.sub,
    username: payload?.preferred_username,
    email: payload?.email,
    name: payload?.name,
    firstName: payload?.given_name,
    lastName: payload?.family_name,
  };

  return {
    roles,
    orgIds: Array.from(new Set(orgIds)),
    user,
  };
}

function isJwtExpired(error: unknown) {
  return typeof error === "object" && error !== null && (error as any).code === "ERR_JWT_EXPIRED";
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  if (publicPaths.has(req.path)) {
    return next();
  }
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

  const sessionToken = req.session?.accessToken;
  if (sessionToken) {
    try {
      req.auth = await verifyAccessToken(sessionToken);
      return next();
    } catch (err) {
      if (isJwtExpired(err) && req.session?.refreshToken) {
        try {
          const refreshed = await refreshAccessToken(req.session.refreshToken);
          req.session.accessToken = refreshed.access_token;
          if (refreshed.refresh_token) {
            req.session.refreshToken = refreshed.refresh_token;
          }
          req.auth = await verifyAccessToken(refreshed.access_token);
          return next();
        } catch (refreshErr) {
          return next(refreshErr);
        }
      }
      return next(err);
    }
  }

  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return next(new Error("Missing bearer token"));
  }

  try {
    req.auth = await verifyAccessToken(token);
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

