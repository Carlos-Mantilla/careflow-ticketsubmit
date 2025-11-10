import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Get __dirname for ESM - works correctly even after esbuild compilation
let __dirname: string;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
} catch {
  __dirname = process.cwd();
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic imports to avoid bundling vite in production build
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = (await import("../vite.config")).default;
  
  const viteLogger = createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, dist/index.js is in dist/, and static files are in dist/public/
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Log for debugging
  log(`Serving static files from: ${distPath}`);
  
  // Check if assets directory exists and verify the logo file
  const assetsPath = path.resolve(distPath, "assets");
  const logoPath = path.resolve(assetsPath, "1_1759538885721.png");
  
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    log(`Assets directory found with ${files.length} files: ${files.slice(0, 5).join(", ")}${files.length > 5 ? "..." : ""}`);
    
    // Verify logo file specifically
    if (fs.existsSync(logoPath)) {
      const stats = fs.statSync(logoPath);
      log(`✅ Logo file found: ${logoPath} (${stats.size} bytes)`);
    } else {
      log(`⚠️ Logo file NOT found at: ${logoPath}`);
    }
  } else {
    log(`⚠️ Assets directory not found at: ${assetsPath}`);
  }

  // Serve static files with proper MIME types
  // Use express.static with explicit MIME type configuration
  app.use(express.static(distPath, {
    redirect: false,
    maxAge: '1y', // Cache for 1 year
    setHeaders: (res, filePath, stat) => {
      // Log when serving assets for debugging
      if (filePath && filePath.includes && filePath.includes('assets')) {
        const size = stat?.size || 0;
        log(`Serving asset: ${filePath} (${size} bytes)`);
      }
      
      // Set correct MIME types for images and other assets
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      }
      
      // Cache control for static assets
      if (filePath.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      
      // Ensure proper headers for images
      if (filePath.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
        res.setHeader('Accept-Ranges', 'bytes');
      }
    },
  }));

  // Catch-all route for SPA - must come AFTER static file serving
  // This should only catch routes that don't match static files or API routes
  app.get("*", (req, res, next) => {
    // Never catch API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    // Never catch asset requests - express.static handles these, and if not found, return 404
    if (req.path.startsWith("/assets") || req.path.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/)) {
      return next(); // Let it 404 if not found
    }
    // For all other routes, serve index.html (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
