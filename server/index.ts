import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Facebook 相關常量定義
export const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "958057036410330"; // 設置預設值為用戶提供的 ID
export const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
export const USE_FIXED_2FA_SECRET = true; // 使用固定的二步驗證密鑰
export const FIXED_2FA_SECRET = "JBSWY3DPEHPK3PXP"; // 預設固定的二步驗證密鑰，只用於測試環境

const app = express();

// 確保了Express能適當解析請求體
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 添加調試中間件，顯示請求體和響應類型
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    // 記錄發送的響應內容類型
    console.log(`響應類型: ${res.getHeader('Content-Type')}`);
    
    // 如果是POST請求，記錄請求體（但不記錄敏感數據）
    if (req.method === 'POST' && req.path.includes('/api/')) {
      const safeBody = { ...req.body };
      // 移除敏感數據
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.accessToken) safeBody.accessToken = '[TOKEN]';
      
      console.log(`請求體 (${req.path}):`, JSON.stringify(safeBody).substring(0, 100) + '...');
    }
    
    return originalSend.call(this, body);
  };
  next();
});

// CORS 設置 - 允許所有來源，但確保 credentials 適當工作
app.use(cors({
  origin: true, // 允許所有來源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type']
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
  try {
    // 最簡單的方式：直接使用 res.json
    res.json({ 
      appId: process.env.FACEBOOK_APP_ID || '' 
    });
    
    // 打印日誌以便調試
    console.log('成功發送 Facebook 配置 API 響應');
  } catch (error) {
    console.error('Facebook App ID 發送錯誤:', error);
    res.status(500).json({ error: 'Failed to get Facebook configuration' });
  }
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
    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`伺服器已啟動在 port ${port}`);
      const replUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      log(`您可以通過以下網址訪問應用: ${replUrl}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();
