import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable } from "stream";
import { storage } from "./sqlite-storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  fetchPublicMetadata, 
  fetchAuthenticatedMetadata, 
  startAuthSession,
  getAuthSessionStatus,
  closeAuthSession,
  extractSurl,
  type TeraboxAuthData
} from "./services/terabox";

const backgroundsDir = path.join(process.cwd(), "data", "backgrounds");
const localMediaDir = path.join(process.cwd(), "data", "local-media");

if (!fs.existsSync(backgroundsDir)) {
  fs.mkdirSync(backgroundsDir, { recursive: true });
}
if (!fs.existsSync(localMediaDir)) {
  fs.mkdirSync(localMediaDir, { recursive: true });
}

const backgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backgroundsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `bg-${uniqueSuffix}${ext}`);
  },
});

const backgroundUpload = multer({
  storage: backgroundStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/ogg"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

const insertContainerSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  thumbnail: z.string().url().nullable().optional(),
  type: z.enum(["single", "multiple", "folder", "unknown"]).optional(),
  genre: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  rating: z.enum(["regular", "adult"]).optional(),
});

const updateContainerSchema = z.object({
  title: z.string().optional(),
  thumbnail: z.string().url().nullable().optional(),
  status: z.enum(["basic", "authenticated", "expanded", "expired"]).optional(),
  isExpanded: z.boolean().optional(),
  genre: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  rating: z.enum(["regular", "adult"]).optional(),
});

const panelBackgroundSchema = z.object({
  mode: z.enum(["default", "color", "image", "video"]),
  color: z.string(),
  image: z.string().nullable(),
  video: z.string().nullable(),
  opacity: z.number().min(0).max(100),
});

const updateSettingsSchema = z.object({
  saveThumbnailsLocally: z.boolean().optional(),
  thumbnailSaveMode: z.enum(["only_if_fails", "always_prefer_local"]).optional(),
  vaultEnabled: z.boolean().optional(),
  vaultUnlockDuration: z.number().optional(),
  panicModeEnabled: z.boolean().optional(),
  backgroundMode: z.enum(["default", "color", "image", "video"]).optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().nullable().optional(),
  backgroundVideo: z.string().nullable().optional(),
  backgroundOpacity: z.number().min(0).max(100).optional(),
  mainPanelBackground: panelBackgroundSchema.optional(),
  sidebarBackground: panelBackgroundSchema.optional(),
  detailsPanelBackground: panelBackgroundSchema.optional(),
});

const bulkUploadSchema = z.object({
  urls: z.array(z.string()),
  rating: z.enum(["regular", "adult"]).optional(),
  genre: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const createGenreSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const queueUrlsSchema = z.object({
  urls: z.array(z.string()),
  rating: z.enum(["regular", "adult"]).optional(),
  genre: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Containers
  app.get("/api/containers", async (req, res) => {
    try {
      const rating = req.query.rating as string | undefined;
      if (rating === "regular" || rating === "adult") {
        const containers = await storage.getContainersByRating(rating);
        return res.json(containers);
      }
      const containers = await storage.getContainers();
      res.json(containers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch containers" });
    }
  });

  app.get("/api/containers/:id", async (req, res) => {
    try {
      const container = await storage.getContainer(req.params.id);
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }
      res.json(container);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch container" });
    }
  });

  app.get("/api/containers/genre/:genre", async (req, res) => {
    try {
      const containers = await storage.getContainersByGenre(req.params.genre);
      res.json(containers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch containers by genre" });
    }
  });

  // Direct container creation is disabled - use queue system instead
  // POST /api/containers redirects to queue workflow
  app.post("/api/containers", async (req, res) => {
    try {
      const { url, genre, tags, rating } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Add to queue instead of creating directly
      const queueItems = await storage.addToPublicFetchQueue([url], {
        rating,
        genre,
        tags,
      });
      
      res.status(201).json({ 
        message: "URL added to public fetch queue",
        queueItems,
        note: "Use /api/queue/:id/public-fetch to fetch metadata and create container"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add to queue" });
    }
  });

  // Bulk upload redirects to queue
  app.post("/api/containers/bulk", async (req, res) => {
    try {
      const parsed = bulkUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid bulk upload data", details: parsed.error.errors });
      }

      const { urls, rating, genre, tags } = parsed.data;
      
      // Add all to queue instead of creating directly
      const queueItems = await storage.addToPublicFetchQueue(urls, {
        rating,
        genre,
        tags,
      });

      res.status(201).json({
        message: `${queueItems.length} URLs added to public fetch queue`,
        queueItems,
        note: "Use /api/queue/:id/public-fetch to fetch metadata and create containers"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add to queue" });
    }
  });

  app.patch("/api/containers/:id", async (req, res) => {
    try {
      const parsed = updateContainerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid update data", details: parsed.error.errors });
      }
      const container = await storage.updateContainer(req.params.id, parsed.data);
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }
      res.json(container);
    } catch (error) {
      res.status(500).json({ error: "Failed to update container" });
    }
  });

  app.delete("/api/containers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContainer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Container not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete container" });
    }
  });

  // Container unlock (authenticate)
  app.post("/api/containers/:id/unlock", async (req, res) => {
    try {
      const container = await storage.updateContainer(req.params.id, {
        status: "authenticated",
        authExpiry: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }
      res.json(container);
    } catch (error) {
      res.status(500).json({ error: "Failed to unlock container" });
    }
  });

  // Container expand
  app.post("/api/containers/:id/expand", async (req, res) => {
    try {
      const container = await storage.updateContainer(req.params.id, {
        status: "expanded",
        isExpanded: true,
      });
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }
      res.json(container);
    } catch (error) {
      res.status(500).json({ error: "Failed to expand container" });
    }
  });

  // ============ PUBLIC FETCH QUEUE ============

  // Get queue status
  app.get("/api/queue", async (req, res) => {
    try {
      const queue = await storage.getPublicFetchQueue();
      res.json(queue);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queue" });
    }
  });

  // Add URLs to queue
  app.post("/api/queue", async (req, res) => {
    try {
      const parsed = queueUrlsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid queue data", details: parsed.error.errors });
      }
      
      const items = await storage.addToPublicFetchQueue(parsed.data.urls, {
        rating: parsed.data.rating,
        genre: parsed.data.genre,
        tags: parsed.data.tags,
      });
      
      res.status(201).json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to add to queue" });
    }
  });

  // Remove from queue
  app.delete("/api/queue/:id", async (req, res) => {
    try {
      await storage.removeFromQueue(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from queue" });
    }
  });

  // ============ PUBLIC FETCH ============
  
  // Public fetch for a queue item
  app.post("/api/queue/:id/public-fetch", async (req, res) => {
    try {
      const queueItem = await storage.getQueueItem(req.params.id);
      if (!queueItem) {
        return res.status(404).json({ error: "Queue item not found" });
      }

      await storage.updateQueueItem(req.params.id, {
        status: "fetching",
        lastAttemptAt: new Date(),
      });

      const result = await fetchPublicMetadata(queueItem.url);

      if (!result.success) {
        await storage.updateQueueItem(req.params.id, {
          status: "failed",
          attemptCount: queueItem.attemptCount + 1,
          lastError: result.error || "Unknown error",
        });
        return res.status(400).json({ 
          error: "Public fetch failed", 
          details: result.error,
          queueItem: await storage.getQueueItem(req.params.id),
        });
      }

      // Create container from successful fetch
      const container = await storage.createContainer({
        url: queueItem.url,
        title: result.title,
        thumbnail: result.thumbnail,
        type: result.type,
        rating: queueItem.rating,
        genre: queueItem.genre,
        tags: queueItem.tags,
      });

      // Update container with surl
      await storage.updateContainer(container.id, {
        fileCount: result.fileCount,
      });

      // Remove from queue
      await storage.removeFromQueue(req.params.id);

      res.json({
        success: true,
        container: await storage.getContainer(container.id),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to perform public fetch" });
    }
  });

  // Public fetch directly for a container (retry)
  app.post("/api/containers/:id/public-fetch", async (req, res) => {
    try {
      const container = await storage.getContainer(req.params.id);
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }

      const result = await fetchPublicMetadata(container.url);

      if (!result.success) {
        return res.status(400).json({ 
          error: "Public fetch failed", 
          details: result.error,
        });
      }

      const updated = await storage.updateContainer(req.params.id, {
        title: result.title || container.title,
        thumbnail: result.thumbnail || container.thumbnail,
        type: result.type,
        fileCount: result.fileCount,
      });

      res.json({
        success: true,
        container: updated,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to perform public fetch" });
    }
  });

  // ============ AUTHENTICATION ============

  // Start auth session (launches browser)
  app.post("/api/auth/start", async (req, res) => {
    try {
      const session = await startAuthSession();
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to start auth session" });
    }
  });

  // Get auth session status
  app.get("/api/auth/status", async (req, res) => {
    try {
      const session = getAuthSessionStatus();
      if (!session) {
        return res.json({ status: "none", message: "No active auth session" });
      }

      // If auth was captured, save it
      if (session.status === "success" && session.authData) {
        await storage.saveAuthToken(session.authData);
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get auth status" });
    }
  });

  // Close auth session
  app.post("/api/auth/close", async (req, res) => {
    try {
      await closeAuthSession();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to close auth session" });
    }
  });

  // Get current auth token status
  app.get("/api/auth/token", async (req, res) => {
    try {
      const token = await storage.getActiveAuthToken();
      if (!token) {
        return res.json({ 
          hasToken: false, 
          message: "No active authentication token" 
        });
      }
      res.json({
        hasToken: true,
        provider: token.provider,
        capturedAt: token.capturedAt,
        status: token.status,
        lastUsedAt: token.lastUsedAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get auth token status" });
    }
  });

  // Invalidate tokens
  app.post("/api/auth/invalidate", async (req, res) => {
    try {
      await storage.invalidateAuthTokens();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to invalidate tokens" });
    }
  });

  // ============ AUTHENTICATED FETCH ============

  // Auth fetch for a container (requires active auth token)
  app.post("/api/containers/:id/auth-fetch", async (req, res) => {
    try {
      // First validate auth token exists
      const token = await storage.getActiveAuthToken();
      if (!token) {
        return res.status(401).json({ 
          error: "No active authentication token",
          message: "Please authenticate first using the Auth button in the header",
          needsAuth: true
        });
      }

      const container = await storage.getContainer(req.params.id);
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }

      const authData: TeraboxAuthData = {
        provider: token.provider,
        jsToken: token.jsToken,
        cookies: JSON.parse(token.cookies),
        capturedAt: token.capturedAt,
      };

      const result = await fetchAuthenticatedMetadata(container.url, authData);

      console.log("[Auth Fetch] Result for", container.url, ":", {
        success: result.success,
        itemCount: result.items?.length,
        error: result.error,
        sampleItem: result.items?.[0] ? {
          name: result.items[0].name,
          hasDlink: !!result.items[0].dlink,
          dlink: result.items[0].dlink?.substring(0, 50) + "...",
        } : null,
      });

      if (!result.success) {
        return res.status(400).json({ 
          error: "Auth fetch failed", 
          details: result.error,
        });
      }

      // Delete existing files for this container
      await storage.deleteFilesByContainer(req.params.id);

      // Create files from the result
      const files = [];
      for (const item of result.items) {
        if (!item.isFolder) {
          const file = await storage.createFile({
            containerId: req.params.id,
            name: item.name,
            path: item.path,
            type: item.type as any,
            size: item.size,
            thumbnail: item.thumbs?.url3 || item.thumbs?.url2 || item.thumbs?.url1 || null,
          });
          
          // Update with dlink and other metadata
          await storage.updateFile(file.id, {
            downloadUrl: item.dlink,
          });
          
          files.push(await storage.getFile(file.id));
        }
      }

      // Update container status
      await storage.updateContainer(req.params.id, {
        status: "expanded",
        isExpanded: true,
        fileCount: files.length,
        authExpiry: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });

      res.json({
        success: true,
        container: await storage.getContainer(req.params.id),
        files,
        count: result.count,
      });
    } catch (error) {
      console.error("Auth fetch error:", error);
      res.status(500).json({ error: "Failed to perform auth fetch" });
    }
  });

  // ============ FILES ============

  app.get("/api/containers/:containerId/files", async (req, res) => {
    try {
      const files = await storage.getFiles(req.params.containerId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  // ============ FOLDERS ============

  app.get("/api/containers/:containerId/folders", async (req, res) => {
    try {
      const folders = await storage.getFolders(req.params.containerId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  // ============ SETTINGS ============

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid settings data", details: parsed.error.errors });
      }
      const settings = await storage.updateSettings(parsed.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============ TAGS ============

  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const parsed = createTagSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid tag data", details: parsed.error.errors });
      }
      const existingTags = await storage.getTags();
      const duplicate = existingTags.find(t => t.name.toLowerCase() === parsed.data.name.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ error: "A tag with this name already exists" });
      }
      const tag = await storage.createTag(parsed.data.name, parsed.data.color);
      res.status(201).json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTag(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // ============ GENRES ============

  app.get("/api/genres", async (req, res) => {
    try {
      const genres = await storage.getGenres();
      res.json(genres);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch genres" });
    }
  });

  app.post("/api/genres", async (req, res) => {
    try {
      const parsed = createGenreSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid genre data", details: parsed.error.errors });
      }
      const existingGenres = await storage.getGenres();
      const duplicate = existingGenres.find(g => g.name.toLowerCase() === parsed.data.name.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ error: "A genre with this name already exists" });
      }
      const genre = await storage.createGenre(parsed.data.name, parsed.data.color);
      res.status(201).json(genre);
    } catch (error) {
      res.status(500).json({ error: "Failed to create genre" });
    }
  });

  app.delete("/api/genres/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGenre(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Genre not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete genre" });
    }
  });

  // ============ STREAMING & DOWNLOAD ============

  // Helper to build cookie header from stored auth token
  const buildCookieHeader = (token: { cookies: string } | null | undefined): string => {
    if (!token) return "";
    try {
      const cookies = JSON.parse(token.cookies);
      return cookies
        .filter((c: any) => 
          c.domain.includes("1024tera") || 
          c.domain.includes("terabox") ||
          c.domain.includes("panapi") ||
          c.domain.includes("pcs")
        )
        .map((c: any) => `${c.name}=${c.value}`)
        .join("; ");
    } catch {
      return "";
    }
  };

  // Stream video with range support for progressive playback
  app.get("/api/stream/:fileId", async (req, res) => {
    const startTime = Date.now();
    console.log("\n========== STREAM REQUEST ==========");
    console.log(`[STREAM] File ID: ${req.params.fileId}`);
    console.log(`[STREAM] Browser Range header: ${req.headers.range || "NONE"}`);
    
    try {
      const file = await storage.getFile(req.params.fileId);
      if (!file) {
        console.log("[STREAM] ERROR: File not found in database");
        return res.status(404).json({ error: "File not found" });
      }

      const streamUrl = file.downloadUrl || file.dlink;
      console.log(`[STREAM] File name: ${file.name}`);
      console.log(`[STREAM] Stream URL exists: ${!!streamUrl}`);
      console.log(`[STREAM] Stream URL (first 100 chars): ${streamUrl?.substring(0, 100)}...`);
      
      if (!streamUrl) {
        console.log("[STREAM] ERROR: No stream URL available");
        return res.status(400).json({ error: "No stream URL available. Run Auth Fetch first." });
      }

      const token = await storage.getActiveAuthToken();
      const cookieHeader = buildCookieHeader(token);
      console.log(`[STREAM] Has auth token: ${!!token}`);
      console.log(`[STREAM] Cookie header length: ${cookieHeader.length}`);

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Referer": "https://www.1024tera.com/",
        "Origin": "https://www.1024tera.com",
        "Accept": "*/*",
      };

      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
      }

      if (req.headers.range) {
        headers["Range"] = req.headers.range;
        console.log(`[STREAM] Forwarding Range to TeraBox: ${req.headers.range}`);
      } else {
        console.log("[STREAM] WARNING: No Range header from browser!");
      }

      console.log(`[STREAM] Fetching from TeraBox...`);
      const fetchStart = Date.now();
      
      const response = await fetch(streamUrl, { 
        headers,
        redirect: "follow"
      });
      
      const fetchTime = Date.now() - fetchStart;
      console.log(`[STREAM] TeraBox response in ${fetchTime}ms`);
      console.log(`[STREAM] TeraBox status: ${response.status}`);
      console.log(`[STREAM] TeraBox headers:`);
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value.substring(0, 100)}`);
      });

      if (!response.ok && response.status !== 206) {
        const expired = response.status === 401 || response.status === 403;
        console.log(`[STREAM] ERROR: TeraBox returned ${response.status}, expired: ${expired}`);
        return res.status(response.status).json({ 
          error: "Stream failed", 
          status: response.status,
          expired,
          message: expired 
            ? "The download link has expired. Run Auth Fetch again to get fresh links."
            : "Could not stream file."
        });
      }

      // 🔥 CRITICAL FIX: Return 200 for initial range (bytes=0-), 206 only for subranges
      // Returning 206 for bytes=0- keeps Chromium stuck in infinite range negotiation
      const range = req.headers.range;
      const isInitialRange = range === "bytes=0-" || !range;
      const statusCode = isInitialRange ? 200 : 206;
      res.status(statusCode);
      console.log(`[STREAM] Range: ${range}, isInitial: ${isInitialRange}, sending status ${statusCode}`);

      // Forward headers from TeraBox
      // Skip headers that could cause issues with our proxy or video playback
      const skipHeaders = new Set([
        "transfer-encoding", 
        "connection", 
        "keep-alive",
        "content-encoding", // Let our server handle encoding
        "content-disposition" // CRITICAL: "attachment" breaks <video> playback
      ]);
      
      const forwardedHeaders: string[] = [];
      response.headers.forEach((value, key) => {
        const k = key.toLowerCase();
        // Skip bad headers
        if (skipHeaders.has(k)) return;
        // Skip Content-Range for initial request (we're returning 200, not 206)
        if (isInitialRange && k === "content-range") return;
        
        res.setHeader(key, value);
        forwardedHeaders.push(key);
      });
      console.log(`[STREAM] Forwarded headers: ${forwardedHeaders.join(", ")}`);

      // Set proper streaming headers
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Connection", "close");
      
      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

      // Stream the response body using proper piping for backpressure handling
      if (response.body) {
        console.log(`[STREAM] Starting pipe to browser...`);
        // Convert Web ReadableStream to Node.js Readable and pipe to response
        const nodeStream = Readable.fromWeb(response.body as any);
        
        let bytesStreamed = 0;
        nodeStream.on("data", (chunk) => {
          bytesStreamed += chunk.length;
        });
        
        // 3️⃣ Explicitly end response when stream finishes - CRITICAL for Chromium
        nodeStream.on("end", () => {
          const totalTime = Date.now() - startTime;
          console.log(`[STREAM] Complete! ${bytesStreamed} bytes in ${totalTime}ms`);
          if (!res.writableEnded) {
            res.end();
            console.log(`[STREAM] Response explicitly ended`);
          }
        });
        
        // Use pipe with { end: false } so we control when to end
        nodeStream.pipe(res, { end: false });
        
        nodeStream.on("error", (err) => {
          console.error("[STREAM] Pipe error:", err);
          if (!res.writableEnded) {
            res.end();
          }
        });
      } else {
        console.log("[STREAM] WARNING: No response body from TeraBox!");
        res.end();
      }
    } catch (error) {
      console.error("[STREAM] EXCEPTION:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream file" });
      }
    }
  });

  // Download file with proper headers
  app.get("/api/download/:fileId", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const downloadUrl = file.downloadUrl || file.dlink;
      if (!downloadUrl) {
        return res.status(400).json({ error: "No download URL available. Run Auth Fetch first." });
      }

      const token = await storage.getActiveAuthToken();
      const cookieHeader = buildCookieHeader(token);

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Referer": "https://www.1024tera.com/",
        "Origin": "https://www.1024tera.com",
      };

      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
      }

      const response = await fetch(downloadUrl, { 
        headers,
        redirect: "follow"
      });

      if (!response.ok) {
        const expired = response.status === 401 || response.status === 403;
        return res.status(response.status).json({ 
          error: "Download failed",
          expired,
          message: expired 
            ? "The download link has expired. Run Auth Fetch again."
            : "Could not download file."
        });
      }

      // Set download headers with proper filename
      const filename = file.name;
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader("Content-Disposition", `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
      
      const contentType = response.headers.get("Content-Type");
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      
      const contentLength = response.headers.get("Content-Length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      // Stream the response body using proper piping for backpressure handling
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        
        nodeStream.on("error", (err) => {
          console.error("Download stream error:", err);
          if (!res.writableEnded) {
            res.end();
          }
        });
      } else {
        res.end();
      }
    } catch (error) {
      console.error("Download error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download file" });
      }
    }
  });

  // Get playable URL info for a file
  app.get("/api/files/:id/playback-info", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const hasPlayableUrl = !!(file.downloadUrl || file.dlink);
      const isVideo = file.type === "video" || /\.(mp4|mkv|avi|mov|webm|m4v|flv|wmv|3gp)$/i.test(file.name);
      const isAudio = file.type === "audio" || /\.(mp3|wav|flac|aac|ogg|m4a|wma)$/i.test(file.name);

      res.json({
        fileId: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        hasPlayableUrl,
        isPlayable: hasPlayableUrl && (isVideo || isAudio),
        isVideo,
        isAudio,
        streamUrl: hasPlayableUrl ? `/api/stream/${file.id}` : null,
        downloadUrl: hasPlayableUrl ? `/api/download/${file.id}` : null,
        thumbnail: file.thumbnail,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get playback info" });
    }
  });

  // ============ DUPLICATES ============

  app.get("/api/duplicates", async (req, res) => {
    try {
      const duplicates = await storage.getDuplicates();
      res.json(duplicates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch duplicates" });
    }
  });

  app.post("/api/duplicates/detect", async (req, res) => {
    try {
      console.log("[Duplicates] Starting detection...");
      const containers = await storage.getContainers();
      console.log("[Duplicates] Found", containers.length, "containers to check");
      
      const newDuplicates = await storage.detectDuplicates();
      const allDuplicates = await storage.getDuplicates();
      
      console.log("[Duplicates] Detection complete:", {
        newCount: newDuplicates.length,
        totalCount: allDuplicates.length,
      });
      
      res.json({
        newCount: newDuplicates.length,
        totalCount: allDuplicates.length,
        duplicates: allDuplicates,
      });
    } catch (error) {
      console.error("[Duplicates] Detection error:", error);
      res.status(500).json({ error: "Failed to detect duplicates" });
    }
  });

  app.patch("/api/duplicates/:id", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["pending", "ignored", "deleted"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const duplicate = await storage.updateDuplicateStatus(req.params.id, status);
      if (!duplicate) {
        return res.status(404).json({ error: "Duplicate record not found" });
      }
      res.json(duplicate);
    } catch (error) {
      res.status(500).json({ error: "Failed to update duplicate status" });
    }
  });

  app.delete("/api/duplicates/:id", async (req, res) => {
    try {
      await storage.deleteDuplicate(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete duplicate record" });
    }
  });

  app.post("/api/duplicates/:id/delete-container", async (req, res) => {
    try {
      const duplicates = await storage.getDuplicates();
      const duplicate = duplicates.find(d => d.id === req.params.id);
      if (!duplicate) {
        return res.status(404).json({ error: "Duplicate record not found" });
      }
      
      const { containerId } = req.body;
      if (!containerId || (containerId !== duplicate.sourceContainerId && containerId !== duplicate.matchContainerId)) {
        return res.status(400).json({ error: "Invalid container ID" });
      }
      
      const deleted = await storage.deleteContainer(containerId);
      if (!deleted) {
        return res.status(404).json({ error: "Container not found or already deleted" });
      }
      
      await storage.updateDuplicateStatus(req.params.id, "deleted");
      
      res.json({ success: true, deletedContainerId: containerId });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete container" });
    }
  });

  app.post("/api/assets/upload", backgroundUpload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileUrl = `/api/assets/backgrounds/${req.file.filename}`;
      const isVideo = req.file.mimetype.startsWith("video/");
      res.json({
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: isVideo ? "video" : "image",
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/assets/backgrounds/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.resolve(backgroundsDir, filename);
    
    if (!filePath.startsWith(backgroundsDir)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.sendFile(filePath);
  });

  app.get("/api/assets/backgrounds", (req, res) => {
    try {
      const files = fs.readdirSync(backgroundsDir);
      const assets = files.map((filename) => {
        const filePath = path.join(backgroundsDir, filename);
        const stats = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const isVideo = [".mp4", ".webm", ".ogg"].includes(ext);
        return {
          filename,
          url: `/api/assets/backgrounds/${filename}`,
          size: stats.size,
          type: isVideo ? "video" : "image",
          createdAt: stats.birthtime.toISOString(),
        };
      });
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to list assets" });
    }
  });

  app.delete("/api/assets/backgrounds/:filename", (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.resolve(backgroundsDir, filename);
      
      if (!filePath.startsWith(backgroundsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      fs.unlinkSync(filePath);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  app.get("/api/local-media/scan", (req, res) => {
    try {
      const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv", ".m4v"];
      const results: Array<{
        filename: string;
        path: string;
        url: string;
        size: number;
        extension: string;
        createdAt: string;
      }> = [];

      const scanDir = (dir: string) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              scanDir(fullPath);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (videoExtensions.includes(ext)) {
                const stats = fs.statSync(fullPath);
                const relativePath = path.relative(localMediaDir, fullPath);
                results.push({
                  filename: entry.name,
                  path: relativePath,
                  url: `/api/local-media/stream/${encodeURIComponent(relativePath)}`,
                  size: stats.size,
                  extension: ext,
                  createdAt: stats.birthtime.toISOString(),
                });
              }
            }
          }
        } catch (err) {
        }
      };

      scanDir(localMediaDir);

      res.json({
        scanPath: localMediaDir,
        count: results.length,
        files: results,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to scan local media" });
    }
  });

  app.get("/api/local-media/stream/:path(*)", (req, res) => {
    try {
      const requestedPath = decodeURIComponent(req.params.path);
      const filePath = path.resolve(localMediaDir, requestedPath);
      const relativePath = path.relative(localMediaDir, filePath);
      
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv", ".m4v"];
      const ext = path.extname(filePath).toLowerCase();
      if (!videoExtensions.includes(ext)) {
        return res.status(403).json({ error: "Invalid file type" });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      const mimeTypes: Record<string, string> = {
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
        ".wmv": "video/x-ms-wmv",
        ".flv": "video/x-flv",
        ".m4v": "video/x-m4v",
      };
      const contentType = mimeTypes[ext] || "video/mp4";

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stream file" });
    }
  });

  return httpServer;
}
