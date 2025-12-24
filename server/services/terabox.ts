import { chromium, type Browser, type BrowserContext } from "playwright";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130";
const TERABOX_HOME = "https://www.1024tera.com/";

// Chrome user data for persistent context (configurable via env vars for local usage)
// Set CHROME_USER_DATA env var to your Chrome profile path, e.g.:
// Windows: C:/Users/YourName/AppData/Local/Google/Chrome/User Data
// Mac: ~/Library/Application Support/Google/Chrome
// Linux: ~/.config/google-chrome
const CHROME_USER_DATA = process.env.CHROME_USER_DATA || "C:/Users/sujit/AppData/Local/Google/Chrome/User Data";
const CHROME_PROFILE_DIR = process.env.CHROME_PROFILE_DIR || "Default";

export interface TeraboxPublicMetadata {
  success: boolean;
  surl: string;
  title?: string;
  type: "single" | "multiple" | "folder" | "unknown";
  fileCount?: number;
  thumbnail?: string;
  error?: string;
}

export interface TeraboxAuthData {
  provider: string;
  jsToken: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
  }>;
  capturedAt: Date;
}

export interface TeraboxFileItem {
  name: string;
  path: string;
  isFolder: boolean;
  type: string;
  size: number;
  sizeHuman: string;
  fsId: string;
  md5: string | null;
  dlink: string | null;
  thumbs: Record<string, string> | null;
}

export interface TeraboxAuthMetadata {
  success: boolean;
  count: number;
  items: TeraboxFileItem[];
  error?: string;
}

export function extractSurl(url: string): string | null {
  try {
    const u = new URL(url);
    let surl = u.searchParams.get("surl");
    if (!surl) {
      const m = u.pathname.match(/\/s\/([A-Za-z0-9_-]+)/);
      if (m) surl = m[1];
    }
    if (!surl) return null;
    return surl.startsWith("1") ? surl.slice(1) : surl;
  } catch {
    return null;
  }
}

function cookiesToHeader(cookies: TeraboxAuthData["cookies"]): string {
  return cookies
    .filter(c => c.domain.includes("1024tera") || c.domain.includes("terabox"))
    .map(c => `${c.name}=${c.value}`)
    .join("; ");
}

function humanSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

function guessType(name: string): string {
  const n = name.toLowerCase();
  if (/\.(mp4|mkv|avi|mov|webm)$/.test(n)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(n)) return "image";
  if (/\.(mp3|wav|flac|aac)$/.test(n)) return "audio";
  if (/\.(pdf|docx?|pptx?|xlsx?)$/.test(n)) return "document";
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return "archive";
  return "other";
}

export async function fetchPublicMetadata(shareUrl: string): Promise<TeraboxPublicMetadata> {
  const surl = extractSurl(shareUrl);
  if (!surl) {
    return { success: false, surl: "", type: "unknown", error: "Invalid TeraBox URL - could not extract surl" };
  }

  const dmPageUrl = `https://dm.1024tera.com/sharing/link?surl=${surl}&clearCache=1`;
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
      ],
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
    });

    const page = await context.newPage();
    await page.goto(dmPageUrl, { waitUntil: "domcontentloaded" });

    const response = await page.waitForResponse(
      res => res.url().includes("/api/shorturlinfo") && res.request().method() === "GET",
      { timeout: 30000 }
    );

    const data = await response.json();

    if (data.errno !== 0) {
      return { success: false, surl, type: "unknown", error: `TeraBox API error: errno ${data.errno}` };
    }

    const list = data.list || [];
    let type: "single" | "multiple" | "folder" | "unknown" = "unknown";
    
    if (list.length === 1) {
      type = list[0].isdir === "1" ? "folder" : "single";
    } else if (list.length > 1) {
      type = "multiple";
    }

    const thumbnail = list[0]?.thumbs?.url3 || list[0]?.thumbs?.url2 || list[0]?.thumbs?.url1 || null;

    return {
      success: true,
      surl,
      title: data.title || list[0]?.server_filename || "Untitled",
      type,
      fileCount: list.length,
      thumbnail,
    };
  } catch (error) {
    return {
      success: false,
      surl,
      type: "unknown",
      error: error instanceof Error ? error.message : "Unknown error during public fetch",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function fetchAuthenticatedMetadata(
  shareUrl: string,
  authData: TeraboxAuthData
): Promise<TeraboxAuthMetadata> {
  const surl = extractSurl(shareUrl);
  if (!surl) {
    return { success: false, count: 0, items: [], error: "Invalid TeraBox URL" };
  }

  const cookie = cookiesToHeader(authData.cookies);

  try {
    const rootData = await fetchList({ surl, jsToken: authData.jsToken, cookie });

    if (rootData.errno !== 0 || !rootData.list) {
      return { 
        success: false, 
        count: 0, 
        items: [], 
        error: `Failed to fetch list: errno ${rootData.errno}` 
      };
    }

    let items = rootData.list;

    if (items.length === 1 && items[0].isdir === "1") {
      const innerData = await fetchList({
        surl,
        jsToken: authData.jsToken,
        cookie,
        dir: items[0].path,
      });
      if (innerData.list) {
        items = innerData.list;
      }
    }

    const output: TeraboxFileItem[] = items.map((f: any) => ({
      name: f.server_filename,
      path: f.path,
      isFolder: f.isdir === "1",
      type: f.isdir === "1" ? "folder" : guessType(f.server_filename),
      size: Number(f.size || 0),
      sizeHuman: humanSize(Number(f.size || 0)),
      fsId: f.fs_id,
      md5: f.md5 || null,
      dlink: f.dlink || null,
      thumbs: f.thumbs || null,
    }));

    return {
      success: true,
      count: output.length,
      items: output,
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      items: [],
      error: error instanceof Error ? error.message : "Unknown error during auth fetch",
    };
  }
}

async function fetchList(params: {
  surl: string;
  jsToken: string;
  cookie: string;
  dir?: string;
}): Promise<any> {
  const { surl, jsToken, cookie, dir } = params;

  const urlParams = new URLSearchParams({
    app_id: "250528",
    web: "1",
    channel: "dubox",
    clienttype: "0",
    shorturl: surl,
    jsToken,
    page: "1",
    num: "100",
    order: "asc",
    by: "name",
    site_referer: "https://www.1024tera.com/",
  });

  if (dir) {
    urlParams.set("dir", dir);
  } else {
    urlParams.set("root", "1");
  }

  const url = "https://dm.1024tera.com/share/list?" + urlParams.toString();

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Cookie": cookie,
      "Referer": `https://www.1024tera.com/sharing/link?surl=${surl}`,
      "Origin": "https://www.1024tera.com",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Expected JSON, got HTML (verify/auth issue)");
  }
}

export interface AuthSessionState {
  sessionId: string;
  status: "pending" | "waiting_for_login" | "capturing" | "success" | "failed";
  message: string;
  authData?: TeraboxAuthData;
}

let activeAuthSession: AuthSessionState | null = null;
let activeBrowserContext: BrowserContext | null = null;

export async function startAuthSession(): Promise<AuthSessionState> {
  if (activeAuthSession && activeAuthSession.status === "waiting_for_login") {
    return activeAuthSession;
  }

  const sessionId = `auth_${Date.now()}`;
  activeAuthSession = {
    sessionId,
    status: "pending",
    message: "Starting authentication session with Chrome profile...",
  };

  try {
    console.log("[Auth] Launching Playwright with real Chrome profile...");
    
    // Use launchPersistentContext with real Chrome profile for full cookie access
    activeBrowserContext = await chromium.launchPersistentContext(
      CHROME_USER_DATA,
      {
        channel: "chrome",
        headless: false,
        args: [
          `--profile-directory=${CHROME_PROFILE_DIR}`,
          "--disable-blink-features=AutomationControlled",
        ],
      }
    );

    const page = activeBrowserContext.pages()[0] || await activeBrowserContext.newPage();

    let captured = false;

    page.on("request", async req => {
      if (captured) return;
      
      const url = req.url();
      if (!url.includes("jsToken=")) return;

      try {
        const jsToken = new URL(url).searchParams.get("jsToken");
        if (!jsToken || jsToken.length < 20) return;

        console.log("[Auth] jsToken captured:", jsToken.substring(0, 30) + "...");

        const allCookies = await activeBrowserContext!.cookies();
        const cookies = allCookies.filter(c =>
          c.domain.includes("1024tera") || c.domain.includes("terabox")
        );

        console.log("[Auth] Captured", cookies.length, "TeraBox cookies");

        activeAuthSession = {
          sessionId,
          status: "success",
          message: "Authentication captured successfully",
          authData: {
            provider: "terabox",
            jsToken,
            cookies: cookies.map(c => ({
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              expires: c.expires,
              httpOnly: c.httpOnly,
              secure: c.secure,
              sameSite: c.sameSite as string,
            })),
            capturedAt: new Date(),
          },
        };

        captured = true;
      } catch (error) {
        console.error("[Auth] Error capturing auth:", error);
      }
    });

    activeBrowserContext.on("close", () => {
      if (!captured && activeAuthSession?.status !== "success") {
        activeAuthSession = {
          sessionId,
          status: "failed",
          message: "Browser closed before authentication was captured",
        };
      }
      activeBrowserContext = null;
    });

    await page.goto(TERABOX_HOME, { waitUntil: "domcontentloaded" });

    activeAuthSession = {
      sessionId,
      status: "waiting_for_login",
      message: "Browser opened with your Chrome profile. Navigate to any share link to capture auth.",
    };

    return activeAuthSession;
  } catch (error) {
    console.error("[Auth] Failed to start session:", error);
    activeAuthSession = {
      sessionId,
      status: "failed",
      message: error instanceof Error ? error.message : "Failed to start auth session",
    };
    return activeAuthSession;
  }
}

export function getAuthSessionStatus(): AuthSessionState | null {
  return activeAuthSession;
}

export async function closeAuthSession(): Promise<void> {
  if (activeBrowserContext) {
    await activeBrowserContext.close();
    activeBrowserContext = null;
  }
  activeAuthSession = null;
}
