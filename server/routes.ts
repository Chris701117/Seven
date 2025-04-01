import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertPageSchema, insertUserSchema } from "@shared/schema";
import session from "express-session";
import { WebSocketServer } from "ws";
import { z } from "zod";

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
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws',
      perMessageDeflate: false // Disable per-message deflate to avoid issues
    });
    
    wss.on("connection", (ws) => {
      console.log("WebSocket client connected");
      
      ws.on("error", (error) => {
        console.error("WebSocket client error:", error);
      });
      
      ws.on("message", (message) => {
        try {
          // Echo back for now, implement real-time updates later
          ws.send(JSON.stringify({ message: "Received" }));
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({ connected: true }));
    });
    
    wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
    
    console.log("WebSocket server initialized");
  } catch (error) {
    console.error("Failed to initialize WebSocket server:", error);
  }

  return httpServer;
}
