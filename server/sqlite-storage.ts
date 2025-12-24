import { randomUUID } from "crypto";
import { db, initializeDatabase } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import type { 
  VirtualContainer, 
  InsertContainer, 
  MediaFile, 
  InsertFile, 
  Folder,
  AppSettings,
  Tag,
  Genre,
  ContentRating,
  BulkUploadResult,
  PanelBackground,
  DuplicateRecord,
  DuplicateRule,
  DuplicateStatus
} from "@shared/schema";
import { extractSurl, type TeraboxAuthData } from "./services/terabox";

export interface PublicFetchQueueItem {
  id: string;
  url: string;
  surl: string | null;
  status: "pending" | "fetching" | "success" | "failed";
  attemptCount: number;
  lastError: string | null;
  lastAttemptAt: Date | null;
  createdAt: Date;
  rating: ContentRating;
  genre: string | null;
  tags: string[];
}

export interface AuthToken {
  id: string;
  provider: string;
  jsToken: string;
  cookies: string;
  status: "active" | "expired" | "invalid";
  capturedAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

export interface IStorage {
  getContainers(): Promise<VirtualContainer[]>;
  getContainersByRating(rating: ContentRating): Promise<VirtualContainer[]>;
  getContainer(id: string): Promise<VirtualContainer | undefined>;
  getContainersByGenre(genre: string): Promise<VirtualContainer[]>;
  createContainer(container: InsertContainer): Promise<VirtualContainer>;
  createContainersBulk(containers: InsertContainer[]): Promise<BulkUploadResult>;
  updateContainer(id: string, updates: Partial<VirtualContainer>): Promise<VirtualContainer | undefined>;
  deleteContainer(id: string): Promise<boolean>;

  getFiles(containerId: string): Promise<MediaFile[]>;
  getFile(id: string): Promise<MediaFile | undefined>;
  createFile(file: InsertFile): Promise<MediaFile>;
  createFilesBulk(files: InsertFile[]): Promise<MediaFile[]>;
  updateFile(id: string, updates: Partial<MediaFile>): Promise<MediaFile | undefined>;
  deleteFile(id: string): Promise<boolean>;
  deleteFilesByContainer(containerId: string): Promise<boolean>;

  getFolders(containerId: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;

  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  getTags(): Promise<Tag[]>;
  createTag(name: string, color: string): Promise<Tag>;
  deleteTag(id: string): Promise<boolean>;

  getGenres(): Promise<Genre[]>;
  createGenre(name: string, color: string): Promise<Genre>;
  deleteGenre(id: string): Promise<boolean>;

  getPublicFetchQueue(): Promise<PublicFetchQueueItem[]>;
  addToPublicFetchQueue(urls: string[], options?: { rating?: ContentRating; genre?: string | null; tags?: string[] }): Promise<PublicFetchQueueItem[]>;
  updateQueueItem(id: string, updates: Partial<PublicFetchQueueItem>): Promise<PublicFetchQueueItem | undefined>;
  removeFromQueue(id: string): Promise<boolean>;
  getQueueItem(id: string): Promise<PublicFetchQueueItem | undefined>;

  getActiveAuthToken(): Promise<AuthToken | undefined>;
  saveAuthToken(authData: TeraboxAuthData): Promise<AuthToken>;
  invalidateAuthTokens(): Promise<void>;

  getDuplicates(): Promise<DuplicateRecord[]>;
  detectDuplicates(): Promise<DuplicateRecord[]>;
  updateDuplicateStatus(id: string, status: DuplicateStatus): Promise<DuplicateRecord | undefined>;
  deleteDuplicate(id: string): Promise<boolean>;
}

export class SQLiteStorage implements IStorage {
  async initialize() {
    await initializeDatabase();
  }

  private rowToContainer(row: any): VirtualContainer {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      thumbnail: row.thumbnail,
      type: row.type as VirtualContainer["type"],
      status: row.status as VirtualContainer["status"],
      fileCount: row.fileCount ?? row.file_count,
      isExpanded: Boolean(row.isExpanded ?? row.is_expanded),
      authExpiry: row.authExpiry ?? row.auth_expiry ? new Date(row.authExpiry ?? row.auth_expiry) : null,
      linkExpiry: row.linkExpiry ?? row.link_expiry ? new Date(row.linkExpiry ?? row.link_expiry) : null,
      genre: row.genre,
      tags: row.tags ? JSON.parse(row.tags) : [],
      rating: (row.rating || "regular") as ContentRating,
      createdAt: new Date(row.createdAt ?? row.created_at),
    };
  }

  private rowToFile(row: any): MediaFile {
    return {
      id: row.id,
      containerId: row.containerId ?? row.container_id,
      name: row.name,
      path: row.path,
      type: row.type as MediaFile["type"],
      size: row.size,
      duration: row.duration,
      thumbnail: row.thumbnail,
      downloadUrl: row.downloadUrl ?? row.download_url ?? row.dlink,
      dlink: row.dlink ?? row.downloadUrl ?? row.download_url,
      fsId: row.fsId ?? row.fs_id,
      md5: row.md5,
      linkExpiry: row.linkExpiry ?? row.link_expiry ? new Date(row.linkExpiry ?? row.link_expiry) : null,
      isSelected: Boolean(row.isSelected ?? row.is_selected),
    };
  }

  async getContainers(): Promise<VirtualContainer[]> {
    const rows = await db.select().from(schema.containers);
    return rows.map(r => this.rowToContainer(r));
  }

  async getContainersByRating(rating: ContentRating): Promise<VirtualContainer[]> {
    const rows = await db.select().from(schema.containers).where(eq(schema.containers.rating, rating));
    return rows.map(r => this.rowToContainer(r));
  }

  async getContainer(id: string): Promise<VirtualContainer | undefined> {
    const rows = await db.select().from(schema.containers).where(eq(schema.containers.id, id));
    return rows[0] ? this.rowToContainer(rows[0]) : undefined;
  }

  async getContainersByGenre(genre: string): Promise<VirtualContainer[]> {
    const rows = await db.select().from(schema.containers).where(eq(schema.containers.genre, genre));
    return rows.map(r => this.rowToContainer(r));
  }

  async createContainer(insertContainer: InsertContainer): Promise<VirtualContainer> {
    const id = randomUUID();
    const now = new Date();
    const surl = extractSurl(insertContainer.url);

    await db.insert(schema.containers).values({
      id,
      url: insertContainer.url,
      surl,
      title: insertContainer.title || this.extractTitleFromUrl(insertContainer.url),
      thumbnail: insertContainer.thumbnail || null,
      type: insertContainer.type || "unknown",
      status: "basic",
      fileCount: null,
      isExpanded: false,
      authExpiry: null,
      linkExpiry: null,
      genre: insertContainer.genre || null,
      tags: JSON.stringify(insertContainer.tags || []),
      rating: insertContainer.rating || "regular",
      createdAt: now,
    });

    return this.getContainer(id) as Promise<VirtualContainer>;
  }

  async createContainersBulk(insertContainers: InsertContainer[]): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      success: 0,
      failed: 0,
      containers: [],
      errors: [],
    };

    for (const insertContainer of insertContainers) {
      try {
        const url = insertContainer.url.trim();
        if (!url) {
          result.failed++;
          result.errors.push({ url: insertContainer.url, error: "Empty URL" });
          continue;
        }

        try {
          new URL(url);
        } catch {
          result.failed++;
          result.errors.push({ url, error: "Invalid URL format" });
          continue;
        }

        const container = await this.createContainer({ ...insertContainer, url });
        result.success++;
        result.containers.push(container);
      } catch (error) {
        result.failed++;
        result.errors.push({ 
          url: insertContainer.url, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return result;
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      return pathParts[pathParts.length - 1] || urlObj.hostname;
    } catch {
      return url;
    }
  }

  async updateContainer(id: string, updates: Partial<VirtualContainer>): Promise<VirtualContainer | undefined> {
    const existing = await this.getContainer(id);
    if (!existing) return undefined;

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.fileCount !== undefined) updateData.fileCount = updates.fileCount;
    if (updates.isExpanded !== undefined) updateData.isExpanded = updates.isExpanded;
    if (updates.authExpiry !== undefined) updateData.authExpiry = updates.authExpiry;
    if (updates.linkExpiry !== undefined) updateData.linkExpiry = updates.linkExpiry;
    if (updates.genre !== undefined) updateData.genre = updates.genre;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.rating !== undefined) updateData.rating = updates.rating;

    await db.update(schema.containers).set(updateData).where(eq(schema.containers.id, id));
    return this.getContainer(id);
  }

  async deleteContainer(id: string): Promise<boolean> {
    const result = await db.delete(schema.containers).where(eq(schema.containers.id, id));
    return true;
  }

  async getFiles(containerId: string): Promise<MediaFile[]> {
    const rows = await db.select().from(schema.files).where(eq(schema.files.containerId, containerId));
    return rows.map(r => this.rowToFile(r));
  }

  async getFile(id: string): Promise<MediaFile | undefined> {
    const rows = await db.select().from(schema.files).where(eq(schema.files.id, id));
    return rows[0] ? this.rowToFile(rows[0]) : undefined;
  }

  async createFile(insertFile: InsertFile): Promise<MediaFile> {
    const id = randomUUID();
    await db.insert(schema.files).values({
      id,
      containerId: insertFile.containerId,
      name: insertFile.name,
      path: insertFile.path,
      type: insertFile.type,
      size: insertFile.size || null,
      duration: insertFile.duration || null,
      thumbnail: insertFile.thumbnail || null,
      downloadUrl: null,
      dlink: null,
      fsId: null,
      md5: null,
      linkExpiry: null,
      isSelected: false,
    });
    return this.getFile(id) as Promise<MediaFile>;
  }

  async createFilesBulk(insertFiles: InsertFile[]): Promise<MediaFile[]> {
    const files: MediaFile[] = [];
    for (const insertFile of insertFiles) {
      const file = await this.createFile(insertFile);
      files.push(file);
    }
    return files;
  }

  async updateFile(id: string, updates: Partial<MediaFile>): Promise<MediaFile | undefined> {
    const existing = await this.getFile(id);
    if (!existing) return undefined;

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.path !== undefined) updateData.path = updates.path;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
    if (updates.downloadUrl !== undefined) updateData.downloadUrl = updates.downloadUrl;
    if (updates.linkExpiry !== undefined) updateData.linkExpiry = updates.linkExpiry;
    if (updates.isSelected !== undefined) updateData.isSelected = updates.isSelected;

    await db.update(schema.files).set(updateData).where(eq(schema.files.id, id));
    return this.getFile(id);
  }

  async deleteFile(id: string): Promise<boolean> {
    await db.delete(schema.files).where(eq(schema.files.id, id));
    return true;
  }

  async deleteFilesByContainer(containerId: string): Promise<boolean> {
    await db.delete(schema.files).where(eq(schema.files.containerId, containerId));
    return true;
  }

  async getFolders(containerId: string): Promise<Folder[]> {
    const rows = await db.select().from(schema.folders).where(eq(schema.folders.containerId, containerId));
    return rows.map(r => ({
      id: r.id,
      containerId: r.containerId,
      name: r.name,
      path: r.path,
      parentId: r.parentId,
      fileCount: r.fileCount,
    }));
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const rows = await db.select().from(schema.folders).where(eq(schema.folders.id, id));
    if (!rows[0]) return undefined;
    return {
      id: rows[0].id,
      containerId: rows[0].containerId,
      name: rows[0].name,
      path: rows[0].path,
      parentId: rows[0].parentId,
      fileCount: rows[0].fileCount,
    };
  }

  async getSettings(): Promise<AppSettings> {
    const defaultPanelBg: PanelBackground = {
      mode: "default",
      color: "#1a1a2e",
      image: null,
      video: null,
      opacity: 100,
    };
    
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.id, "default"));
    if (!rows[0]) {
      return {
        saveThumbnailsLocally: false,
        thumbnailSaveMode: "only_if_fails",
        vaultEnabled: true,
        vaultUnlockDuration: 30,
        panicModeEnabled: true,
        backgroundMode: "default",
        backgroundColor: "#1a1a2e",
        backgroundImage: null,
        backgroundVideo: null,
        backgroundOpacity: 100,
        mainPanelBackground: defaultPanelBg,
        sidebarBackground: defaultPanelBg,
        detailsPanelBackground: defaultPanelBg,
      };
    }
    
    const parsePanelBg = (json: string | null): PanelBackground => {
      if (!json) return defaultPanelBg;
      try {
        return JSON.parse(json);
      } catch {
        return defaultPanelBg;
      }
    };
    
    return {
      saveThumbnailsLocally: rows[0].saveThumbnailsLocally,
      thumbnailSaveMode: rows[0].thumbnailSaveMode as AppSettings["thumbnailSaveMode"],
      vaultEnabled: rows[0].vaultEnabled,
      vaultUnlockDuration: rows[0].vaultUnlockDuration,
      panicModeEnabled: rows[0].panicModeEnabled,
      backgroundMode: rows[0].backgroundMode as AppSettings["backgroundMode"],
      backgroundColor: rows[0].backgroundColor,
      backgroundImage: rows[0].backgroundImage,
      backgroundVideo: rows[0].backgroundVideo,
      backgroundOpacity: rows[0].backgroundOpacity,
      mainPanelBackground: parsePanelBg(rows[0].mainPanelBackground),
      sidebarBackground: parsePanelBg(rows[0].sidebarBackground),
      detailsPanelBackground: parsePanelBg(rows[0].detailsPanelBackground),
    };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const dbUpdates: Record<string, any> = { ...updates };
    if (updates.mainPanelBackground) {
      dbUpdates.mainPanelBackground = JSON.stringify(updates.mainPanelBackground);
    }
    if (updates.sidebarBackground) {
      dbUpdates.sidebarBackground = JSON.stringify(updates.sidebarBackground);
    }
    if (updates.detailsPanelBackground) {
      dbUpdates.detailsPanelBackground = JSON.stringify(updates.detailsPanelBackground);
    }
    await db.update(schema.settings).set(dbUpdates).where(eq(schema.settings.id, "default"));
    return this.getSettings();
  }

  async getTags(): Promise<Tag[]> {
    const rows = await db.select().from(schema.tags);
    const containers = await this.getContainers();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      count: containers.filter(c => c.tags && c.tags.includes(r.name)).length,
    }));
  }

  async createTag(name: string, color: string): Promise<Tag> {
    const id = randomUUID();
    await db.insert(schema.tags).values({ id, name, color });
    return { id, name, color, count: 0 };
  }

  async deleteTag(id: string): Promise<boolean> {
    await db.delete(schema.tags).where(eq(schema.tags.id, id));
    return true;
  }

  async getGenres(): Promise<Genre[]> {
    const rows = await db.select().from(schema.genres);
    const containers = await this.getContainers();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      count: containers.filter(c => c.genre === r.name).length,
    }));
  }

  async createGenre(name: string, color: string): Promise<Genre> {
    const id = randomUUID();
    await db.insert(schema.genres).values({ id, name: name.toLowerCase(), color });
    return { id, name: name.toLowerCase(), color, count: 0 };
  }

  async deleteGenre(id: string): Promise<boolean> {
    await db.delete(schema.genres).where(eq(schema.genres.id, id));
    return true;
  }

  async getPublicFetchQueue(): Promise<PublicFetchQueueItem[]> {
    const rows = await db.select().from(schema.publicFetchQueue);
    return rows.map(r => ({
      id: r.id,
      url: r.url,
      surl: r.surl,
      status: r.status as PublicFetchQueueItem["status"],
      attemptCount: r.attemptCount,
      lastError: r.lastError,
      lastAttemptAt: r.lastAttemptAt,
      createdAt: r.createdAt,
      rating: (r.rating || "regular") as ContentRating,
      genre: r.genre,
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));
  }

  async addToPublicFetchQueue(urls: string[], options?: { rating?: ContentRating; genre?: string | null; tags?: string[] }): Promise<PublicFetchQueueItem[]> {
    const items: PublicFetchQueueItem[] = [];
    const now = new Date();

    for (const url of urls) {
      const id = randomUUID();
      const surl = extractSurl(url);
      
      await db.insert(schema.publicFetchQueue).values({
        id,
        url,
        surl,
        status: "pending",
        attemptCount: 0,
        lastError: null,
        lastAttemptAt: null,
        createdAt: now,
        rating: options?.rating || "regular",
        genre: options?.genre || null,
        tags: JSON.stringify(options?.tags || []),
      });

      items.push({
        id,
        url,
        surl,
        status: "pending",
        attemptCount: 0,
        lastError: null,
        lastAttemptAt: null,
        createdAt: now,
        rating: options?.rating || "regular",
        genre: options?.genre || null,
        tags: options?.tags || [],
      });
    }

    return items;
  }

  async updateQueueItem(id: string, updates: Partial<PublicFetchQueueItem>): Promise<PublicFetchQueueItem | undefined> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.attemptCount !== undefined) updateData.attemptCount = updates.attemptCount;
    if (updates.lastError !== undefined) updateData.lastError = updates.lastError;
    if (updates.lastAttemptAt !== undefined) updateData.lastAttemptAt = updates.lastAttemptAt;
    if (updates.surl !== undefined) updateData.surl = updates.surl;

    await db.update(schema.publicFetchQueue).set(updateData).where(eq(schema.publicFetchQueue.id, id));
    return this.getQueueItem(id);
  }

  async removeFromQueue(id: string): Promise<boolean> {
    await db.delete(schema.publicFetchQueue).where(eq(schema.publicFetchQueue.id, id));
    return true;
  }

  async getQueueItem(id: string): Promise<PublicFetchQueueItem | undefined> {
    const rows = await db.select().from(schema.publicFetchQueue).where(eq(schema.publicFetchQueue.id, id));
    if (!rows[0]) return undefined;
    return {
      id: rows[0].id,
      url: rows[0].url,
      surl: rows[0].surl,
      status: rows[0].status as PublicFetchQueueItem["status"],
      attemptCount: rows[0].attemptCount,
      lastError: rows[0].lastError,
      lastAttemptAt: rows[0].lastAttemptAt,
      createdAt: rows[0].createdAt,
      rating: (rows[0].rating || "regular") as ContentRating,
      genre: rows[0].genre,
      tags: rows[0].tags ? JSON.parse(rows[0].tags) : [],
    };
  }

  async getActiveAuthToken(): Promise<AuthToken | undefined> {
    const rows = await db.select().from(schema.authTokens).where(eq(schema.authTokens.status, "active"));
    if (!rows[0]) return undefined;
    return {
      id: rows[0].id,
      provider: rows[0].provider,
      jsToken: rows[0].jsToken,
      cookies: rows[0].cookies,
      status: rows[0].status as AuthToken["status"],
      capturedAt: rows[0].capturedAt,
      expiresAt: rows[0].expiresAt,
      lastUsedAt: rows[0].lastUsedAt,
    };
  }

  async saveAuthToken(authData: TeraboxAuthData): Promise<AuthToken> {
    await this.invalidateAuthTokens();
    
    const id = randomUUID();
    const now = new Date();
    
    await db.insert(schema.authTokens).values({
      id,
      provider: authData.provider,
      jsToken: authData.jsToken,
      cookies: JSON.stringify(authData.cookies),
      status: "active",
      capturedAt: authData.capturedAt,
      expiresAt: null,
      lastUsedAt: now,
    });

    return {
      id,
      provider: authData.provider,
      jsToken: authData.jsToken,
      cookies: JSON.stringify(authData.cookies),
      status: "active",
      capturedAt: authData.capturedAt,
      expiresAt: null,
      lastUsedAt: now,
    };
  }

  async invalidateAuthTokens(): Promise<void> {
    await db.update(schema.authTokens).set({ status: "expired" }).where(eq(schema.authTokens.status, "active"));
  }

  async getDuplicates(): Promise<DuplicateRecord[]> {
    const rows = await db.select().from(schema.duplicateRecords);
    const containers = await this.getContainers();
    const containerMap = new Map(containers.map(c => [c.id, c]));
    
    return rows.map(r => ({
      id: r.id,
      sourceContainerId: r.sourceContainerId,
      matchContainerId: r.matchContainerId,
      rule: r.rule as DuplicateRule,
      status: r.status as DuplicateStatus,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      sourceContainer: containerMap.get(r.sourceContainerId),
      matchContainer: containerMap.get(r.matchContainerId),
    }));
  }

  async detectDuplicates(): Promise<DuplicateRecord[]> {
    const containers = await this.getContainers();
    const existingDuplicates = await this.getDuplicates();
    const existingPairs = new Set<string>();
    for (const d of existingDuplicates) {
      existingPairs.add(`${d.sourceContainerId}-${d.matchContainerId}`);
      existingPairs.add(`${d.matchContainerId}-${d.sourceContainerId}`);
    }
    
    const newDuplicates: DuplicateRecord[] = [];
    const now = new Date();

    for (let i = 0; i < containers.length; i++) {
      for (let j = i + 1; j < containers.length; j++) {
        const a = containers[i];
        const b = containers[j];
        
        const pairKey1 = `${a.id}-${b.id}`;
        const pairKey2 = `${b.id}-${a.id}`;
        if (existingPairs.has(pairKey1) || existingPairs.has(pairKey2)) continue;

        let rule: DuplicateRule | null = null;

        if (a.url === b.url) {
          rule = "exact_url";
        } else if (a.title === b.title && a.fileCount === b.fileCount && a.type === b.type) {
          rule = "name_metadata";
        } else if (a.fileCount === b.fileCount && a.type === b.type && a.fileCount && a.fileCount > 0) {
          rule = "metadata_only";
        }

        if (rule) {
          const id = randomUUID();
          await db.insert(schema.duplicateRecords).values({
            id,
            sourceContainerId: a.id,
            matchContainerId: b.id,
            rule,
            status: "pending",
            createdAt: now,
          });
          
          newDuplicates.push({
            id,
            sourceContainerId: a.id,
            matchContainerId: b.id,
            rule,
            status: "pending",
            createdAt: now,
            resolvedAt: null,
            sourceContainer: a,
            matchContainer: b,
          });
          
          existingPairs.add(pairKey1);
        }
      }
    }

    return newDuplicates;
  }

  async updateDuplicateStatus(id: string, status: DuplicateStatus): Promise<DuplicateRecord | undefined> {
    const now = new Date();
    await db.update(schema.duplicateRecords)
      .set({ status, resolvedAt: status !== "pending" ? now : null })
      .where(eq(schema.duplicateRecords.id, id));
    
    const duplicates = await this.getDuplicates();
    return duplicates.find(d => d.id === id);
  }

  async deleteDuplicate(id: string): Promise<boolean> {
    await db.delete(schema.duplicateRecords).where(eq(schema.duplicateRecords.id, id));
    return true;
  }
}

export const storage = new SQLiteStorage();
