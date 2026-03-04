import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import session from "express-session";
import {
  authenticate,
  createKeycloakUser,
  exchangePasswordToken,
  assignRealmRoleToUser,
  requireAnyRole,
  verifyAccessToken,
} from "./auth.js";
import { query } from "./db.js";
import { STORAGE_MODES, normalizeStorageMode, type StorageMode } from "./storageModes.js";

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

if (process.env.NODE_ENV === "production" && sessionSecret === "dev-session-secret") {
  console.warn("SESSION_SECRET is not set; using insecure default");
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

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim();
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
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const organization = String(req.body.organization || "").trim();
    const requestedRole = String(req.body.role || "").trim();
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const userId = await createKeycloakUser({
      email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      organization: organization || undefined,
    });
    const assignedRole =
      requestedRole && allowSelfAssignRoles.includes(requestedRole) ? requestedRole : defaultRole;
    if (assignedRole) {
      await assignRealmRoleToUser(userId, assignedRole);
    }
    const tokens = await exchangePasswordToken(email, password);
    const authContext = await verifyAccessToken(tokens.access_token);
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.user = authContext.user;
    req.session.roles = authContext.roles;
    req.session.orgIds = authContext.orgIds;
    res.status(201).json({
      user: authContext.user,
      roles: authContext.roles,
      orgIds: authContext.orgIds || [],
      assignedRole,
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.use(authenticate);

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

function isOrgAllowed(req: express.Request, orgId: string) {
  const roles = req.auth?.roles || [];
  if (roles.includes("org_admin")) return true;
  const orgIds = req.auth?.orgIds;
  if (!orgIds || orgIds.length === 0) return true;
  return orgIds.includes(orgId);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

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
