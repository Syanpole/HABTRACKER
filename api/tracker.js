import { neon } from "@neondatabase/serverless";

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS habit_tracker_states (
    profile TEXT NOT NULL,
    month TEXT NOT NULL,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (profile, month)
  );
`;

export default async function handler(req, res) {
  try {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ error: "database url is not configured" });
    }

    const sql = neon(connectionString);
    await sql(TABLE_SQL);

    if (req.method === "GET") {
      const profile = normalizeProfile(getParam(req.query.profile));
      const month = normalizeMonth(getParam(req.query.month));

      if (!profile || !month) {
        return res.status(400).json({ error: "profile and month are required" });
      }

      const rows = await sql`
        SELECT profile, month, state, updated_at
        FROM habit_tracker_states
        WHERE profile = ${profile} AND month = ${month}
        LIMIT 1
      `;

      if (!rows.length) {
        return res.status(404).json({ found: false });
      }

      return res.status(200).json({
        found: true,
        tracker: {
          profile: rows[0].profile,
          month: rows[0].month,
          state: rows[0].state,
          updatedAt: rows[0].updated_at,
        },
      });
    }

    if (req.method === "POST") {
      const body = parseBody(req.body);
      const profile = normalizeProfile(body.profile);
      const month = normalizeMonth(body.month);
      const state = body.state;

      if (!profile || !month) {
        return res.status(400).json({ error: "profile and month are required" });
      }

      if (!state || typeof state !== "object" || Array.isArray(state)) {
        return res.status(400).json({ error: "state must be a JSON object" });
      }

      const stateJson = JSON.stringify(state);

      const rows = await sql`
        INSERT INTO habit_tracker_states (profile, month, state)
        VALUES (${profile}, ${month}, ${stateJson}::jsonb)
        ON CONFLICT (profile, month)
        DO UPDATE SET
          state = EXCLUDED.state,
          updated_at = NOW()
        RETURNING profile, month, state, updated_at
      `;

      return res.status(200).json({
        ok: true,
        tracker: {
          profile: rows[0].profile,
          month: rows[0].month,
          state: rows[0].state,
          updatedAt: rows[0].updated_at,
        },
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("tracker api error", error);
    return res.status(500).json({ error: "database request failed" });
  }
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body;
}

function getParam(value) {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

function normalizeProfile(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

  return normalized || "";
}

function normalizeMonth(value) {
  return String(value || "").trim().slice(0, 30);
}
