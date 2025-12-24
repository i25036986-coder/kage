import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: "file:./data/vault.db",
});

export const db = drizzle(client, { schema });

export async function initializeDatabase() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS containers (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      surl TEXT,
      title TEXT NOT NULL,
      thumbnail TEXT,
      type TEXT NOT NULL DEFAULT 'unknown',
      status TEXT NOT NULL DEFAULT 'basic',
      file_count INTEGER,
      is_expanded INTEGER NOT NULL DEFAULT 0,
      auth_expiry INTEGER,
      link_expiry INTEGER,
      genre TEXT,
      tags TEXT,
      rating TEXT NOT NULL DEFAULT 'regular',
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      container_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER,
      duration INTEGER,
      thumbnail TEXT,
      download_url TEXT,
      dlink TEXT,
      fs_id TEXT,
      md5 TEXT,
      link_expiry INTEGER,
      is_selected INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      container_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      parent_id TEXT,
      file_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS public_fetch_queue (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      surl TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at INTEGER,
      created_at INTEGER NOT NULL,
      rating TEXT DEFAULT 'regular',
      genre TEXT,
      tags TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'terabox',
      js_token TEXT NOT NULL,
      cookies TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      captured_at INTEGER NOT NULL,
      expires_at INTEGER,
      last_used_at INTEGER
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS playback_history (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      container_id TEXT NOT NULL,
      position REAL NOT NULL DEFAULT 0,
      duration REAL,
      last_played_at INTEGER NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS download_history (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      container_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      save_path TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      error_message TEXT,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS genres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      save_thumbnails_locally INTEGER NOT NULL DEFAULT 0,
      thumbnail_save_mode TEXT NOT NULL DEFAULT 'only_if_fails',
      vault_enabled INTEGER NOT NULL DEFAULT 1,
      vault_unlock_duration INTEGER NOT NULL DEFAULT 30,
      panic_mode_enabled INTEGER NOT NULL DEFAULT 1,
      background_mode TEXT NOT NULL DEFAULT 'default',
      background_color TEXT NOT NULL DEFAULT '#1a1a2e',
      background_image TEXT,
      background_video TEXT,
      background_opacity INTEGER NOT NULL DEFAULT 100,
      main_panel_background TEXT,
      sidebar_background TEXT,
      details_panel_background TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS duplicate_records (
      id TEXT PRIMARY KEY,
      source_container_id TEXT NOT NULL,
      match_container_id TEXT NOT NULL,
      rule TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      FOREIGN KEY (source_container_id) REFERENCES containers(id) ON DELETE CASCADE,
      FOREIGN KEY (match_container_id) REFERENCES containers(id) ON DELETE CASCADE
    )
  `);

  const existingSettings = await client.execute("SELECT id FROM settings WHERE id = 'default'");
  if (existingSettings.rows.length === 0) {
    await client.execute("INSERT INTO settings (id) VALUES ('default')");
  }

  // Seed some default genres and tags if empty
  const existingGenres = await client.execute("SELECT id FROM genres LIMIT 1");
  if (existingGenres.rows.length === 0) {
    const genres = [
      { id: "g1", name: "nature", color: "#22c55e" },
      { id: "g2", name: "sci-fi", color: "#3b82f6" },
      { id: "g3", name: "architecture", color: "#a855f7" },
    ];
    for (const g of genres) {
      await client.execute({
        sql: "INSERT INTO genres (id, name, color) VALUES (?, ?, ?)",
        args: [g.id, g.name, g.color],
      });
    }
  }

  const existingTags = await client.execute("SELECT id FROM tags LIMIT 1");
  if (existingTags.rows.length === 0) {
    const tags = [
      { id: "t1", name: "documentary", color: "#3b82f6" },
      { id: "t2", name: "wildlife", color: "#22c55e" },
      { id: "t3", name: "series", color: "#a855f7" },
      { id: "t4", name: "space", color: "#06b6d4" },
      { id: "t5", name: "tutorial", color: "#f59e0b" },
    ];
    for (const t of tags) {
      await client.execute({
        sql: "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
        args: [t.id, t.name, t.color],
      });
    }
  }

  console.log("Database initialized successfully");
}

export { schema };
