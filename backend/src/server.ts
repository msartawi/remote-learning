import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import session from "express-session";
import rateLimit from "express-rate-limit";
import {
  authenticate,
  createKeycloakUser,
  exchangePasswordToken,
  assignRealmRoleToUser,
  findKeycloakUserByEmail,
  requireAnyRole,
  resetKeycloakUserPassword,
  verifyAccessToken,
} from "./auth.js";
import { query } from "./db.js";
import { STORAGE_MODES, normalizeStorageMode, type StorageMode } from "./storageModes.js";
import nodemailer from "nodemailer";

const app = express();
const port = Number(process.env.PORT || 3001);
const autoMigrate = process.env.AUTO_MIGRATE === "true";
const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret";
const cookieSecureEnv = process.env.COOKIE_SECURE;
const cookieSecure =
  cookieSecureEnv === "auto"
    ? "auto"
    : cookieSecureEnv !== undefined
      ? cookieSecureEnv === "true"
      : process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
const defaultRole = process.env.DEFAULT_ROLE || "student";
const allowSelfAssignRoles = (process.env.ALLOW_SELF_ASSIGN_ROLES || "")
  .split(",")
  .map((role) => role.trim())
  .filter(Boolean);
const resetLinkBase =
  process.env.RESET_LINK_BASE ||
  process.env.APP_PUBLIC_URL ||
  process.env.INVITE_URL_BASE ||
  "https://femt.llc";
const resetTokenTtlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpIgnoreTls =
  process.env.SMTP_IGNORE_TLS === "true" || process.env.SMTP_IGNORE_TLS === "1";
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || "noreply@femt.llc";
const authRateWindowMs = Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000);
const authRateMax = Number(process.env.AUTH_RATE_MAX || 20);
const forgotRateMax = Number(process.env.FORGOT_RATE_MAX || 6);
const resetRateMax = Number(process.env.RESET_RATE_MAX || 6);

if (process.env.NODE_ENV === "production" && sessionSecret === "dev-session-secret") {
  console.warn("SESSION_SECRET is not set; using insecure default");
}

const smtpConfigured = Boolean(smtpHost);
const mailTransport = smtpConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      ignoreTLS: smtpIgnoreTls,
      ...(smtpUser && smtpPass
        ? {
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          }
        : {}),
    })
  : null;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function auditAuthEvent(
  event: string,
  req: express.Request,
  details: {
    email?: string;
    success?: boolean;
    reason?: string;
    role?: string;
  }
) {
  const entry = {
    event,
    success: details.success ?? true,
    ip: req.ip,
    userAgent: req.get("user-agent") || "",
    emailHash: details.email ? hashIdentifier(details.email) : undefined,
    reason: details.reason,
    role: details.role,
    at: new Date().toISOString(),
  };
  console.info("auth_audit", JSON.stringify(entry));
}

function buildResetEmailHtml(resetUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111827;border:1px solid #334155;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#f8fafc;">Reset your FEMT password</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                  We received a request to reset your account password. For your security, this link expires in ${resetTokenTtlMinutes} minutes and can be used only once.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#34d399;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px;">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px 28px;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">If the button does not work, copy and paste this URL:</p>
                <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#cbd5e1;">${escapeHtml(resetUrl)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #334155;background:#0b1220;">
                <p style="margin:0;font-size:12px;color:#64748b;">If you did not request a password reset, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildResetEmailText(resetUrl: string) {
  return [
    "Reset your FEMT password",
    "",
    `Use this link to reset your password (expires in ${resetTokenTtlMinutes} minutes):`,
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
}

function buildWelcomeEmailHtml(options: {
  name: string;
  appUrl: string;
  role?: string;
  organization?: string;
}) {
  const greetingName = options.name || "there";
  const roleLine = options.role
    ? `<p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;">Role: ${escapeHtml(
        options.role
      )}</p>`
    : "";
  const orgLine = options.organization
    ? `<p style="margin:4px 0 0 0;font-size:13px;color:#94a3b8;">Organization: ${escapeHtml(
        options.organization
      )}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to FEMT</title>
  </head>
  <body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111827;border:1px solid #334155;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#f8fafc;">Welcome to FEMT, ${escapeHtml(
                  greetingName
                )}</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                  Your FEMT account is ready. You can now join classes, collaborate with your organization, and host secure learning sessions.
                </p>
                ${roleLine}
                ${orgLine}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <a href="${escapeHtml(
                  options.appUrl
                )}" style="display:inline-block;background:#34d399;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px;">Open FEMT</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px 28px;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">If the button does not work, copy and paste this URL:</p>
                <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#cbd5e1;">${escapeHtml(
                  options.appUrl
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #334155;background:#0b1220;">
                <p style="margin:0;font-size:12px;color:#64748b;">Need help? Reply to this email or contact your administrator.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildWelcomeEmailText(options: {
  name: string;
  appUrl: string;
  role?: string;
  organization?: string;
}) {
  const lines = [
    `Welcome to FEMT, ${options.name || "there"}`,
    "",
    "Your FEMT account is ready. You can now join classes, collaborate with your organization, and host secure learning sessions.",
  ];
  if (options.role) {
    lines.push(`Role: ${options.role}`);
  }
  if (options.organization) {
    lines.push(`Organization: ${options.organization}`);
  }
  lines.push("", "Open FEMT:", options.appUrl);
  return lines.join("\n");
}

app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);
app.use(
  session({
    name: "femt_session",
    secret: sessionSecret,
    proxy: true,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure,
      domain: cookieDomain,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

const authLimiter = rateLimit({
  windowMs: authRateWindowMs,
  max: authRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const forgotLimiter = rateLimit({
  windowMs: authRateWindowMs,
  max: forgotRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const resetLimiter = rateLimit({
  windowMs: authRateWindowMs,
  max: resetRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  const email = String(req.body.email || "").trim();
  try {
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const tokens = await exchangePasswordToken(email, password);
    const authContext = await verifyAccessToken(tokens.access_token);
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.user = authContext.user;
    req.session.roles = authContext.roles;
    req.session.orgIds = authContext.orgIds;
    res.json({
      user: authContext.user,
      roles: authContext.roles,
      orgIds: authContext.orgIds || [],
    });
    auditAuthEvent("login", req, { email, success: true });
  } catch (err) {
    auditAuthEvent("login", req, { email, success: false, reason: getErrorMessage(err) });
    next(err);
  }
});

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  const email = String(req.body.email || "").trim();
  const organization = String(req.body.organization || "").trim();
  try {
    const password = String(req.body.password || "");
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const requestedRole = String(req.body.role || "").trim();
    const inviteCode = String(req.body.invite_code || req.body.inviteCode || "")
      .trim()
      .toUpperCase();
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    let invite: InviteRow | null = null;
    if (inviteCode) {
      const inviteResult = await query<InviteRow>(
        `SELECT id, org_id, code, role, expires_at, max_uses, uses_count, revoked, created_at
         FROM org_invites WHERE code = $1`,
        [inviteCode]
      );
      if (inviteResult.rows.length === 0) {
        return res.status(400).json({ error: "Invalid invite code" });
      }
      invite = inviteResult.rows[0];
      const expired = invite.expires_at ? Date.parse(invite.expires_at) < Date.now() : false;
      if (invite.revoked || expired || invite.uses_count >= invite.max_uses) {
        return res.status(400).json({ error: "Invite code is expired or exhausted" });
      }
    }
    const userId = await createKeycloakUser({
      email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      organization: organization || undefined,
    });
    const assignedRole = invite
      ? invite.role
      : requestedRole && allowSelfAssignRoles.includes(requestedRole)
        ? requestedRole
        : defaultRole;
    if (assignedRole) {
      await assignRealmRoleToUser(userId, assignedRole);
    }
    if (invite) {
      await addMembership(invite.org_id, email, invite.role);
      await query("UPDATE org_invites SET uses_count = uses_count + 1 WHERE id = $1", [invite.id]);
    }
    const tokens = await exchangePasswordToken(email, password);
    const authContext = await verifyAccessToken(tokens.access_token);
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.user = authContext.user;
    req.session.roles = authContext.roles;
    req.session.orgIds = authContext.orgIds;
    if (mailTransport) {
      const appUrl = resetLinkBase.replace(/\/$/, "");
      const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
      mailTransport
        .sendMail({
          from: smtpFrom,
          to: email,
          subject: "Welcome to FEMT",
          text: buildWelcomeEmailText({
            name: displayName || email,
            appUrl,
            role: assignedRole || undefined,
            organization: organization || undefined,
          }),
          html: buildWelcomeEmailHtml({
            name: displayName || email,
            appUrl,
            role: assignedRole || undefined,
            organization: organization || undefined,
          }),
        })
        .catch((err) => {
          console.error("Welcome email dispatch failed", err);
        });
    }
    res.status(201).json({
      user: authContext.user,
      roles: authContext.roles,
      orgIds: authContext.orgIds || [],
      assignedRole,
    });
    auditAuthEvent("register", req, { email, success: true, role: assignedRole || undefined });
  } catch (err) {
    auditAuthEvent("register", req, { email, success: false, reason: getErrorMessage(err) });
    next(err);
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post("/api/auth/forgot-password", forgotLimiter, async (req, res, next) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  // Always return success to avoid user enumeration.
  if (!email || !mailTransport) {
    return res.json({ ok: true });
  }
  try {
    auditAuthEvent("reset_requested", req, { email, success: true });
    const user = await findKeycloakUserByEmail(email);
    if (!user?.id) {
      return res.json({ ok: true });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    await query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_email = $1 AND used_at IS NULL",
      [email]
    );
    await query<PasswordResetTokenRow>(
      `INSERT INTO password_reset_tokens (user_email, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)
       RETURNING id, user_email, token_hash, expires_at, used_at, created_at`,
      [email, tokenHash, String(resetTokenTtlMinutes)]
    );

    const resetUrl = `${resetLinkBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(
      token
    )}`;
    await mailTransport.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Reset your FEMT password",
      text: buildResetEmailText(resetUrl),
      html: buildResetEmailHtml(resetUrl),
    });
  } catch (err) {
    // Keep response generic even when SMTP/Keycloak fails.
    auditAuthEvent("reset_requested", req, { email, success: false, reason: getErrorMessage(err) });
    console.error("Forgot password dispatch failed", err);
  }
  return res.json({ ok: true });
});

app.post("/api/auth/reset-password", resetLimiter, async (req, res, next) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "");
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "token and a strong newPassword are required" });
    }
    const tokenHash = hashResetToken(token);
    const tokenResult = await query<PasswordResetTokenRow>(
      `SELECT id, user_email, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "invalid_token" });
    }
    const row = tokenResult.rows[0];
    const expired = Date.parse(row.expires_at) < Date.now();
    if (row.used_at || expired) {
      return res.status(410).json({ error: "token_expired" });
    }

    const user = await findKeycloakUserByEmail(row.user_email);
    if (!user?.id) {
      await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [row.id]);
      return res.status(400).json({ error: "invalid_token" });
    }

    await resetKeycloakUserPassword(user.id, newPassword);
    await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [row.id]);
    auditAuthEvent("reset_completed", req, { email: row.user_email, success: true });
    return res.json({ ok: true });
  } catch (err) {
    auditAuthEvent("reset_completed", req, { success: false, reason: getErrorMessage(err) });
    return next(err);
  }
});

app.use(authenticate);

app.use(async (req, _res, next) => {
  try {
    const email = req.auth?.user?.email?.toLowerCase();
    if (!email) return next();
    const memberships = await query<MembershipRow>(
      "SELECT org_id, user_email, role FROM org_memberships WHERE user_email = $1",
      [email]
    );
    if (memberships.rows.length === 0) return next();
    const membershipOrgIds = memberships.rows.map((membership) => membership.org_id);
    const membershipRoles = memberships.rows.map((membership) => membership.role);
    req.auth = {
      ...req.auth,
      orgIds: Array.from(new Set([...(req.auth?.orgIds || []), ...membershipOrgIds])),
      roles: Array.from(new Set([...(req.auth?.roles || []), ...membershipRoles])),
    };
    return next();
  } catch (err) {
    return next(err);
  }
});

app.get("/api/auth/me", (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  res.json({
    user: req.auth.user,
    roles: req.auth.roles,
    orgIds: req.auth.orgIds || [],
  });
});

type OrgRow = {
  id: string;
  name: string;
  default_storage_mode: StorageMode;
  allow_room_override: boolean;
};

type RoomRow = {
  id: string;
  org_id: string;
  name: string;
  storage_mode_override: StorageMode | null;
};

type MembershipRow = {
  org_id: string;
  user_email: string;
  role: "org_admin" | "teacher" | "student";
};

type InviteRow = {
  id: string;
  org_id: string;
  code: string;
  role: "org_admin" | "teacher" | "student";
  expires_at: string | null;
  max_uses: number;
  uses_count: number;
  revoked: boolean;
  created_at: string;
};

type PasswordResetTokenRow = {
  id: string;
  user_email: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type SessionBootstrap = {
  room_id: string;
  room_name: string;
  jitsi_domain: string;
  jitsi_room_name: string;
  display_name: string;
  role: string;
  can_broadcast: boolean;
  storage_mode: StorageMode;
  collab_channels: {
    chat: boolean;
    whiteboard: boolean;
    files: boolean;
  };
};

const jitsiDomain = process.env.JITSI_DOMAIN || "meet.jit.si";
const inviteUrlBase = process.env.INVITE_URL_BASE || process.env.APP_PUBLIC_URL || "";

function isOrgAllowed(req: express.Request, orgId: string) {
  const roles = req.auth?.roles || [];
  if (roles.includes("org_admin")) return true;
  const orgIds = req.auth?.orgIds;
  if (!orgIds || orgIds.length === 0) return true;
  return orgIds.includes(orgId);
}

function normalizeInviteRole(input: unknown): MembershipRow["role"] | null {
  if (input === "org_admin" || input === "teacher" || input === "student") {
    return input;
  }
  return null;
}

function generateInviteCode() {
  return randomBytes(9).toString("base64url").toUpperCase();
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function addMembership(orgId: string, email: string, role: MembershipRow["role"]) {
  await query(
    `INSERT INTO org_memberships (org_id, user_email, role)
     VALUES ($1, LOWER($2), $3)
     ON CONFLICT (org_id, user_email)
     DO UPDATE SET role = EXCLUDED.role`,
    [orgId, email, role]
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/orgs/:orgId/invites", requireAnyRole(["org_admin", "teacher"]), async (req, res, next) => {
  try {
    if (!isOrgAllowed(req, req.params.orgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = await query<InviteRow>(
      `SELECT id, org_id, code, role, expires_at, max_uses, uses_count, revoked, created_at
       FROM org_invites
       WHERE org_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/orgs/:orgId/invites", requireAnyRole(["org_admin", "teacher"]), async (req, res, next) => {
  try {
    if (!isOrgAllowed(req, req.params.orgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const role = normalizeInviteRole(req.body.role || "student");
    if (!role) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const expiresInDays = Number(req.body.expires_in_days || 7);
    const maxUses = Number(req.body.max_uses || 1);
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
      return res.status(400).json({ error: "expires_in_days must be between 1 and 90" });
    }
    if (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 100) {
      return res.status(400).json({ error: "max_uses must be between 1 and 100" });
    }
    const code = generateInviteCode();
    const createdBy = req.auth?.user?.email || null;
    const result = await query<InviteRow>(
      `INSERT INTO org_invites (org_id, code, role, created_by_email, expires_at, max_uses)
       VALUES ($1, $2, $3, $4, NOW() + ($5::text || ' days')::interval, $6)
       RETURNING id, org_id, code, role, expires_at, max_uses, uses_count, revoked, created_at`,
      [req.params.orgId, code, role, createdBy, String(expiresInDays), maxUses]
    );
    const invite = result.rows[0];
    const redeemUrl = inviteUrlBase ? `${inviteUrlBase}/register?invite=${invite.code}` : null;
    res.status(201).json({ ...invite, redeem_url: redeemUrl });
  } catch (err) {
    next(err);
  }
});

app.post("/api/invites/redeem", requireAnyRole(["org_admin", "teacher", "student"]), async (req, res, next) => {
  try {
    const email = req.auth?.user?.email;
    if (!email) return res.status(400).json({ error: "Authenticated email is required" });
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Invite code is required" });
    const inviteResult = await query<InviteRow>(
      `SELECT id, org_id, code, role, expires_at, max_uses, uses_count, revoked, created_at
       FROM org_invites WHERE code = $1`,
      [code]
    );
    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }
    const invite = inviteResult.rows[0];
    const expired = invite.expires_at ? Date.parse(invite.expires_at) < Date.now() : false;
    if (invite.revoked || expired || invite.uses_count >= invite.max_uses) {
      return res.status(400).json({ error: "Invite is expired or exhausted" });
    }
    await addMembership(invite.org_id, email, invite.role);
    await query("UPDATE org_invites SET uses_count = uses_count + 1 WHERE id = $1", [invite.id]);
    res.json({ org_id: invite.org_id, role: invite.role, code: invite.code });
  } catch (err) {
    next(err);
  }
});

app.get(
  "/api/sessions/:roomId/bootstrap",
  requireAnyRole(["org_admin", "teacher", "student"]),
  async (req, res, next) => {
    try {
      const roomId = req.params.roomId;
      const isUuid = uuidPattern.test(roomId);
      let payload: SessionBootstrap;

      if (!isUuid) {
        const role = req.auth?.roles?.includes("org_admin")
          ? "org_admin"
          : req.auth?.roles?.includes("teacher")
            ? "teacher"
            : "student";
        payload = {
          room_id: roomId,
          room_name: roomId,
          jitsi_domain: jitsiDomain,
          jitsi_room_name: `femt-${roomId}`.replace(/[^a-zA-Z0-9-_]/g, "-"),
          display_name: req.auth?.user?.name || req.auth?.user?.email || "FEMT User",
          role,
          can_broadcast: role === "org_admin" || role === "teacher",
          storage_mode: "metadata_only",
          collab_channels: { chat: true, whiteboard: true, files: true },
        };
        return res.json(payload);
      }

      const roomResult = await query<RoomRow>(
        "SELECT id, org_id, name, storage_mode_override FROM rooms WHERE id = $1",
        [roomId]
      );
      if (roomResult.rows.length === 0) {
        return res.status(404).json({ error: "room not found" });
      }
      const room = roomResult.rows[0];
      if (!isOrgAllowed(req, room.org_id)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const orgResult = await query<OrgRow>(
        "SELECT default_storage_mode, allow_room_override FROM orgs WHERE id = $1",
        [room.org_id]
      );
      if (orgResult.rows.length === 0) return res.status(404).json({ error: "org not found" });
      const storageMode = room.storage_mode_override || orgResult.rows[0].default_storage_mode;
      const role = req.auth?.roles?.includes("org_admin")
        ? "org_admin"
        : req.auth?.roles?.includes("teacher")
          ? "teacher"
          : "student";

      payload = {
        room_id: room.id,
        room_name: room.name,
        jitsi_domain: jitsiDomain,
        jitsi_room_name: `femt-${room.id}`,
        display_name: req.auth?.user?.name || req.auth?.user?.email || "FEMT User",
        role,
        can_broadcast: role === "org_admin" || role === "teacher",
        storage_mode: storageMode,
        collab_channels: {
          chat: true,
          whiteboard: true,
          files: storageMode !== "fully_p2p",
        },
      };
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  }
);

app.get("/api/orgs", requireAnyRole(["org_admin", "teacher", "student"]), async (req, res, next) => {
  try {
    const roles = req.auth?.roles || [];
    const orgIds = req.auth?.orgIds || [];
    const shouldFilter = !roles.includes("org_admin") && orgIds.length > 0;
    const result = shouldFilter
      ? await query<OrgRow>(
          "SELECT id, name, default_storage_mode, allow_room_override FROM orgs WHERE id = ANY($1::uuid[]) ORDER BY created_at DESC",
          [orgIds]
        )
      : await query<OrgRow>(
          "SELECT id, name, default_storage_mode, allow_room_override FROM orgs ORDER BY created_at DESC"
        );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get(
  "/api/orgs/:orgId/rooms",
  requireAnyRole(["org_admin", "teacher", "student"]),
  async (req, res, next) => {
  try {
    if (!isOrgAllowed(req, req.params.orgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = await query<RoomRow>(
      "SELECT id, org_id, name, storage_mode_override FROM rooms WHERE org_id = $1 ORDER BY created_at DESC",
      [req.params.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
  }
);

app.post("/api/orgs", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const defaultMode = normalizeStorageMode(req.body.default_storage_mode);
    if (!name || !defaultMode) {
      return res.status(400).json({ error: "name and default_storage_mode are required" });
    }
    const result = await query<OrgRow>(
      "INSERT INTO orgs (name, default_storage_mode) VALUES ($1, $2) RETURNING id, name, default_storage_mode, allow_room_override",
      [name, defaultMode]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get("/api/orgs/:orgId/settings", requireAnyRole(["org_admin", "teacher"]), async (req, res, next) => {
  try {
    if (!isOrgAllowed(req, req.params.orgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = await query<OrgRow>(
      "SELECT id, name, default_storage_mode, allow_room_override FROM orgs WHERE id = $1",
      [req.params.orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "org not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.put("/api/orgs/:orgId/settings", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    if (!isOrgAllowed(req, req.params.orgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const defaultMode = normalizeStorageMode(req.body.default_storage_mode);
    const allowRoomOverride =
      req.body.allow_room_override === "true" || req.body.allow_room_override === true;
    if (!defaultMode) {
      return res.status(400).json({ error: "default_storage_mode is required" });
    }
    const result = await query<OrgRow>(
      "UPDATE orgs SET default_storage_mode = $1, allow_room_override = $2 WHERE id = $3 RETURNING id, name, default_storage_mode, allow_room_override",
      [defaultMode, allowRoomOverride, req.params.orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "org not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get(
  "/api/rooms/:roomId/settings",
  requireAnyRole(["org_admin", "teacher", "student"]),
  async (req, res, next) => {
  try {
    const result = await query<RoomRow>(
      "SELECT id, org_id, name, storage_mode_override FROM rooms WHERE id = $1",
      [req.params.roomId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "room not found" });
    const room = result.rows[0];
    if (!isOrgAllowed(req, room.org_id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const orgResult = await query<OrgRow>(
      "SELECT default_storage_mode, allow_room_override FROM orgs WHERE id = $1",
      [room.org_id]
    );
    if (orgResult.rows.length === 0) return res.status(404).json({ error: "org not found" });
    const org = orgResult.rows[0];
    res.json({
      room_id: room.id,
      org_id: room.org_id,
      storage_mode_override: room.storage_mode_override,
      effective_storage_mode: room.storage_mode_override || org.default_storage_mode,
      allow_room_override: org.allow_room_override,
    });
  } catch (err) {
    next(err);
  }
  }
);

app.post("/api/orgs/:orgId/rooms", requireAnyRole(["org_admin", "teacher"]), async (req, res, next) => {
  try {
    if (!isOrgAllowed(req, req.params.orgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const name = String(req.body.name || "").trim();
    const override = normalizeStorageMode(req.body.storage_mode_override);
    if (!name) return res.status(400).json({ error: "name is required" });
    const orgResult = await query<OrgRow>(
      "SELECT allow_room_override FROM orgs WHERE id = $1",
      [req.params.orgId]
    );
    if (orgResult.rows.length === 0) return res.status(404).json({ error: "org not found" });
    if (!orgResult.rows[0].allow_room_override && override) {
      return res.status(400).json({ error: "room overrides are disabled for this org" });
    }
    const result = await query<RoomRow>(
      "INSERT INTO rooms (org_id, name, storage_mode_override) VALUES ($1, $2, $3) RETURNING id, org_id, name, storage_mode_override",
      [req.params.orgId, name, override]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.put("/api/rooms/:roomId/settings", requireAnyRole(["org_admin", "teacher"]), async (req, res, next) => {
  try {
    const override = normalizeStorageMode(req.body.storage_mode_override);
    const result = await query<RoomRow>(
      "SELECT id, org_id FROM rooms WHERE id = $1",
      [req.params.roomId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "room not found" });
    if (!isOrgAllowed(req, result.rows[0].org_id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const orgResult = await query<OrgRow>(
      "SELECT allow_room_override FROM orgs WHERE id = $1",
      [result.rows[0].org_id]
    );
    if (orgResult.rows.length === 0) return res.status(404).json({ error: "org not found" });
    if (!orgResult.rows[0].allow_room_override && override) {
      return res.status(400).json({ error: "room overrides are disabled for this org" });
    }
    const update = await query<RoomRow>(
      "UPDATE rooms SET storage_mode_override = $1 WHERE id = $2 RETURNING id, org_id, name, storage_mode_override",
      [override, req.params.roomId]
    );
    res.json(update.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Admin UI (minimal, server-rendered)
app.get("/admin", requireAnyRole(["org_admin"]), (_req, res) => {
  res.redirect("/admin/orgs");
});

app.get("/admin/orgs", requireAnyRole(["org_admin"]), async (_req, res, next) => {
  try {
    const orgs = await query<OrgRow>(
      "SELECT id, name, default_storage_mode, allow_room_override FROM orgs ORDER BY created_at DESC"
    );
    res.send(renderOrgList(orgs.rows));
  } catch (err) {
    next(err);
  }
});

app.post("/admin/orgs", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const defaultMode = normalizeStorageMode(req.body.default_storage_mode);
    if (!name || !defaultMode) {
      return res.status(400).send("Missing name or storage mode");
    }
    const result = await query<OrgRow>(
      "INSERT INTO orgs (name, default_storage_mode) VALUES ($1, $2) RETURNING id",
      [name, defaultMode]
    );
    res.redirect(`/admin/orgs/${result.rows[0].id}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/orgs/:orgId", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    const orgResult = await query<OrgRow>(
      "SELECT id, name, default_storage_mode, allow_room_override FROM orgs WHERE id = $1",
      [req.params.orgId]
    );
    if (orgResult.rows.length === 0) return res.status(404).send("Org not found");
    const rooms = await query<RoomRow>(
      "SELECT id, org_id, name, storage_mode_override FROM rooms WHERE org_id = $1 ORDER BY created_at DESC",
      [req.params.orgId]
    );
    res.send(renderOrgDetail(orgResult.rows[0], rooms.rows));
  } catch (err) {
    next(err);
  }
});

app.post("/admin/orgs/:orgId/settings", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    const defaultMode = normalizeStorageMode(req.body.default_storage_mode);
    const allowRoomOverride = req.body.allow_room_override === "on";
    if (!defaultMode) return res.status(400).send("Invalid storage mode");
    await query(
      "UPDATE orgs SET default_storage_mode = $1, allow_room_override = $2 WHERE id = $3",
      [defaultMode, allowRoomOverride, req.params.orgId]
    );
    res.redirect(`/admin/orgs/${req.params.orgId}`);
  } catch (err) {
    next(err);
  }
});

app.post("/admin/orgs/:orgId/rooms", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const override = normalizeStorageMode(req.body.storage_mode_override);
    if (!name) return res.status(400).send("Room name required");
    await query(
      "INSERT INTO rooms (org_id, name, storage_mode_override) VALUES ($1, $2, $3)",
      [req.params.orgId, name, override]
    );
    res.redirect(`/admin/orgs/${req.params.orgId}`);
  } catch (err) {
    next(err);
  }
});

app.post("/admin/rooms/:roomId/override", requireAnyRole(["org_admin"]), async (req, res, next) => {
  try {
    const override = normalizeStorageMode(req.body.storage_mode_override);
    const room = await query<RoomRow>(
      "SELECT id, org_id FROM rooms WHERE id = $1",
      [req.params.roomId]
    );
    if (room.rows.length === 0) return res.status(404).send("Room not found");
    await query("UPDATE rooms SET storage_mode_override = $1 WHERE id = $2", [
      override,
      req.params.roomId,
    ]);
    res.redirect(`/admin/orgs/${room.rows[0].org_id}`);
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = (err as any)?.status || 500;
  res.status(status).json({ error: message });
});

async function start() {
  if (autoMigrate) {
    await waitForDatabase();
    const schemaPath = join(__dirname, "..", "schema.sql");
    const sql = await readFile(schemaPath, "utf-8");
    await query(sql);
  }

  app.listen(port, () => {
    console.log(`Backend listening on :${port}`);
  });
}

async function waitForDatabase() {
  const attempts = 15;
  const delayMs = 2000;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await query("SELECT 1");
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`Database not ready (attempt ${i}/${attempts}). Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

start().catch((err) => {
  console.error("Startup failed", err);
  process.exit(1);
});

function renderOrgList(orgs: OrgRow[]) {
  return htmlPage("Organizations", `
    <h1>Organizations</h1>
    <form method="POST" action="/admin/orgs">
      <label>Name <input name="name" required /></label>
      <label>Default storage mode ${modeSelect("default_storage_mode")}</label>
      <button type="submit">Create org</button>
    </form>
    <ul>
      ${orgs
        .map(
          (org) =>
            `<li><a href="/admin/orgs/${org.id}">${escapeHtml(org.name)}</a> — ${escapeHtml(
              org.default_storage_mode
            )}</li>`
        )
        .join("")}
    </ul>
  `);
}

function renderOrgDetail(org: OrgRow, rooms: RoomRow[]) {
  return htmlPage(`Org ${org.name}`, `
    <h1>${escapeHtml(org.name)}</h1>
    <form method="POST" action="/admin/orgs/${org.id}/settings">
      <label>Default storage mode ${modeSelect("default_storage_mode", org.default_storage_mode)}</label>
      <label>
        <input type="checkbox" name="allow_room_override" ${org.allow_room_override ? "checked" : ""} />
        Allow room override
      </label>
      <button type="submit">Save</button>
    </form>

    <h2>Rooms</h2>
    <form method="POST" action="/admin/orgs/${org.id}/rooms">
      <label>Room name <input name="name" required /></label>
      <label>Override mode ${modeSelect("storage_mode_override", "", true)}</label>
      <button type="submit">Create room</button>
    </form>

    <ul>
      ${rooms
        .map(
          (room) => `
          <li>
            <strong>${escapeHtml(room.name)}</strong>
            <form method="POST" action="/admin/rooms/${room.id}/override" style="display:inline-block; margin-left:12px;">
              ${modeSelect("storage_mode_override", room.storage_mode_override || "", true)}
              <button type="submit">Update</button>
            </form>
          </li>`
        )
        .join("")}
    </ul>
    <p><a href="/admin/orgs">Back to list</a></p>
  `);
}

function modeSelect(name: string, selected = "", allowBlank = false) {
  const options = [
    allowBlank ? `<option value="">(use org default)</option>` : "",
    ...STORAGE_MODES.map(
      (mode) =>
        `<option value="${mode}" ${mode === selected ? "selected" : ""}>${mode}</option>`
    ),
  ].join("");
  return `<select name="${name}" required>${options}</select>`;
}

function htmlPage(title: string, body: string) {
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 920px; margin: 24px auto; padding: 0 16px; }
      form { margin: 12px 0; }
      label { margin-right: 12px; }
      input, select, button { margin: 0 6px; }
      ul { padding-left: 18px; }
    </style>
  </head>
  <body>${body}</body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}