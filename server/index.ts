import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Better CORS settings for Replit environment
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Parse origin to handle possible variations
    const hostname = new URL(origin).hostname;
    
    // Allow any Replit domains or localhost for development
    if (hostname.includes('.replit.app') || 
        hostname.includes('.repl.co') || 
        hostname === 'localhost' || 
        hostname === '127.0.0.1') {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins for flexibility during development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic request logging
app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Sample API endpoint to verify API works
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'API is working properly' });
});

// 提供 Facebook App ID 給前端使用
app.get('/api/config/facebook', (req, res) => {
  res.status(200).json({ 
    appId: process.env.FACEBOOK_APP_ID 
  });
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error occurred:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup Vite or serve static files
    if (app.get("env") === "development") {
      log('Using Vite development server');
      await setupVite(app, server);
    } else {
      log('Serving static files');
      serveStatic(app);
    }

    // Use port 5000 for Replit workflows or fallback to environment variable
    const port = 5000; // Replit workflows expect port 5000
    server.listen(port, "0.0.0.0", () => {
      log(`Server running on port ${port}`);
      log(`Access the application at: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();
