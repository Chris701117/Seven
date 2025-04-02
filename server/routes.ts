import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertPageSchema, insertUserSchema, type Post } from "@shared/schema";
import session from "express-session";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { upload, uploadFromUrl, deleteFile, getPublicIdFromUrl } from "./cloudinary";
import path from "path";

// WebSocket client tracking
interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

// WebSocket notification types
type NotificationType = 'reminder' | 'completion' | 'publishing';

interface Notification {
  type: NotificationType;
  post: Post;
  message: string;
  timestamp: string;
}

// Active connections
const clients: Map<number, ExtendedWebSocket[]> = new Map();

declare module "express-session" {
  interface SessionData {
    userId: number;
    instagramConnected?: boolean;
    threadsConnected?: boolean;
    tiktokConnected?: boolean;
    xConnected?: boolean;
  }
}

// Define notification functions at module scope
let sendNotification: (userId: number, notification: Notification) => void;
let sendReminderNotification: (post: Post) => Promise<boolean>;
let sendCompletionNotification: (post: Post) => Promise<boolean>;

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
    })
  );
  
  // Configuration routes - Facebook 配置
  app.get("/api/config/facebook", (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID || "";
    
    // 檢查 App ID 是否存在
    if (!appId) {
      console.warn("警告: FACEBOOK_APP_ID 環境變量未設置");
    }
    
    // 返回 App ID 和環境信息，幫助調試
    res.json({ 
      appId, 
      domain: req.get('host'), 
      environment: process.env.NODE_ENV || 'development',
      hasAppSecret: !!process.env.FACEBOOK_APP_SECRET
    });
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = await insertUserSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ message: "Login successful", userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = await insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      res.status(201).json({ message: "User registered successfully", userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Facebook auth routes
  app.post("/api/auth/facebook", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { accessToken, fbUserId } = req.body;
      
      if (!accessToken || !fbUserId) {
        return res.status(400).json({ message: "需要 Access Token 和 User ID" });
      }
      
      console.log('Facebook 連接嘗試 - 用戶:', req.session.userId);
      console.log('Facebook 連接嘗試 - FB 用戶ID:', fbUserId);
      console.log('Facebook 連接嘗試 - 令牌長度:', accessToken.length);
      
      // 檢查是否為開發模式
      const isDevelopmentMode = accessToken.startsWith('DEV_MODE_TOKEN_');
      
      // 處理開發模式連接
      if (isDevelopmentMode) {
        console.log('使用開發模式 Facebook 連接:', req.session.userId);
        
        try {
          // 使用一個假的但穩定的令牌，方便識別
          const devAccessToken = 'DEV_MODE_ACCESS_TOKEN_' + req.session.userId;
          const devFbUserId = 'DEV_MODE_USER_' + req.session.userId;
          
          // 檢查環境變數是否存在
          if (!process.env.FACEBOOK_APP_ID) {
            console.warn('警告: 在開發模式下使用，但環境變數 FACEBOOK_APP_ID 未設置');
          }
          
          const updatedUser = await storage.updateUserAccessToken(
            req.session.userId,
            devAccessToken,
            devFbUserId
          );
          
          // 創建或更新測試頁面（如果用戶尚未有任何頁面）
          const userPages = await storage.getPages(req.session.userId);
          if (userPages.length === 0) {
            // 創建一個測試頁面
            await storage.createPage({
              userId: req.session.userId,
              pageId: `dev_page_${req.session.userId}_1`,
              pageName: '測試粉絲專頁 1',
              accessToken: devAccessToken,
              pageImage: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
            });
            
            // 再創建一個測試頁面
            await storage.createPage({
              userId: req.session.userId,
              pageId: `dev_page_${req.session.userId}_2`,
              pageName: '測試粉絲專頁 2',
              accessToken: devAccessToken,
              pageImage: 'https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_fill/sample.jpg'
            });
            
            console.log('開發模式: 已創建測試頁面');
          }
          
          const { password, ...userWithoutPassword } = updatedUser;
          return res.json({ 
            message: "開發模式已啟用，使用模擬數據", 
            user: userWithoutPassword,
            devMode: true
          });
        } catch (devModeError) {
          console.error('開發模式處理錯誤:', devModeError);
          return res.status(500).json({ 
            message: "開發模式設置失敗", 
            error: devModeError instanceof Error ? devModeError.message : "未知錯誤",
            devMode: false
          });
        }
      }
      
      // 正常 Facebook 連接處理
      try {
        console.log('正在處理真實 Facebook 連接...');
        
        // 檢查 FACEBOOK_APP_ID 和 FACEBOOK_APP_SECRET 是否存在
        if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
          console.error('錯誤: 缺少必要的 Facebook API 密鑰');
          return res.status(500).json({
            message: "Facebook 連接錯誤: 伺服器缺少必要的 API 密鑰配置",
            missingKeys: !process.env.FACEBOOK_APP_ID ? 'FACEBOOK_APP_ID' : 'FACEBOOK_APP_SECRET'
          });
        }
        
        const updatedUser = await storage.updateUserAccessToken(
          req.session.userId,
          accessToken,
          fbUserId
        );
        
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json({ 
          message: "Facebook 憑證已更新", 
          user: userWithoutPassword
        });
      } catch (fbError) {
        console.error('真實 Facebook 連接錯誤:', fbError);
        return res.status(500).json({ 
          message: "Facebook 連接失敗", 
          error: fbError instanceof Error ? fbError.message : "未知錯誤"
        });
      }
    } catch (error) {
      console.error('Facebook auth error:', error);
      return res.status(500).json({ 
        message: "伺服器錯誤", 
        error: error instanceof Error ? error.message : "未知錯誤"
      });
    }
  });

  // Instagram連接API
  app.get("/api/auth/instagram/status", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 檢查用戶是否已經連接Instagram
    // 在實際實現中，應該檢查數據庫中存儲的Instagram令牌
    // 這裡使用會話簡化實現
    const connected = !!req.session.instagramConnected;
    res.json({ connected });
  });
  
  app.post("/api/auth/instagram", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { accessToken, devMode } = req.body;
      
      // 開發模式處理
      if (devMode || (accessToken && accessToken.startsWith("DEV_MODE_IG_TOKEN_"))) {
        console.log('使用開發模式 Instagram 連接:', req.session.userId);
        req.session.instagramConnected = true;
        
        return res.json({ 
          success: true, 
          message: "Instagram開發模式連接成功",
          devMode: true
        });
      }
      
      // 實際連接邏輯 - 使用Facebook Graph API獲取Instagram授權
      // 檢查是否已連接Facebook（Instagram Business帳號需要Facebook連接）
      const user = await storage.getUser(req.session.userId);
      if (!user?.accessToken) {
        return res.status(400).json({ 
          success: false, 
          message: "您需要先連接Facebook帳號才能連接Instagram" 
        });
      }
      
      // 在實際實現中，這裡應使用Facebook Graph API獲取Instagram帳號信息
      // 目前為了演示，假設連接成功
      req.session.instagramConnected = true;
      
      res.json({ success: true, message: "Instagram連接成功" });
    } catch (error) {
      console.error("Instagram連接錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "Instagram連接處理錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  app.post("/api/auth/instagram/disconnect", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 斷開Instagram連接
    req.session.instagramConnected = false;
    // 同時斷開Threads，因為Threads依賴Instagram
    req.session.threadsConnected = false;
    
    res.json({ success: true, message: "已斷開Instagram連接" });
  });

  // TikTok連接API
  app.get("/api/auth/tiktok/status", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 檢查用戶是否已經連接TikTok
    const connected = !!req.session.tiktokConnected;
    res.json({ connected });
  });
  
  app.post("/api/auth/tiktok", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { accessToken, devMode } = req.body;
      
      // 開發模式處理
      if (devMode || (accessToken && accessToken.startsWith("DEV_MODE_TIKTOK_TOKEN_"))) {
        console.log('使用開發模式 TikTok 連接:', req.session.userId);
        req.session.tiktokConnected = true;
        
        return res.json({ 
          success: true, 
          message: "TikTok開發模式連接成功",
          devMode: true
        });
      }
      
      // 實際TikTok連接邏輯
      // 在實際實現中，這裡應使用TikTok開放平台API
      // 目前為了演示，假設連接成功
      req.session.tiktokConnected = true;
      
      res.json({ success: true, message: "TikTok連接成功" });
    } catch (error) {
      console.error("TikTok連接錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "TikTok連接處理錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  app.post("/api/auth/tiktok/disconnect", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 斷開TikTok連接
    req.session.tiktokConnected = false;
    
    res.json({ success: true, message: "已斷開TikTok連接" });
  });

  // Threads連接API
  app.get("/api/auth/threads/status", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 檢查用戶是否已經連接Threads
    const connected = !!req.session.threadsConnected;
    res.json({ connected });
  });
  
  app.post("/api/auth/threads", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { accessToken, devMode } = req.body;
      
      // 開發模式處理
      if (devMode || (accessToken && accessToken.startsWith("DEV_MODE_THREADS_TOKEN_"))) {
        console.log('使用開發模式 Threads 連接:', req.session.userId);
        req.session.threadsConnected = true;
        
        return res.json({ 
          success: true, 
          message: "Threads開發模式連接成功",
          devMode: true
        });
      }
      
      // 檢查是否已連接Instagram（Threads依賴Instagram）
      if (!req.session.instagramConnected) {
        return res.status(400).json({ 
          success: false, 
          message: "您需要先連接Instagram帳號才能連接Threads" 
        });
      }
      
      // 實際連接邏輯 - 在實際實現中，這裡應使用Instagram/Meta Graph API
      // 目前為了演示，假設連接成功
      req.session.threadsConnected = true;
      
      res.json({ success: true, message: "Threads連接成功" });
    } catch (error) {
      console.error("Threads連接錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "Threads連接處理錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  app.post("/api/auth/threads/disconnect", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 斷開Threads連接
    req.session.threadsConnected = false;
    
    res.json({ success: true, message: "已斷開Threads連接" });
  });

  // X(Twitter)連接API
  app.get("/api/auth/x/status", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 檢查用戶是否已經連接X
    const connected = !!req.session.xConnected;
    res.json({ connected });
  });
  
  app.post("/api/auth/x", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { accessToken, devMode } = req.body;
      
      // 開發模式處理
      if (devMode || (accessToken && accessToken.startsWith("DEV_MODE_X_TOKEN_"))) {
        console.log('使用開發模式 X(Twitter) 連接:', req.session.userId);
        req.session.xConnected = true;
        
        return res.json({ 
          success: true, 
          message: "X(Twitter)開發模式連接成功",
          devMode: true
        });
      }
      
      // 實際X(Twitter)連接邏輯 - 在實際實現中，這裡應使用Twitter API
      // 目前為了演示，假設連接成功
      req.session.xConnected = true;
      
      res.json({ success: true, message: "X(Twitter)連接成功" });
    } catch (error) {
      console.error("X(Twitter)連接錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "X(Twitter)連接處理錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  app.post("/api/auth/x/disconnect", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    // 斷開X(Twitter)連接
    req.session.xConnected = false;
    
    res.json({ success: true, message: "已斷開X(Twitter)連接" });
  });

  // Pages routes
  app.get("/api/pages", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const pages = await storage.getPages(req.session.userId);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/pages", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const pageData = await insertPageSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      const page = await storage.createPage(pageData);
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/pages/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const page = await storage.getPageById(parseInt(req.params.id));
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete a page and all associated content
  app.delete("/api/pages/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const pageId = parseInt(req.params.id);
      const page = await storage.getPageById(pageId);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Delete the page
      const deleted = await storage.deletePage(pageId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete page" });
      }
      
      res.json({ message: "Page deleted successfully" });
    } catch (error) {
      console.error("Error deleting page:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Posts routes
  app.get("/api/pages/:pageId/posts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { pageId } = req.params;
      const { status } = req.query;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      let posts;
      if (status) {
        posts = await storage.getPostsByStatus(pageId, status as string);
      } else {
        posts = await storage.getPosts(pageId);
      }
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // File upload route for posts
  app.post("/api/upload", upload.single("media"), async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Cloudinary automatically uploads the file and returns the result
      const mediaUrl = (req.file as any).path || (req.file as Express.Multer.File).filename;
      
      // Determine if it's an image or video based on the mimetype
      const fileType = (req.file as Express.Multer.File).mimetype.startsWith("image/") 
        ? "image" 
        : "video";
      
      res.json({ 
        mediaUrl, 
        fileType,
        success: true 
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file", error: String(error) });
    }
  });
  
  // Upload media URL route (for external URLs)
  app.post("/api/upload-url", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Upload the image from URL to Cloudinary
      const mediaUrl = await uploadFromUrl(url);
      
      // Determine if it's an image or video based on the file extension
      const fileExtension = path.extname(url).toLowerCase();
      const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
      const fileType = videoExtensions.includes(fileExtension) ? "video" : "image";
      
      res.json({ 
        mediaUrl, 
        fileType,
        success: true 
      });
    } catch (error) {
      console.error("Upload URL error:", error);
      res.status(500).json({ message: "Failed to upload from URL", error: String(error) });
    }
  });
  
  app.post("/api/pages/:pageId/posts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { pageId } = req.params;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Parse basic post data
      const postData = await insertPostSchema.parse({
        ...req.body,
        pageId
      });
      
      // Calculate reminder time (1 day before scheduled time) if post is scheduled
      let reminderTime = null;
      if (postData.status === "scheduled" && postData.scheduledTime) {
        const scheduledDate = new Date(postData.scheduledTime);
        reminderTime = new Date(scheduledDate);
        reminderTime.setDate(scheduledDate.getDate() - 1); // Set to 1 day before
        // Set to the same time of day
        reminderTime.setHours(scheduledDate.getHours());
        reminderTime.setMinutes(scheduledDate.getMinutes());
        reminderTime.setSeconds(scheduledDate.getSeconds());
      }
      
      // Create post with reminder time
      const post = await storage.createPost({
        ...postData,
        reminderTime
      });
      
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Reminder and Post Completion routes
  
  // Get posts that need reminders - order is important, specific routes first
  app.get("/api/posts/reminders/pending", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const posts = await storage.getPostsNeedingReminders();
      // Filter posts to only include those from pages owned by the current user
      const userPosts = [];
      
      for (const post of posts) {
        const page = await storage.getPageByPageId(post.pageId);
        if (page && page.userId === req.session.userId) {
          userPosts.push(post);
        }
      }
      
      res.json(userPosts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get posts due for publishing
  app.get("/api/posts/due-for-publishing", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const posts = await storage.getPostsDueForPublishing();
      // Filter posts to only include those from pages owned by the current user
      const userPosts = [];
      
      for (const post of posts) {
        const page = await storage.getPageByPageId(post.pageId);
        if (page && page.userId === req.session.userId) {
          userPosts.push(post);
        }
      }
      
      res.json(userPosts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Mark reminder as sent
  app.post("/api/posts/:id/mark-reminder-sent", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedPost = await storage.markReminderSent(postId);
      
      // Send reminder notification via WebSocket if in the same request context
      if (sendReminderNotification && typeof sendReminderNotification === 'function') {
        try {
          await sendReminderNotification(updatedPost);
        } catch (wsError) {
          console.error("Failed to send WebSocket notification:", wsError);
          // Continue execution even if notification fails
        }
      }
      
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Mark post as completed
  app.post("/api/posts/:id/mark-completed", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedPost = await storage.markPostAsCompleted(postId);
      
      // Send completion notification via WebSocket if in the same request context
      if (sendCompletionNotification && typeof sendCompletionNotification === 'function') {
        try {
          await sendCompletionNotification(updatedPost);
        } catch (wsError) {
          console.error("Failed to send WebSocket notification:", wsError);
          // Continue execution even if notification fails
        }
      }
      
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // 一鍵多平台發布
  app.post("/api/posts/:id/publish-all", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "貼文未找到" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "未授權" });
      }
      
      // 檢查平台連接狀態
      const platformsStatus = {
        fb: true, // Facebook本身就是必須連接的
        ig: !!req.session.instagramConnected,
        tiktok: !!req.session.tiktokConnected,
        threads: !!req.session.threadsConnected,
        x: !!req.session.xConnected
      };
      
      // 執行一鍵發布
      const updatedPost = await storage.publishToAllPlatforms(postId);
      
      // 發送WebSocket通知
      if (sendCompletionNotification && typeof sendCompletionNotification === 'function') {
        try {
          await sendCompletionNotification(updatedPost);
        } catch (wsError) {
          console.error("發送WebSocket通知失敗:", wsError);
        }
      }
      
      res.json({
        success: true,
        message: "貼文已發布到所有已連接平台",
        post: updatedPost,
        platforms: platformsStatus
      });
    } catch (error) {
      console.error("一鍵發布錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "發布失敗",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const post = await storage.getPostById(parseInt(req.params.id));
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // If the image URL changed, delete the old image from Cloudinary
      if (post.imageUrl && post.imageUrl !== req.body.imageUrl) {
        try {
          const publicId = getPublicIdFromUrl(post.imageUrl);
          if (publicId) {
            await deleteFile(publicId);
          }
        } catch (cloudinaryError) {
          console.error("Failed to delete old media from Cloudinary:", cloudinaryError);
          // Continue with post update even if old media deletion fails
        }
      }
      
      // Calculate new reminder time if scheduled time has changed
      let updateData = { ...req.body };
      
      if (
        // If this is a scheduled post
        (updateData.status === "scheduled" || 
        (post.status === "scheduled" && updateData.status === undefined)) && 
        // And has a scheduled time 
        (updateData.scheduledTime || post.scheduledTime)
      ) {
        // Get the current scheduled time if it exists
        const scheduledDate = new Date(updateData.scheduledTime || post.scheduledTime);
        
        // Set reminder time to 1 day before
        const reminderTime = new Date(scheduledDate);
        reminderTime.setDate(scheduledDate.getDate() - 1);
        // Keep the same time of day
        reminderTime.setHours(scheduledDate.getHours());
        reminderTime.setMinutes(scheduledDate.getMinutes());
        reminderTime.setSeconds(scheduledDate.getSeconds());
        
        // If the scheduled time has changed, we need to reset the reminder flag
        if (updateData.scheduledTime && 
            post.scheduledTime && 
            new Date(updateData.scheduledTime).getTime() !== new Date(post.scheduledTime).getTime()) {
          updateData.reminderSent = false;
        }
        
        // Add reminder time to the update data
        updateData.reminderTime = reminderTime;
      }
      
      const updatedPost = await storage.updatePost(postId, updateData);
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Delete image from Cloudinary if it exists
      if (post.imageUrl) {
        try {
          const publicId = getPublicIdFromUrl(post.imageUrl);
          if (publicId) {
            await deleteFile(publicId);
          }
        } catch (cloudinaryError) {
          console.error("Failed to delete media from Cloudinary:", cloudinaryError);
          // Continue with post deletion even if media deletion fails
        }
      }
      
      await storage.deletePost(postId);
      res.json({ message: "Post deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Analytics routes
  app.get("/api/pages/:pageId/analytics", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { pageId } = req.params;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const analytics = await storage.getPageAnalytics(pageId);
      if (!analytics) {
        return res.status(404).json({ message: "Analytics not found" });
      }
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/posts/:postId/analytics", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { postId } = req.params;
      
      const post = await storage.getPostByPostId(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const analytics = await storage.getPostAnalytics(postId);
      if (!analytics) {
        return res.status(404).json({ message: "Analytics not found" });
      }
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Facebook Graph API integration routes
  app.post("/api/pages/:pageId/sync", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { pageId } = req.params;
      const { source } = req.body;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "找不到頁面" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "未授權" });
      }
      
      // 在實際實現中，這裡會調用Facebook Graph API來獲取最新數據
      // 然後更新我們的數據庫
      
      // 模擬延遲，表示正在處理同步
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 更新頁面分析數據，增加一些隨機值以模擬數據變化
      let analytics = await storage.getPageAnalytics(pageId);
      if (!analytics) {
        // 如果不存在，則創建一個新的分析記錄
        analytics = await storage.createPageAnalytics({
          pageId,
          totalLikes: Math.floor(Math.random() * 500) + 100,
          totalComments: Math.floor(Math.random() * 200) + 50,
          totalShares: Math.floor(Math.random() * 100) + 20,
          pageViews: Math.floor(Math.random() * 1000) + 500,
          reachCount: Math.floor(Math.random() * 3000) + 1000,
          engagementRate: (Math.random() * 5 + 1).toFixed(2),
          demographicsData: JSON.stringify({
            ageGroups: {
              "18-24": Math.floor(Math.random() * 20) + 10,
              "25-34": Math.floor(Math.random() * 30) + 20,
              "35-44": Math.floor(Math.random() * 25) + 15,
              "45-54": Math.floor(Math.random() * 15) + 5,
              "55+": Math.floor(Math.random() * 10) + 5
            },
            gender: {
              male: Math.floor(Math.random() * 60) + 40,
              female: Math.floor(Math.random() * 60) + 40
            },
            locations: {
              "台北": Math.floor(Math.random() * 30) + 20,
              "高雄": Math.floor(Math.random() * 20) + 10,
              "台中": Math.floor(Math.random() * 15) + 5,
              "其他": Math.floor(Math.random() * 35) + 15
            }
          })
        });
      } else {
        // 更新現有的分析數據
        analytics = await storage.updatePageAnalytics(pageId, {
          totalLikes: analytics.totalLikes + Math.floor(Math.random() * 50) + 10,
          totalComments: analytics.totalComments + Math.floor(Math.random() * 20) + 5,
          totalShares: analytics.totalShares + Math.floor(Math.random() * 10) + 2,
          pageViews: analytics.pageViews + Math.floor(Math.random() * 100) + 50,
        });
      }
      
      // 也更新帖子的分析數據
      const posts = await storage.getPosts(pageId);
      for (const post of posts) {
        if (post.postId) {
          let postAnalytics = await storage.getPostAnalytics(post.postId);
          if (!postAnalytics) {
            await storage.createPostAnalytics({
              postId: post.postId,
              likes: Math.floor(Math.random() * 200) + 50,
              comments: Math.floor(Math.random() * 50) + 10,
              shares: Math.floor(Math.random() * 30) + 5,
              reach: Math.floor(Math.random() * 500) + 100,
              engagementRate: (Math.random() * 10 + 1).toFixed(2),
              clickCount: Math.floor(Math.random() * 50) + 10
            });
          } else {
            await storage.updatePostAnalytics(post.postId, {
              likes: postAnalytics.likes + Math.floor(Math.random() * 20) + 5,
              comments: postAnalytics.comments + Math.floor(Math.random() * 5) + 1,
              shares: postAnalytics.shares + Math.floor(Math.random() * 3) + 1,
            });
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: "同步成功",
        timestamp: new Date().toISOString(),
        source
      });
    } catch (error) {
      console.error("Facebook Graph API 同步錯誤:", error);
      res.status(500).json({ message: "伺服器錯誤", error: String(error) });
    }
  });
  
  app.get("/api/pages/:pageId/audience", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { pageId } = req.params;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "找不到頁面" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "未授權" });
      }
      
      const analytics = await storage.getPageAnalytics(pageId);
      if (!analytics) {
        return res.status(404).json({ message: "沒有可用的分析數據" });
      }
      
      // 解析存儲的人口統計數據
      let demographicsData = {};
      try {
        demographicsData = JSON.parse(analytics.demographicsData || "{}");
      } catch (e) {
        demographicsData = {};
      }
      
      res.json({
        ageGroups: demographicsData.ageGroups || {},
        gender: demographicsData.gender || {},
        locations: demographicsData.locations || {},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  app.get("/api/pages/:pageId/engagement-time", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { pageId } = req.params;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "找不到頁面" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "未授權" });
      }
      
      // 在實際實現中，這些數據會來自Facebook Graph API
      // 這裡我們返回模擬數據
      const weekdays = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
      const times = ["09:00", "12:00", "15:00", "18:00", "21:00"];
      
      const engagementData = weekdays.map(day => {
        const result: any = { day };
        times.forEach(time => {
          // 假設週末和晚上有更高的互動率
          let baseValue = 30;
          if (day === "週六" || day === "週日") {
            baseValue += 20;
          }
          if (time === "18:00" || time === "21:00") {
            baseValue += 15;
          }
          result[time] = baseValue + Math.floor(Math.random() * 30);
        });
        return result;
      });
      
      res.json({
        data: engagementData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  app.get("/api/posts/:postId/performance", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { postId } = req.params;
      
      const post = await storage.getPostByPostId(postId);
      if (!post) {
        return res.status(404).json({ message: "找不到貼文" });
      }
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        return res.status(403).json({ message: "未授權" });
      }
      
      const analytics = await storage.getPostAnalytics(postId);
      if (!analytics) {
        return res.status(404).json({ message: "沒有可用的分析數據" });
      }
      
      // 在實際實現中，這些數據會來自Facebook Graph API
      // 增加更多詳細的性能指標
      const hourlyData = [];
      const now = new Date();
      
      // 生成過去24小時的每小時數據
      for (let i = 0; i < 24; i++) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - 23 + i);
        
        // 確定基準值 - 假設發佈後快速增長，然後慢慢減少
        let factor = 1;
        if (i < 6) {
          factor = 2.5 - (i * 0.2); // 較高的初始互動
        } else {
          factor = 1 - ((i - 6) * 0.03); // 逐漸減少
        }
        
        if (factor < 0.1) factor = 0.1;
        
        hourlyData.push({
          hour: hour.toISOString(),
          likes: Math.round((analytics.likes / 24) * factor * (0.8 + Math.random() * 0.4)),
          comments: Math.round((analytics.comments / 24) * factor * (0.8 + Math.random() * 0.4)),
          shares: Math.round((analytics.shares / 24) * factor * (0.8 + Math.random() * 0.4)),
          reach: Math.round((analytics.reach / 24) * factor * (0.8 + Math.random() * 0.4))
        });
      }
      
      res.json({
        overall: {
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          reach: analytics.reach,
          engagementRate: analytics.engagementRate,
          clickCount: analytics.clickCount
        },
        hourlyData,
        demographics: {
          ageGroups: {
            "18-24": Math.floor(Math.random() * 30) + 10,
            "25-34": Math.floor(Math.random() * 40) + 20,
            "35-44": Math.floor(Math.random() * 20) + 10,
            "45+": Math.floor(Math.random() * 10) + 5
          },
          gender: {
            male: Math.floor(Math.random() * 60) + 40,
            female: Math.floor(Math.random() * 60) + 40
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  app.post("/api/pages/:pageId/sync/schedule", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { pageId } = req.params;
      const { frequency } = req.body;
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        return res.status(404).json({ message: "找不到頁面" });
      }
      
      if (page.userId !== req.session.userId) {
        return res.status(403).json({ message: "未授權" });
      }
      
      // 在實際實現中，我們會在數據庫中存儲同步設置，並創建一個定時任務
      // 這裡我們只返回成功響應
      res.json({ 
        success: true, 
        message: `已設置${frequency === 'daily' ? '每日' : '每週'}同步`,
        nextSync: new Date(Date.now() + (frequency === 'daily' ? 24 : 168) * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  // Facebook configuration API
  app.get("/api/config/facebook", (req, res) => {
    const domain = req.get('host') || "";
    
    // 檢查是否有 App ID 和 App Secret
    const appId = process.env.FACEBOOK_APP_ID;
    const hasAppSecret = !!process.env.FACEBOOK_APP_SECRET;

    res.json({
      appId,
      hasAppSecret,
      domain
    });
  });
  
  // Set up HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates with better error handling
  try {
    // Function to send notification to a user - assign to the module-scoped variable
    sendNotification = (userId: number, notification: Notification) => {
      const userClients = clients.get(userId);
      if (userClients && userClients.length > 0) {
        const message = JSON.stringify({ type: 'notification', data: notification });
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    };
    
    // Utility function to send a reminder notification - assign to the module-scoped variable
    sendReminderNotification = async (post: Post) => {
      try {
        const page = await storage.getPageByPageId(post.pageId);
        if (page) {
          const notification: Notification = {
            type: 'reminder',
            post,
            message: `提醒：您的貼文 "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}" 已排程在 ${post.scheduledTime ? new Date(post.scheduledTime).toLocaleString() : '即將'} 發布。`,
            timestamp: new Date().toISOString()
          };
          sendNotification(page.userId, notification);
          return true;
        }
      } catch (error) {
        console.error("發送提醒通知時出錯:", error);
      }
      return false;
    };
    
    // Utility function to send a completion notification - assign to the module-scoped variable
    sendCompletionNotification = async (post: Post) => {
      try {
        const page = await storage.getPageByPageId(post.pageId);
        if (page) {
          const notification: Notification = {
            type: 'completion',
            post,
            message: `完成：貼文 "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}" 已標記為完成。`,
            timestamp: new Date().toISOString()
          };
          sendNotification(page.userId, notification);
          return true;
        }
      } catch (error) {
        console.error("發送完成通知時出錯:", error);
      }
      return false;
    };
    
    // Setup intervals for checking posts that need reminders or are due for publishing
    const checkRemindersInterval = setInterval(async () => {
      try {
        const posts = await storage.getPostsNeedingReminders();
        for (const post of posts) {
          const notificationSent = await sendReminderNotification(post);
          if (notificationSent) {
            await storage.markReminderSent(post.id);
          }
        }
      } catch (error) {
        console.error("檢查提醒時出錯:", error);
      }
    }, 30000); // 每30秒檢查一次，以便在開發測試中更快看到效果
    
    // Setup WebSocket server
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws',
      perMessageDeflate: false // Disable per-message deflate to avoid issues
    });
    
    wss.on("connection", (ws: ExtendedWebSocket) => {
      console.log("WebSocket 客戶端已連接");
      ws.isAlive = true;
      
      // 為此客戶端設置 ping 間隔
      const pingInterval = setInterval(() => {
        if (ws.isAlive === false) {
          clearInterval(pingInterval);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      }, 30000);
      
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      
      ws.on("error", (error) => {
        console.error("WebSocket 客戶端錯誤:", error);
      });
      
      ws.on("close", () => {
        clearInterval(pingInterval);
        
        // 從客戶端映射中移除客戶端（如果存在）
        if (ws.userId) {
          const userClients = clients.get(ws.userId);
          if (userClients) {
            const index = userClients.indexOf(ws);
            if (index !== -1) {
              userClients.splice(index, 1);
            }
            
            // 如果此用戶沒有更多客戶端連接，則移除空數組
            if (userClients.length === 0) {
              clients.delete(ws.userId);
            }
          }
        }
      });
      
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'auth' && data.userId) {
            ws.userId = data.userId;
            
            // 儲存客戶端連接
            if (!clients.has(data.userId)) {
              clients.set(data.userId, []);
            }
            clients.get(data.userId)?.push(ws);
            
            // 發送確認訊息
            ws.send(JSON.stringify({ 
              type: 'auth',
              success: true,
              message: '認證成功'
            }));
            
            console.log(`用戶 ${data.userId} 的客戶端已認證`);
          }
        } catch (error) {
          console.error("WebSocket 訊息錯誤:", error);
          
          // 向客戶端發送錯誤
          ws.send(JSON.stringify({ 
            type: 'error',
            message: '無效的訊息格式'
          }));
        }
      });
      
      // 發送初始連接確認
      ws.send(JSON.stringify({ 
        type: 'connection',
        success: true,
        message: '已連接到 WebSocket 伺服器'
      }));
    });
    
    wss.on("error", (error) => {
      console.error("WebSocket 伺服器錯誤:", error);
    });
    
    // 確保在伺服器關閉時清理間隔
    httpServer.on('close', () => {
      clearInterval(checkRemindersInterval);
    });
    
    console.log("WebSocket 伺服器已初始化");
  } catch (error) {
    console.error("初始化 WebSocket 伺服器失敗:", error);
  }

  return httpServer;
}
