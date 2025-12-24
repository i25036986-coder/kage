import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const containers = sqliteTable("containers", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  surl: text("surl"),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  type: text("type").notNull().default("unknown"),
  status: text("status").notNull().default("basic"),
  fileCount: integer("file_count"),
  isExpanded: integer("is_expanded", { mode: "boolean" }).notNull().default(false),
  authExpiry: integer("auth_expiry", { mode: "timestamp" }),
  linkExpiry: integer("link_expiry", { mode: "timestamp" }),
  genre: text("genre"),
  tags: text("tags"),
  rating: text("rating").notNull().default("regular"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  containerId: text("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: integer("size"),
  duration: integer("duration"),
  thumbnail: text("thumbnail"),
  downloadUrl: text("download_url"),
  dlink: text("dlink"),
  fsId: text("fs_id"),
  md5: text("md5"),
  linkExpiry: integer("link_expiry", { mode: "timestamp" }),
  isSelected: integer("is_selected", { mode: "boolean" }).notNull().default(false),
});

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  containerId: text("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  parentId: text("parent_id"),
  fileCount: integer("file_count").notNull().default(0),
});

export const publicFetchQueue = sqliteTable("public_fetch_queue", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  surl: text("surl"),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastError: text("last_error"),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  rating: text("rating").default("regular"),
  genre: text("genre"),
  tags: text("tags"),
});

export const authTokens = sqliteTable("auth_tokens", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().default("terabox"),
  jsToken: text("js_token").notNull(),
  cookies: text("cookies").notNull(),
  status: text("status").notNull().default("active"),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export const playbackHistory = sqliteTable("playback_history", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  containerId: text("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  position: real("position").notNull().default(0),
  duration: real("duration"),
  lastPlayedAt: integer("last_played_at", { mode: "timestamp" }).notNull(),
});

export const downloadHistory = sqliteTable("download_history", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  containerId: text("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  savePath: text("save_path"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const genres = sqliteTable("genres", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("default"),
  saveThumbnailsLocally: integer("save_thumbnails_locally", { mode: "boolean" }).notNull().default(false),
  thumbnailSaveMode: text("thumbnail_save_mode").notNull().default("only_if_fails"),
  vaultEnabled: integer("vault_enabled", { mode: "boolean" }).notNull().default(true),
  vaultUnlockDuration: integer("vault_unlock_duration").notNull().default(30),
  panicModeEnabled: integer("panic_mode_enabled", { mode: "boolean" }).notNull().default(true),
  backgroundMode: text("background_mode").notNull().default("default"),
  backgroundColor: text("background_color").notNull().default("#1a1a2e"),
  backgroundImage: text("background_image"),
  backgroundVideo: text("background_video"),
  backgroundOpacity: integer("background_opacity").notNull().default(100),
  mainPanelBackground: text("main_panel_background"),
  sidebarBackground: text("sidebar_background"),
  detailsPanelBackground: text("details_panel_background"),
});

export const duplicateRecords = sqliteTable("duplicate_records", {
  id: text("id").primaryKey(),
  sourceContainerId: text("source_container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  matchContainerId: text("match_container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  rule: text("rule").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});
