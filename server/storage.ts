import { randomUUID } from "crypto";
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
  BulkUploadResult
} from "@shared/schema";

export interface IStorage {
  // Containers
  getContainers(): Promise<VirtualContainer[]>;
  getContainersByRating(rating: ContentRating): Promise<VirtualContainer[]>;
  getContainer(id: string): Promise<VirtualContainer | undefined>;
  getContainersByGenre(genre: string): Promise<VirtualContainer[]>;
  createContainer(container: InsertContainer): Promise<VirtualContainer>;
  createContainersBulk(containers: InsertContainer[]): Promise<BulkUploadResult>;
  updateContainer(id: string, updates: Partial<VirtualContainer>): Promise<VirtualContainer | undefined>;
  deleteContainer(id: string): Promise<boolean>;

  // Files
  getFiles(containerId: string): Promise<MediaFile[]>;
  getFile(id: string): Promise<MediaFile | undefined>;
  createFile(file: InsertFile): Promise<MediaFile>;
  updateFile(id: string, updates: Partial<MediaFile>): Promise<MediaFile | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // Folders
  getFolders(containerId: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;

  // Settings
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // Tags
  getTags(): Promise<Tag[]>;
  createTag(name: string, color: string): Promise<Tag>;
  deleteTag(id: string): Promise<boolean>;

  // Genres
  getGenres(): Promise<Genre[]>;
  createGenre(name: string, color: string): Promise<Genre>;
  deleteGenre(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private containers: Map<string, VirtualContainer>;
  private files: Map<string, MediaFile>;
  private folders: Map<string, Folder>;
  private tags: Map<string, Tag>;
  private genres: Map<string, Genre>;
  private settings: AppSettings;

  constructor() {
    this.containers = new Map();
    this.files = new Map();
    this.folders = new Map();
    this.tags = new Map();
    this.genres = new Map();
    this.settings = {
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
    };

    this.seedData();
  }

  private seedData() {
    const mockContainers: VirtualContainer[] = [
      {
        id: "1",
        url: "https://example.com/media/collection-1",
        title: "Nature Documentary Collection",
        thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop",
        type: "folder",
        status: "authenticated",
        fileCount: 24,
        isExpanded: false,
        authExpiry: new Date(Date.now() + 3 * 60 * 60 * 1000),
        linkExpiry: null,
        genre: "nature",
        tags: ["documentary", "wildlife"],
        rating: "regular",
        createdAt: new Date(),
      },
      {
        id: "2",
        url: "https://example.com/media/scifi-series",
        title: "Sci-Fi Series Archive",
        thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=225&fit=crop",
        type: "multiple",
        status: "basic",
        fileCount: null,
        isExpanded: false,
        authExpiry: null,
        linkExpiry: null,
        genre: "sci-fi",
        tags: ["series", "space"],
        rating: "regular",
        createdAt: new Date(),
      },
      {
        id: "3",
        url: "https://example.com/media/architecture-tour",
        title: "Modern Architecture Tour",
        thumbnail: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=225&fit=crop",
        type: "folder",
        status: "expanded",
        fileCount: 156,
        isExpanded: true,
        authExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000),
        linkExpiry: null,
        genre: "architecture",
        tags: ["buildings", "modern"],
        rating: "regular",
        createdAt: new Date(),
      },
      {
        id: "4",
        url: "https://example.com/media/single-video.mp4",
        title: "Tutorial Video",
        thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop",
        type: "single",
        status: "authenticated",
        fileCount: 1,
        isExpanded: false,
        authExpiry: new Date(Date.now() + 1 * 60 * 60 * 1000),
        linkExpiry: new Date(Date.now() + 12 * 60 * 60 * 1000),
        genre: null,
        tags: ["tutorial"],
        rating: "regular",
        createdAt: new Date(),
      },
      {
        id: "5",
        url: "https://example.com/media/expired-content",
        title: "Expired Content",
        thumbnail: null,
        type: "unknown",
        status: "expired",
        fileCount: null,
        isExpanded: false,
        authExpiry: new Date(Date.now() - 1 * 60 * 60 * 1000),
        linkExpiry: null,
        genre: null,
        tags: [],
        rating: "regular",
        createdAt: new Date(),
      },
      {
        id: "6",
        url: "https://example.com/media/photography",
        title: "Photography Portfolio",
        thumbnail: "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=400&h=225&fit=crop",
        type: "folder",
        status: "authenticated",
        fileCount: 89,
        isExpanded: false,
        authExpiry: new Date(Date.now() + 2 * 60 * 60 * 1000),
        linkExpiry: null,
        genre: "nature",
        tags: ["photos", "portfolio"],
        rating: "regular",
        createdAt: new Date(),
      },
      {
        id: "7",
        url: "https://example.com/media/adult-content",
        title: "Adult Collection",
        thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=225&fit=crop",
        type: "folder",
        status: "authenticated",
        fileCount: 45,
        isExpanded: false,
        authExpiry: new Date(Date.now() + 4 * 60 * 60 * 1000),
        linkExpiry: null,
        genre: null,
        tags: ["adult"],
        rating: "adult",
        createdAt: new Date(),
      },
    ];

    mockContainers.forEach(c => this.containers.set(c.id, c));

    const mockFolders: Folder[] = [
      { id: "f1", containerId: "1", name: "Documentaries", path: "/Documentaries", parentId: null, fileCount: 12 },
      { id: "f2", containerId: "1", name: "Wildlife", path: "/Documentaries/Wildlife", parentId: "f1", fileCount: 6 },
      { id: "f3", containerId: "1", name: "Ocean", path: "/Documentaries/Ocean", parentId: "f1", fileCount: 4 },
      { id: "f4", containerId: "1", name: "Mountains", path: "/Documentaries/Wildlife/Mountains", parentId: "f2", fileCount: 3 },
      { id: "f5", containerId: "1", name: "Images", path: "/Images", parentId: null, fileCount: 24 },
      { id: "f6", containerId: "1", name: "Landscapes", path: "/Images/Landscapes", parentId: "f5", fileCount: 15 },
      { id: "f7", containerId: "1", name: "Portraits", path: "/Images/Portraits", parentId: "f5", fileCount: 9 },
    ];

    mockFolders.forEach(f => this.folders.set(f.id, f));

    const mockFiles: MediaFile[] = [
      {
        id: "file1",
        containerId: "1",
        name: "mountain_view.mp4",
        path: "/Images/Landscapes/mountain_view.mp4",
        type: "video",
        size: 245000000,
        duration: 180,
        thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
        downloadUrl: "https://example.com/download/1",
        linkExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000),
        isSelected: false,
      },
      {
        id: "file2",
        containerId: "1",
        name: "ocean_sunset.mp4",
        path: "/Images/Landscapes/ocean_sunset.mp4",
        type: "video",
        size: 320000000,
        duration: 240,
        thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop",
        downloadUrl: "https://example.com/download/2",
        linkExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000),
        isSelected: false,
      },
      {
        id: "file3",
        containerId: "1",
        name: "wildlife_doc.mp4",
        path: "/Documentaries/Wildlife/wildlife_doc.mp4",
        type: "video",
        size: 524000000,
        duration: 3600,
        thumbnail: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=300&h=300&fit=crop",
        downloadUrl: "https://example.com/download/3",
        linkExpiry: new Date(Date.now() + 3 * 60 * 60 * 1000),
        isSelected: false,
      },
      {
        id: "file4",
        containerId: "1",
        name: "forest_journey.mp4",
        path: "/Documentaries/forest_journey.mp4",
        type: "video",
        size: 850000000,
        duration: 1800,
        thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=300&fit=crop",
        downloadUrl: "https://example.com/download/4",
        linkExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000),
        isSelected: false,
      },
      {
        id: "file5",
        containerId: "1",
        name: "desert_plains.mp4",
        path: "/Images/Landscapes/desert_plains.mp4",
        type: "video",
        size: 180000000,
        duration: 120,
        thumbnail: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop",
        downloadUrl: null,
        linkExpiry: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isSelected: false,
      },
      {
        id: "file6",
        containerId: "1",
        name: "city_timelapse.mp4",
        path: "/Documentaries/city_timelapse.mp4",
        type: "video",
        size: 256000000,
        duration: 120,
        thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300&h=300&fit=crop",
        downloadUrl: "https://example.com/download/6",
        linkExpiry: new Date(Date.now() + 12 * 60 * 60 * 1000),
        isSelected: false,
      },
    ];

    mockFiles.forEach(f => this.files.set(f.id, f));

    const defaultTags: Tag[] = [
      { id: "t1", name: "documentary", color: "#3b82f6", count: 1 },
      { id: "t2", name: "wildlife", color: "#22c55e", count: 1 },
      { id: "t3", name: "series", color: "#a855f7", count: 1 },
      { id: "t4", name: "space", color: "#06b6d4", count: 1 },
      { id: "t5", name: "tutorial", color: "#f59e0b", count: 1 },
    ];

    defaultTags.forEach(t => this.tags.set(t.id, t));

    const defaultGenres: Genre[] = [
      { id: "g1", name: "nature", color: "#22c55e", count: 2 },
      { id: "g2", name: "sci-fi", color: "#3b82f6", count: 1 },
      { id: "g3", name: "architecture", color: "#a855f7", count: 1 },
    ];

    defaultGenres.forEach(g => this.genres.set(g.id, g));
  }

  // Containers
  async getContainers(): Promise<VirtualContainer[]> {
    return Array.from(this.containers.values());
  }

  async getContainersByRating(rating: ContentRating): Promise<VirtualContainer[]> {
    return Array.from(this.containers.values()).filter(c => c.rating === rating);
  }

  async getContainer(id: string): Promise<VirtualContainer | undefined> {
    return this.containers.get(id);
  }

  async getContainersByGenre(genre: string): Promise<VirtualContainer[]> {
    return Array.from(this.containers.values()).filter(c => c.genre === genre);
  }

  async createContainer(insertContainer: InsertContainer): Promise<VirtualContainer> {
    const id = randomUUID();
    const container: VirtualContainer = {
      id,
      url: insertContainer.url,
      title: insertContainer.title || this.extractTitleFromUrl(insertContainer.url),
      thumbnail: insertContainer.thumbnail || null,
      type: insertContainer.type || "unknown",
      status: "basic",
      fileCount: null,
      isExpanded: false,
      authExpiry: null,
      linkExpiry: null,
      genre: insertContainer.genre || null,
      tags: insertContainer.tags || [],
      rating: insertContainer.rating || "regular",
      createdAt: new Date(),
    };
    this.containers.set(id, container);
    return container;
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

        // Basic URL validation
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
    const container = this.containers.get(id);
    if (!container) return undefined;
    const updated = { ...container, ...updates };
    this.containers.set(id, updated);
    return updated;
  }

  async deleteContainer(id: string): Promise<boolean> {
    return this.containers.delete(id);
  }

  // Files
  async getFiles(containerId: string): Promise<MediaFile[]> {
    return Array.from(this.files.values()).filter(f => f.containerId === containerId);
  }

  async getFile(id: string): Promise<MediaFile | undefined> {
    return this.files.get(id);
  }

  async createFile(insertFile: InsertFile): Promise<MediaFile> {
    const id = randomUUID();
    const file: MediaFile = {
      id,
      containerId: insertFile.containerId,
      name: insertFile.name,
      path: insertFile.path,
      type: insertFile.type,
      size: insertFile.size || null,
      duration: insertFile.duration || null,
      thumbnail: insertFile.thumbnail || null,
      downloadUrl: null,
      linkExpiry: null,
      isSelected: false,
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: string, updates: Partial<MediaFile>): Promise<MediaFile | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    const updated = { ...file, ...updates };
    this.files.set(id, updated);
    return updated;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // Folders
  async getFolders(containerId: string): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter(f => f.containerId === containerId);
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...updates };
    return { ...this.settings };
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    const tags = Array.from(this.tags.values());
    const containers = Array.from(this.containers.values());
    return tags.map(tag => ({
      ...tag,
      count: containers.filter(c => c.tags && c.tags.includes(tag.name)).length,
    }));
  }

  async createTag(name: string, color: string): Promise<Tag> {
    const id = randomUUID();
    const tag: Tag = { id, name, color, count: 0 };
    this.tags.set(id, tag);
    return tag;
  }

  async deleteTag(id: string): Promise<boolean> {
    return this.tags.delete(id);
  }

  // Genres
  async getGenres(): Promise<Genre[]> {
    const genres = Array.from(this.genres.values());
    const containers = Array.from(this.containers.values());
    return genres.map(genre => ({
      ...genre,
      count: containers.filter(c => c.genre === genre.name).length,
    }));
  }

  async createGenre(name: string, color: string): Promise<Genre> {
    const id = randomUUID();
    const genre: Genre = { id, name: name.toLowerCase(), color, count: 0 };
    this.genres.set(id, genre);
    return genre;
  }

  async deleteGenre(id: string): Promise<boolean> {
    return this.genres.delete(id);
  }
}

export const storage = new MemStorage();
