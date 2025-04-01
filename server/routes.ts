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
      
      const postData = await insertPostSchema.parse({
        ...req.body,
        pageId
      });
      
      const post = await storage.createPost(postData);
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
      
      const updatedPost = await storage.updatePost(postId, req.body);
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

  // Set up HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates with better error handling
  try {
    // Function to send notification to a user
    const sendNotification = (userId: number, notification: Notification) => {
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
    
    // Utility function to send a reminder notification
    const sendReminderNotification = async (post: Post) => {
      try {
        const page = await storage.getPageByPageId(post.pageId);
        if (page) {
          const notification: Notification = {
            type: 'reminder',
            post,
            message: `Reminder: Your post "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}" is scheduled for publishing ${post.scheduledTime ? new Date(post.scheduledTime).toLocaleString() : 'soon'}.`,
            timestamp: new Date().toISOString()
          };
          sendNotification(page.userId, notification);
          return true;
        }
      } catch (error) {
        console.error("Error sending reminder notification:", error);
      }
      return false;
    };
    
    // Utility function to send a completion notification
    const sendCompletionNotification = async (post: Post) => {
      try {
        const page = await storage.getPageByPageId(post.pageId);
        if (page) {
          const notification: Notification = {
            type: 'completion',
            post,
            message: `Post "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}" has been marked as completed.`,
            timestamp: new Date().toISOString()
          };
          sendNotification(page.userId, notification);
          return true;
        }
      } catch (error) {
        console.error("Error sending completion notification:", error);
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
        console.error("Error checking reminders:", error);
      }
    }, 60000); // Check every minute in production
    
    // Setup WebSocket server
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws',
      perMessageDeflate: false // Disable per-message deflate to avoid issues
    });
    
    wss.on("connection", (ws: ExtendedWebSocket) => {
      console.log("WebSocket client connected");
      ws.isAlive = true;
      
      // Setup ping interval for this client
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
        console.error("WebSocket client error:", error);
      });
      
      ws.on("close", () => {
        clearInterval(pingInterval);
        
        // Remove client from clients map if it exists
        if (ws.userId) {
          const userClients = clients.get(ws.userId);
          if (userClients) {
            const index = userClients.indexOf(ws);
            if (index !== -1) {
              userClients.splice(index, 1);
            }
            
            // Remove the empty array if there are no more clients for this user
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
            
            // Store client connection
            if (!clients.has(data.userId)) {
              clients.set(data.userId, []);
            }
            clients.get(data.userId)?.push(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({ 
              type: 'auth',
              success: true,
              message: 'Authentication successful'
            }));
            
            console.log(`Client authenticated for user ${data.userId}`);
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
          
          // Send error back to client
          ws.send(JSON.stringify({ 
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({ 
        type: 'connection',
        success: true,
        message: 'Connected to WebSocket server'
      }));
    });
    
    wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
    
    // Make sure to clean up intervals on server shutdown
    httpServer.on('close', () => {
      clearInterval(checkRemindersInterval);
    });
    
    console.log("WebSocket server initialized");
  } catch (error) {
    console.error("Failed to initialize WebSocket server:", error);
  }

  return httpServer;
}
