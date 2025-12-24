import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Container status types
export type ContainerStatus = "basic" | "authenticated" | "expanded" | "expired";
export type ContainerType = "single" | "multiple" | "folder" | "unknown";
export type FileType = "image" | "video" | "audio" | "document" | "other";
export type ContentRating = "regular" | "adult";

// Virtual Container - represents a submitted URL
export interface VirtualContainer {
  id: string;
  url: string;
  title: string;
  thumbnail: string | null;
  type: ContainerType;
  status: ContainerStatus;
  fileCount: number | null;
  isExpanded: boolean;
  authExpiry: Date | null;
  linkExpiry: Date | null;
  genre: string | null;
  tags: string[];
  rating: ContentRating;
  createdAt: Date;
}

export interface InsertContainer {
  url: string;
  title?: string;
  thumbnail?: string | null;
  type?: ContainerType;
  genre?: string | null;
  tags?: string[];
  rating?: ContentRating;
}

// Bulk upload result
export interface BulkUploadResult {
  success: number;
  failed: number;
  containers: VirtualContainer[];
  errors: { url: string; error: string }[];
}

// File inside a container
export interface MediaFile {
  id: string;
  containerId: string;
  name: string;
  path: string;
  type: FileType;
  size: number | null;
  duration: number | null;
  thumbnail: string | null;
  downloadUrl: string | null;
  dlink: string | null;
  fsId: string | null;
  md5: string | null;
  linkExpiry: Date | null;
  isSelected: boolean;
}

export interface InsertFile {
  containerId: string;
  name: string;
  path: string;
  type: FileType;
  size?: number | null;
  duration?: number | null;
  thumbnail?: string | null;
}

// Folder structure for navigation
export interface Folder {
  id: string;
  containerId: string;
  name: string;
  path: string;
  parentId: string | null;
  fileCount: number;
}

// Thumbnail candidate
export interface ThumbnailCandidate {
  id: string;
  url: string;
  status: "working" | "failed" | "unknown";
  isActive: boolean;
  isLocal: boolean;
}

// Background mode types
export type BackgroundMode = "default" | "color" | "image" | "video";

// Panel background settings
export interface PanelBackground {
  mode: BackgroundMode;
  color: string;
  image: string | null;
  video: string | null;
  opacity: number;
}

// App settings
export interface AppSettings {
  saveThumbnailsLocally: boolean;
  thumbnailSaveMode: "only_if_fails" | "always_prefer_local";
  vaultEnabled: boolean;
  vaultUnlockDuration: number; // in minutes
  panicModeEnabled: boolean;
  // Global background customization
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundVideo: string | null;
  backgroundOpacity: number;
  // Panel-specific backgrounds
  mainPanelBackground: PanelBackground;
  sidebarBackground: PanelBackground;
  detailsPanelBackground: PanelBackground;
}

// Vault state
export interface VaultState {
  isLocked: boolean;
  unlockedAt: Date | null;
  unlockDuration: number;
}

// Tag for metadata management
export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

// Genre for metadata management
export interface Genre {
  id: string;
  name: string;
  color: string;
  count: number;
}

// Navigation items for sidebar
export interface NavItem {
  title: string;
  icon: string;
  href: string;
  isActive?: boolean;
  badge?: number;
}

export interface GenreItem {
  title: string;
  icon: string;
  href: string;
}

// Public fetch queue item status
export type QueueItemStatus = "pending" | "fetching" | "success" | "failed";

// Public fetch queue item
export interface PublicFetchQueueItem {
  id: string;
  url: string;
  surl?: string | null;
  status: QueueItemStatus;
  attemptCount: number;
  lastError?: string | null;
  lastAttemptAt?: Date | null;
  createdAt: Date;
  rating: ContentRating;
  genre?: string | null;
  tags?: string[];
}

// Auth token for Terabox
export interface AuthToken {
  id: string;
  provider: string;
  jsToken: string;
  cookies: string;
  status: "active" | "expired" | "invalid";
  capturedAt: Date;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
}

// Duplicate detection types
export type DuplicateRule = "exact_url" | "name_metadata" | "metadata_only";
export type DuplicateStatus = "pending" | "ignored" | "deleted";

export interface DuplicateRecord {
  id: string;
  sourceContainerId: string;
  matchContainerId: string;
  rule: DuplicateRule;
  status: DuplicateStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  sourceContainer?: VirtualContainer;
  matchContainer?: VirtualContainer;
}
