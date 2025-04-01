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
  
  // Configuration routes
  app.get("/api/config/facebook", (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID || "";
    res.json({ appId });
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
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { accessToken, fbUserId } = req.body;
      
      if (!accessToken || !fbUserId) {
        return res.status(400).json({ message: "Access token and user ID are required" });
      }
      
      const updatedUser = await storage.updateUserAccessToken(
        req.session.userId,
        accessToken,
        fbUserId
      );
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ message: "Facebook credentials updated", user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
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
        reminderTime,
        reminderSent: false
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
