// Reference: javascript_object_storage blueprint
import { Storage, File } from "@google-cloud/storage";
import type { Response } from "express";

export class ObjectNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStorageService {
  private storage: Storage;
  private bucketName: string;
  private publicSearchPaths: string[];
  private privateObjectDir: string;
  private isConfigured: boolean;

  constructor() {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    
    if (!bucketId) {
      console.warn("Object storage not configured - DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
      this.isConfigured = false;
      this.bucketName = "";
      this.publicSearchPaths = [];
      this.privateObjectDir = ".private";
      this.storage = new Storage();
    } else {
      this.isConfigured = true;
      this.storage = new Storage();
      this.bucketName = bucketId;
      this.publicSearchPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(",") || [];
      this.privateObjectDir = process.env.PRIVATE_OBJECT_DIR || ".private";
    }
  }
  
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error("Object storage is not configured");
    }
  }

  private getBucket() {
    return this.storage.bucket(this.bucketName);
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    this.ensureConfigured();
    for (const searchPath of this.publicSearchPaths) {
      const fullPath = `${searchPath}/${filePath}`.replace(/\/+/g, "/");
      const file = this.getBucket().file(fullPath);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    this.ensureConfigured();
    const normalizedPath = this.normalizeObjectEntityPath(objectPath);
    const file = this.getBucket().file(normalizedPath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new ObjectNotFoundError(`Object not found: ${objectPath}`);
    }
    
    return file;
  }

  normalizeObjectEntityPath(objectPath: string): string {
    let path = objectPath;
    if (path.startsWith("/objects/")) {
      path = path.substring("/objects/".length);
    }
    if (!path.startsWith(this.privateObjectDir)) {
      path = `${this.privateObjectDir}/${path}`;
    }
    return path;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    this.ensureConfigured();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filePath = `${this.privateObjectDir}/${fileName}`;
    const file = this.getBucket().file(filePath);
    
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: "audio/webm",
    });
    
    return url;
  }

  downloadObject(file: File, res: Response): void {
    const readStream = file.createReadStream();
    
    readStream.on("error", (error) => {
      console.error("Error streaming file:", error);
      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    });

    file.getMetadata().then(([metadata]) => {
      if (metadata.contentType) {
        res.setHeader("Content-Type", metadata.contentType);
      }
      readStream.pipe(res);
    }).catch((error) => {
      console.error("Error getting file metadata:", error);
      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    });
  }

  async uploadFromBuffer(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    this.ensureConfigured();
    const filePath = `${this.privateObjectDir}/${fileName}`;
    const file = this.getBucket().file(filePath);
    
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });
    
    return `/objects/${filePath.replace(`${this.privateObjectDir}/`, '')}`;
  }
}
