import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPostSchema, insertPageSchema, insertUserSchema, type Post,
  insertUserGroupSchema, type UserGroup, type UserGroupMembership,
  type User, Permission 
} from "@shared/schema";
import session from "express-session";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { upload, uploadFromUrl, deleteFile, getPublicIdFromUrl } from "./cloudinary";
import path from "path";
// 不再使用 bcrypt，改用明文密碼存储
// import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

// 測試環境固定的二步驗證密鑰
const FIXED_2FA_SECRET = 'FIXYQFUHJMCYDLWXEFNZCHXBPLHNTQGR';
// 設置在測試環境中是否使用固定密鑰
const USE_FIXED_2FA_SECRET = true;

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

// 生成隨機驗證碼的輔助函數
function generateRandomCode(length: number): string {
  const characters = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
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
    fbDevMode?: boolean;
  }
}

// Define notification functions at module scope
let sendNotification: (userId: number, notification: Notification) => void;
let sendReminderNotification: (post: Post) => Promise<boolean>;
let sendCompletionNotification: (post: Post) => Promise<boolean>;

// 登入驗證中間件
const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "未認證" });
  }
  next();
};

// 檢查權限中間件
const checkPermission = (requiredPermission: Permission) => {
  return async (req: Request, res: Response, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "用戶不存在" });
      }
      
      if (user.role === "ADMIN" || user.isAdminUser) {
        // 管理員擁有所有權限
        return next();
      }
      
      if (!user.groupId) {
        return res.status(403).json({ message: "沒有權限執行此操作" });
      }
      
      const userGroup = await storage.getUserGroupById(user.groupId);
      if (!userGroup) {
        return res.status(403).json({ message: "沒有權限執行此操作" });
      }
      
      // 檢查群組權限
      const permissions = userGroup.permissions as Permission[];
      if (!permissions || !permissions.includes(requiredPermission)) {
        return res.status(403).json({ message: "沒有權限執行此操作" });
      }
      
      next();
    } catch (error) {
      console.error("檢查權限時發生錯誤:", error);
      return res.status(500).json({ message: "伺服器錯誤" });
    }
  };
};

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
    const hasAppSecret = !!process.env.FACEBOOK_APP_SECRET;
    const domain = req.get('host') || '';
    const environment = process.env.NODE_ENV || 'development';
    
    // 檢查 App ID 是否存在
    if (!appId) {
      console.warn("警告: FACEBOOK_APP_ID 環境變量未設置");
    }
    
    // 檢查 App Secret 是否存在
    if (!hasAppSecret) {
      console.warn("警告: FACEBOOK_APP_SECRET 環境變量未設置");
    }
    
    // 檢查並輸出設置的環境變數
    console.log("Facebook 配置: ", {
      appId,
      hasAppSecret,
      domain,
      environment
    });
    
    // 返回完整的配置信息
    const response = { 
      appId, 
      domain, 
      environment,
      hasAppSecret
    };
    
    console.log("返回的Facebook配置內容:", response);
    res.status(200).json(response);
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      // 只需要用戶名和密碼的基本驗證
      const loginSchema = z.object({
        username: z.string().min(1, "請輸入用戶名"),
        password: z.string().min(1, "請輸入密碼"),
      });
      
      const { username, password } = await loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);

      // 檢查用戶是否存在及密碼是否正確
      if (!user) {
        return res.status(401).json({ message: "用戶名或密碼不正確" });
      }
      
      // 直接比較密碼
      if (password !== user.password) {
        return res.status(401).json({ message: "用戶名或密碼不正確" });
      }

      // 檢查是否已設置二步驗證
      if (!user.twoFactorSecret) {
        // 如果用戶還沒有設置二步驗證，引導用戶設置
        // 生成或使用固定的二步驗證密鑰
        const secret = USE_FIXED_2FA_SECRET ? FIXED_2FA_SECRET : authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.username, "社群媒體管理系統", secret);
        
        // 生成 QR Code
        const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
        
        // 更新用戶的二步驗證信息，但還未啟用
        await storage.setTwoFactorSecret(user.id, secret);
        
        // 返回設置信息，要求用戶完成二步驗證設置
        return res.json({ 
          requireTwoFactorSetup: true, 
          userId: user.id,
          secret: secret,
          qrCode: qrCodeDataUrl,
          message: "需要設置二步驗證" 
        });
      }
      
      // 如果已設置二步驗證，則需要驗證碼
      // 生成一個一次性驗證碼，有效期10分鐘
      const authCode = generateRandomCode(6);
      await storage.createAuthCode({
        userId: user.id,
        code: authCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10分鐘後過期
      });
      
      // 僅進行第一階段驗證，返回特定標記和用戶ID
      return res.json({ 
        requireTwoFactor: true, 
        userId: user.id,
        message: "需要二步驗證" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = await insertUserSchema.parse(req.body);
      
      // 檢查用戶是否已存在
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "用戶名已被使用" });
      }
      
      // 創建用戶（直接使用明文密碼）
      const user = await storage.createUser(userData);
      
      req.session.userId = user.id;
      res.status(201).json({ message: "註冊成功", userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "找不到用戶" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "登出失敗" });
      }
      res.json({ message: "登出成功" });
    });
  });

  // 首次登入時的二步驗證設置API
  app.post("/api/auth/setup-2fa", async (req, res) => {
    try {
      const verifySchema = z.object({
        userId: z.number(),
        code: z.string().length(6)
      });
      
      const { userId, code } = await verifySchema.parse(req.body);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      if (!user.twoFactorSecret) {
        return res.status(400).json({ message: "請先初始化二步驗證" });
      }
      
      if (user.isTwoFactorEnabled) {
        return res.status(400).json({ message: "二步驗證已經啟用" });
      }
      
      // 驗證 TOTP 代碼
      const isValid = authenticator.verify({ 
        token: code, 
        secret: user.twoFactorSecret 
      });
      
      if (!isValid) {
        return res.status(401).json({ message: "驗證碼無效" });
      }
      
      // 驗證成功，啟用二步驗證
      const updatedUser = await storage.enableTwoFactor(user.id);
      
      // 設置用戶會話
      req.session.userId = userId;
      
      // 更新最後登入時間
      await storage.updateUser(userId, { lastLoginAt: new Date() });
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ 
        success: true, 
        message: "二步驗證設置成功並已登入",
        user: userWithoutPassword
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("設置二步驗證錯誤:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  // 二步驗證API
  app.post("/api/auth/verify-2fa", async (req, res) => {
    try {
      const verifySchema = z.object({
        userId: z.number(),
        code: z.string().length(6)
      });
      
      const { userId, code } = await verifySchema.parse(req.body);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "此用戶未啟用二步驗證" });
      }
      
      // 檢查是否有儲存的驗證碼
      const authCode = await storage.getAuthCodeByUserIdAndCode(userId, code);
      
      let isValid = false;
      
      // 先檢查儲存的一次性驗證碼
      if (authCode && !authCode.isUsed && new Date() <= authCode.expiresAt) {
        isValid = true;
        // 標記驗證碼為已使用
        await storage.markAuthCodeAsUsed(authCode.id);
      } 
      // 如果沒有儲存的驗證碼或驗證失敗，則檢查是否為 TOTP (Google Authenticator)
      else if (user.twoFactorSecret) {
        // 驗證 TOTP 代碼
        isValid = authenticator.verify({ 
          token: code, 
          secret: user.twoFactorSecret 
        });
      }
      
      if (!isValid) {
        return res.status(401).json({ message: "驗證碼無效或已過期" });
      }
      
      // 驗證成功，設置會話
      req.session.userId = userId;
      
      // 更新最後登入時間
      await storage.updateUser(userId, { lastLoginAt: new Date() });
      
      res.json({ message: "驗證成功", userId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("二步驗證錯誤:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 啟用二步驗證
  app.post("/api/user/enable-2fa", requireLogin, async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "未認證" });
      }
      
      // 獲取用戶資料
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      // 如果已經啟用了，返回錯誤
      if (user.isTwoFactorEnabled) {
        return res.status(400).json({ message: "二步驗證已經啟用" });
      }
      
      // 生成或使用固定的 TOTP 密鑰
      const secret = USE_FIXED_2FA_SECRET ? FIXED_2FA_SECRET : authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.username, "社群媒體管理系統", secret);
      
      // 生成 QR Code
      const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
      
      // 更新用戶的二步驗證信息
      const updatedUser = await storage.setTwoFactorSecret(req.session.userId, secret);
      
      // 返回設置信息（但尚未啟用）
      res.json({ 
        success: true, 
        qrCode: qrCodeDataUrl,
        secret: secret, // 僅在初始化時發送一次
        message: "請掃描 QR 碼並驗證以啟用二步驗證"
      });
    } catch (error) {
      console.error("啟用二步驗證錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "啟用二步驗證失敗", 
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  // 驗證並完成二步驗證啟用
  app.post("/api/user/verify-2fa-setup", requireLogin, async (req, res) => {
    try {
      const verifySchema = z.object({
        code: z.string().length(6)
      });
      
      const { code } = await verifySchema.parse(req.body);
      
      // 確保 userId 存在
      if (!req.session.userId) {
        return res.status(401).json({ message: "未認證" });
      }
      
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      if (!user.twoFactorSecret) {
        return res.status(400).json({ message: "請先初始化二步驗證" });
      }
      
      if (user.isTwoFactorEnabled) {
        return res.status(400).json({ message: "二步驗證已經啟用" });
      }
      
      // 驗證 TOTP 代碼
      const isValid = authenticator.verify({ 
        token: code, 
        secret: user.twoFactorSecret 
      });
      
      if (!isValid) {
        return res.status(401).json({ message: "驗證碼無效" });
      }
      
      // 驗證成功，啟用二步驗證
      const updatedUser = await storage.enableTwoFactor(user.id);
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ 
        success: true, 
        message: "二步驗證已成功啟用",
        user: userWithoutPassword
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("驗證二步驗證設置錯誤:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 禁用二步驗證
  app.post("/api/user/disable-2fa", requireLogin, async (req, res) => {
    try {
      // 確保 userId 存在
      if (!req.session.userId) {
        return res.status(401).json({ message: "未認證" });
      }
      
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      if (!user.isTwoFactorEnabled) {
        return res.status(400).json({ message: "二步驗證尚未啟用" });
      }
      
      // 禁用二步驗證
      const updatedUser = await storage.disableTwoFactor(user.id);
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ 
        success: true, 
        message: "二步驗證已禁用",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("禁用二步驗證錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "禁用二步驗證失敗", 
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 驗證管理員密碼 - 用於敏感操作確認
  app.post("/api/verify-admin", requireLogin, async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "密碼不能為空" });
      }

      // 確保 userId 存在
      if (!req.session.userId) {
        return res.status(401).json({ message: "未認證" });
      }
      
      const currentUser = await storage.getUser(req.session.userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      // 檢查用戶是否為管理員
      const isAdmin = currentUser.isAdminUser;
      if (!isAdmin) {
        return res.status(403).json({ message: "只有管理員可以執行此操作" });
      }
      
      // 驗證密碼
      const passwordValid = await storage.verifyUserPassword(currentUser.id, password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: "管理員密碼不正確" });
      }
      
      return res.status(200).json({ message: "管理員身份驗證成功" });
    } catch (error) {
      console.error("驗證管理員密碼時出錯:", error);
      return res.status(500).json({ message: "服務器錯誤" });
    }
  });

  // 測試API端點 - 沒有任何敏感操作，純粹用於檢查API可達性
  app.get("/api/test", (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ 
      status: 'success', 
      message: 'API 伺服器運行正常', 
      timestamp: new Date().toISOString() 
    });
  });
  
  // 創建測試頁面API
  app.post("/api/facebook/create-test-page", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      // 檢查用戶是否已連接Facebook（或處於開發模式）
      const user = await storage.getUser(req.session.userId);
      // 使用默認值false，防止潛在的undefined錯誤
      const fbConnected = !!user?.accessToken || req.session.fbDevMode === true;
      
      if (!fbConnected) {
        return res.status(400).json({ 
          success: false, 
          message: "您需要先連接Facebook帳戶才能創建測試頁面" 
        });
      }
      
      // 創建測試頁面 (使用預設名稱或用戶提供的名稱)
      const pageName = req.body.pageName || "測試粉絲專頁";
      const pageDescription = req.body.pageDescription || "這是一個測試用粉絲專頁。";
      
      // 生成一個唯一的pageId
      const pageId = `page_test_${Date.now()}`;
      
      // 創建頁面
      const newPage = await storage.createPage({
        pageId,
        userId: req.session.userId,
        pageName: pageName,
        accessToken: `TEST_PAGE_TOKEN_${Date.now()}`,
        picture: "https://via.placeholder.com/150"  // 使用正確的字段名 picture 而不是 pageImage
      });
      
      // 返回成功訊息與新頁面資訊
      res.json({ 
        success: true, 
        message: `測試頁面 "${pageName}" 創建成功！`,
        page: newPage
      });
    } catch (error) {
      console.error("創建測試頁面錯誤:", error);
      res.status(500).json({ 
        success: false, 
        message: "創建測試頁面時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // Facebook auth routes
  
  // 檢查Token狀態
  app.get("/api/auth/facebook/token-status", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      // 獲取用戶
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在", valid: false });
      }
      
      // 檢查是否為開發模式
      if (req.session.fbDevMode) {
        return res.json({ valid: true, devMode: true });
      }
      
      // 檢查是否有Token
      if (!user.accessToken) {
        return res.json({ valid: false, message: "未找到Facebook Access Token" });
      }
      
      // 檢查Token是否過期
      // 在實際應用中，可能需要調用Facebook API驗證Token,
      // 這裡簡單示例通過檢查用戶Token的更新時間來判斷
      const tokenAge = Date.now() - (user.updatedAt ? new Date(user.updatedAt).getTime() : 0);
      const tokenValid = tokenAge < 24 * 60 * 60 * 1000; // 24小時內的Token視為有效
      
      if (tokenValid) {
        return res.json({ valid: true });
      } else {
        return res.json({ 
          valid: false, 
          message: "Token可能已過期", 
          tokenAge: Math.floor(tokenAge / (60 * 60 * 1000)) + "小時" 
        });
      }
    } catch (error) {
      console.error('檢查Facebook Token狀態錯誤:', error);
      return res.status(500).json({ 
        valid: false, 
        message: "檢查Token狀態出錯", 
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  // 刷新Facebook Token
  app.post("/api/auth/facebook/refresh-token", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      // 獲取用戶
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      // 檢查是否為開發模式
      if (req.session.fbDevMode) {
        return res.json({ success: true, message: "開發模式：模擬刷新Token成功", devMode: true });
      }
      
      // 檢查是否有Token和Facebook用戶ID
      if (!user.accessToken || !user.fbUserId) {
        return res.status(400).json({ message: "缺少Facebook憑證，請重新連接Facebook帳號" });
      }
      
      // 以下為刷新Token的邏輯
      // 在實際應用中，應該使用FB.getLoginStatus或通過Graph API
      // 由於目前的實現限制，我們只是基於現有的令牌生成一個新的令牌
      
      // 獲取Facebook App設置
      if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
        return res.status(500).json({ message: "伺服器缺少Facebook API密鑰設置" });
      }
      
      // 在實際情況下，我們應該向Facebook請求一個新的Token
      // 這裡只是簡單更新Token的時間戳來模擬刷新
      const refreshedUser = await storage.updateUserAccessToken(
        user.id,
        user.accessToken, // 實際情況下這應該是新獲取的Token
        user.fbUserId
      );
      
      const { password, ...userWithoutPassword } = refreshedUser;
      return res.json({ 
        success: true, 
        message: "Facebook Token已刷新",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('刷新Facebook Token錯誤:', error);
      return res.status(500).json({ 
        success: false, 
        message: "刷新Token失敗", 
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  app.post("/api/auth/facebook", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { accessToken, fbUserId, devMode } = req.body;
      
      if (!accessToken || !fbUserId) {
        return res.status(400).json({ message: "需要 Access Token 和 User ID" });
      }
      
      console.log('Facebook 連接嘗試 - 用戶:', req.session.userId);
      console.log('Facebook 連接嘗試 - FB 用戶ID:', fbUserId);
      console.log('Facebook 連接嘗試 - 令牌長度:', accessToken.length);
      console.log('Facebook 連接嘗試 - 開發模式標誌:', devMode ? 'true' : 'false');
      
      // 檢查是否為開發模式 - 優先檢查明確的devMode標誌
      const isDevelopmentMode = devMode === true || accessToken.startsWith('DEV_MODE_TOKEN_');
      
      // 設置開發模式標記到session
      if (isDevelopmentMode) {
        req.session.fbDevMode = true;
      }
      
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
              picture: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
            });
            
            // 再創建一個測試頁面
            await storage.createPage({
              userId: req.session.userId,
              pageId: `dev_page_${req.session.userId}_2`,
              pageName: '測試粉絲專頁 2',
              accessToken: devAccessToken,
              picture: 'https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_fill/sample.jpg'
            });
            
            console.log('開發模式: 已創建測試頁面');
          }
          
          const { password, ...userWithoutPassword } = updatedUser;
          
          // 明確設置回應標頭
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          
          // 使用 JSON.stringify 確保正確編碼
          const responseData = {
            message: "開發模式已啟用，使用模擬數據", 
            user: userWithoutPassword,
            devMode: true
          };
          
          console.log('返回開發模式回應:', JSON.stringify(responseData).substring(0, 100) + '...');
          return res.status(200).send(JSON.stringify(responseData));
        } catch (devModeError) {
          console.error('開發模式處理錯誤:', devModeError);
          
          // 明確設置回應標頭
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          
          // 使用 JSON.stringify 確保正確編碼
          const errorResponse = { 
            message: "開發模式設置失敗", 
            error: devModeError instanceof Error ? devModeError.message : "未知錯誤",
            devMode: false
          };
          
          return res.status(500).send(JSON.stringify(errorResponse));
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
      const { status, all } = req.query;
      
      console.log(`獲取貼文請求: 頁面ID=${pageId}, 狀態=${status || 'all'}, 全部請求=${all || false}`);
      
      const page = await storage.getPageByPageId(pageId);
      if (!page) {
        console.log(`找不到頁面: ${pageId}`);
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        console.log(`頁面權限不足: 頁面用戶ID=${page.userId}, 當前用戶ID=${req.session.userId}`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      let posts;
      if (all === 'true') {
        // 獲取所有狀態的貼文，包括草稿、排程、已發布和發布失敗
        const publishedPosts = await storage.getPostsByStatus(pageId, 'published');
        const scheduledPosts = await storage.getPostsByStatus(pageId, 'scheduled');
        const draftPosts = await storage.getPostsByStatus(pageId, 'draft');
        const failedPosts = await storage.getPostsByStatus(pageId, 'publish_failed');
        
        console.log(`獲取全部貼文數量: 已發布=${publishedPosts.length}, 排程中=${scheduledPosts.length}, 草稿=${draftPosts.length}, 發布失敗=${failedPosts.length}`);
        
        posts = [...publishedPosts, ...scheduledPosts, ...draftPosts, ...failedPosts];
      } else if (status) {
        posts = await storage.getPostsByStatus(pageId, status as string);
        console.log(`獲取指定狀態(${status})貼文數量: ${posts.length}`);
      } else {
        posts = await storage.getPosts(pageId);
        console.log(`獲取所有未刪除貼文數量: ${posts.length}`);
      }
      
      res.json(posts);
    } catch (error) {
      console.error('獲取貼文錯誤:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // 獲取已刪除的貼文
  app.get("/api/pages/:pageId/deleted-posts", async (req, res) => {
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
      
      const deletedPosts = await storage.getDeletedPosts(pageId);
      res.json(deletedPosts);
    } catch (error) {
      console.error("獲取已刪除貼文錯誤:", error);
      res.status(500).json({ message: "獲取已刪除貼文時發生錯誤" });
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
    console.log(`[DEBUG] 收到發布貼文請求，貼文ID: ${req.params.id}`);
    
    if (!req.session.userId) {
      console.log(`[ERROR] 未認證請求: 用戶未登入`);
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      console.log(`[DEBUG] 嘗試獲取貼文 ID: ${postId}`);
      
      const post = await storage.getPostById(postId);
      
      if (!post) {
        console.log(`[ERROR] 找不到貼文 ID: ${postId}`);
        return res.status(404).json({ message: "貼文未找到" });
      }
      
      console.log(`[DEBUG] 找到貼文：狀態=${post.status}, 頁面ID=${post.pageId}`);
      
      
      const page = await storage.getPageByPageId(post.pageId);
      if (!page) {
        console.log(`[ERROR] 找不到頁面 ID: ${post.pageId}`);
        return res.status(404).json({ message: "找不到頁面" });
      }
      
      if (page.userId !== req.session.userId) {
        console.log(`[ERROR] 用戶沒有權限: 頁面用戶ID=${page.userId}, 當前用戶ID=${req.session.userId}`);
        return res.status(403).json({ message: "未授權" });
      }
      
      console.log(`[DEBUG] 找到頁面: ${page.pageName || page.name}, 開發模式: ${page.devMode || false}`);
      
      // 檢查是否為開發模式
      if (req.session.fbDevMode) {
        console.log('[DEBUG] 使用開發模式：跳過Token檢查，繼續發布');
      } else {
        // 檢查用戶
        const user = await storage.getUser(req.session.userId);
        if (!user || !user.accessToken) {
          return res.status(400).json({ 
            success: false, 
            message: "缺少Facebook授權，請重新連接Facebook帳號" 
          });
        }
        
        // 檢查Token是否有效（通過時間檢查）
        const tokenAge = Date.now() - (user.updatedAt ? new Date(user.updatedAt).getTime() : 0);
        const tokenValid = tokenAge < 24 * 60 * 60 * 1000; // 24小時內的Token視為有效
        
        if (!tokenValid) {
          console.log(`發布前刷新用戶 ${req.session.userId} 的 Facebook Token`);
          
          // 在實際情況下，這裡應該向Facebook請求新的Token
          // 現在我們只是更新Token時間戳來模擬刷新
          await storage.updateUserAccessToken(
            user.id,
            user.accessToken || '',
            user.fbUserId || ''
          );
          
          console.log('Token刷新完成，繼續發布流程');
        }
      }
      
      // 檢查平台連接狀態
      const platformsStatus = {
        fb: true, // Facebook本身就是必須連接的
        ig: !!req.session.instagramConnected,
        tiktok: !!req.session.tiktokConnected,
        threads: !!req.session.threadsConnected,
        x: !!req.session.xConnected
      };
      
      console.log(`[DEBUG] 平台連接狀態：FB=${platformsStatus.fb}, IG=${platformsStatus.ig}, TikTok=${platformsStatus.tiktok}, Threads=${platformsStatus.threads}, X=${platformsStatus.x}`);
      
      console.log(`[DEBUG] 開始執行一鍵發布，貼文ID=${postId}`);
      
      // 執行一鍵發布
      const updatedPost = await storage.publishToAllPlatforms(postId);
      
      console.log(`[DEBUG] 發布完成後的貼文狀態：${updatedPost.status}`);
      console.log(`[DEBUG] 平台發布狀態：`, updatedPost.platformStatus);
      
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
      
      // 軟刪除 - 不實際刪除圖片，只標記為已刪除
      const deleted = await storage.deletePost(postId);
      if (!deleted) {
        return res.status(500).json({ message: "刪除貼文時發生錯誤" });
      }

      res.json({ message: "Post deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // 還原被刪除的貼文
  app.post("/api/posts/:id/restore", async (req, res) => {
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
      
      if (!post.isDeleted) {
        return res.status(400).json({ message: "This post is not deleted" });
      }
      
      const restoredPost = await storage.restorePost(postId);
      res.json({ message: "Post restored successfully", post: restoredPost });
    } catch (error) {
      console.error("還原貼文錯誤:", error);
      res.status(500).json({ message: "還原貼文時發生錯誤" });
    }
  });
  
  // 永久刪除貼文
  app.delete("/api/posts/:id/permanent", async (req, res) => {
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
      
      // 刪除 Cloudinary 圖片 (如果存在)
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
      
      // 永久刪除
      const deleted = await storage.permanentlyDeletePost(postId);
      if (!deleted) {
        return res.status(500).json({ message: "永久刪除貼文時發生錯誤" });
      }
      
      res.json({ message: "Post permanently deleted" });
    } catch (error) {
      console.error("永久刪除貼文錯誤:", error);
      res.status(500).json({ message: "永久刪除貼文時發生錯誤" });
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

  // 行銷模組 API 路由
  // 獲取所有行銷任務
  app.get("/api/marketing-tasks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const tasks = await storage.getMarketingTasks();
      res.json(tasks);
    } catch (error) {
      console.error("獲取行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 根據 ID 獲取行銷任務
  app.get("/api/marketing-tasks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getMarketingTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "任務未找到" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("獲取行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 創建行銷任務
  app.post("/api/marketing-tasks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const newTask = req.body;
      const task = await storage.createMarketingTask(newTask);
      res.status(201).json(task);
    } catch (error) {
      console.error("創建行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 更新行銷任務
  app.patch("/api/marketing-tasks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const taskData = req.body;
      
      const task = await storage.getMarketingTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "任務未找到" });
      }
      
      const updatedTask = await storage.updateMarketingTask(taskId, taskData);
      res.json(updatedTask);
    } catch (error) {
      console.error("更新行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 刪除行銷任務
  app.delete("/api/marketing-tasks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      
      const task = await storage.getMarketingTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "任務未找到" });
      }
      
      const result = await storage.deleteMarketingTask(taskId);
      
      if (result) {
        res.status(200).json({ message: "任務已刪除" });
      } else {
        res.status(500).json({ message: "刪除任務失敗" });
      }
    } catch (error) {
      console.error("刪除行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 根據狀態獲取行銷任務
  app.get("/api/marketing-tasks/status/:status", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const status = req.params.status;
      const tasks = await storage.getMarketingTasksByStatus(status);
      res.json(tasks);
    } catch (error) {
      console.error("獲取行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 根據類別獲取行銷任務
  app.get("/api/marketing-tasks/category/:category", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const category = req.params.category;
      const tasks = await storage.getMarketingTasksByCategory(category);
      res.json(tasks);
    } catch (error) {
      console.error("獲取行銷任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 營運模組 API 路由
  // 獲取所有營運任務
  app.get("/api/operation/tasks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const tasks = await storage.getOperationTasks();
      res.json(tasks);
    } catch (error) {
      console.error("獲取營運任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 根據 ID 獲取營運任務
  app.get("/api/operation/tasks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getOperationTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "任務未找到" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("獲取營運任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 創建營運任務
  app.post("/api/operation/tasks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const insertOperationTaskSchema = z.object({
        title: z.string().min(2).max(100),
        content: z.string().optional().nullable(),
        status: z.string(),
        category: z.string(),
        priority: z.string(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        createdBy: z.string().optional(),
      });
      
      const validatedData = insertOperationTaskSchema.parse(req.body);
      
      const newTask = await storage.createOperationTask({
        ...validatedData,
        createdAt: new Date(),
      });
      
      res.status(201).json(newTask);
    } catch (error) {
      console.error("創建營運任務失敗:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "數據驗證失敗", errors: error.errors });
      } else {
        res.status(500).json({ message: "伺服器錯誤" });
      }
    }
  });
  
  // 更新營運任務
  app.patch("/api/operation/tasks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getOperationTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "任務未找到" });
      }
      
      const updateOperationTaskSchema = z.object({
        title: z.string().min(2).max(100).optional(),
        content: z.string().optional().nullable(),
        status: z.string().optional(),
        category: z.string().optional(),
        priority: z.string().optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        createdBy: z.string().optional(),
      });
      
      const validatedData = updateOperationTaskSchema.parse(req.body);
      
      const updatedTask = await storage.updateOperationTask(taskId, {
        ...validatedData,
        updatedAt: new Date(),
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error("更新營運任務失敗:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "數據驗證失敗", errors: error.errors });
      } else {
        res.status(500).json({ message: "伺服器錯誤" });
      }
    }
  });
  
  // 刪除營運任務
  app.delete("/api/operation/tasks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getOperationTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "任務未找到" });
      }
      
      const success = await storage.deleteOperationTask(taskId);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "刪除任務失敗" });
      }
    } catch (error) {
      console.error("刪除營運任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 根據狀態獲取營運任務
  app.get("/api/operation/tasks/status/:status", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const status = req.params.status;
      const tasks = await storage.getOperationTasksByStatus(status);
      res.json(tasks);
    } catch (error) {
      console.error("獲取營運任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 根據類別獲取營運任務
  app.get("/api/operation/tasks/category/:category", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const category = req.params.category;
      const tasks = await storage.getOperationTasksByCategory(category);
      res.json(tasks);
    } catch (error) {
      console.error("獲取營運任務失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  // 廠商聯絡表路由
  app.get("/api/vendors", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      console.error("獲取廠商資料失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const vendor = await storage.getVendorById(id);
      if (!vendor) {
        return res.status(404).json({ message: "找不到廠商資料" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("獲取廠商資料失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const vendor = await storage.createVendor(req.body);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("創建廠商資料失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.patch("/api/vendors/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const vendor = await storage.updateVendor(id, req.body);
      res.json(vendor);
    } catch (error) {
      console.error("更新廠商資料失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteVendor(id);
      if (!result) {
        return res.status(404).json({ message: "找不到廠商資料" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("刪除廠商資料失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // Onelink AppsFlyer 路由
  app.get("/api/onelink-fields", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const onelinkFields = await storage.getOnelinkFields();
      res.json(onelinkFields);
    } catch (error) {
      console.error("獲取 Onelink 欄位失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.get("/api/onelink-fields/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const onelinkField = await storage.getOnelinkFieldById(id);
      if (!onelinkField) {
        return res.status(404).json({ message: "找不到 Onelink 欄位" });
      }
      res.json(onelinkField);
    } catch (error) {
      console.error("獲取 Onelink 欄位失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.post("/api/onelink-fields", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const onelinkField = await storage.createOnelinkField(req.body);
      res.status(201).json(onelinkField);
    } catch (error) {
      console.error("創建 Onelink 欄位失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.patch("/api/onelink-fields/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const onelinkField = await storage.updateOnelinkField(id, req.body);
      res.json(onelinkField);
    } catch (error) {
      console.error("更新 Onelink 欄位失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  app.delete("/api/onelink-fields/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteOnelinkField(id);
      if (!result) {
        return res.status(404).json({ message: "找不到 Onelink 欄位" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("刪除 Onelink 欄位失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });
  
  // 生成 Onelink URL
  app.post("/api/generate-onelink", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }
    
    try {
      const { id, baseUrl, customParams } = req.body;
      
      if (!id || !baseUrl) {
        return res.status(400).json({ message: "缺少必要參數" });
      }
      
      const onelinkField = await storage.getOnelinkFieldById(parseInt(id));
      if (!onelinkField) {
        return res.status(404).json({ message: "找不到 Onelink 欄位" });
      }
      
      // 構建基本參數 (簡化版本)
      const params = new URLSearchParams();
      params.append("pid", onelinkField.platform);
      params.append("c", onelinkField.campaignCode);
      params.append("af_sub1", onelinkField.materialId);
      
      // 添加廣告群組參數（如果存在）
      if (onelinkField.groupId) params.append("af_sub4", onelinkField.groupId);
      
      // 添加自定義參數
      if (customParams && typeof customParams === "object") {
        Object.entries(customParams).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      
      // 構建完整 URL
      const finalUrl = `${baseUrl}?${params.toString()}`;
      
      res.json({ 
        url: finalUrl,
        params: Object.fromEntries(params.entries())
      });
    } catch (error) {
      console.error("生成 Onelink URL 失敗:", error);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  });

  // 用戶群組管理 API
  // 創建新用戶 (僅管理員可訪問)
  app.post("/api/users", checkPermission(Permission.CREATE_USER), async (req, res) => {
    try {
      // 驗證請求數據
      const userData = await insertUserSchema.parse(req.body);
      
      // 檢查用戶名和電子郵件是否已存在
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "用戶名已被使用" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(409).json({ message: "電子郵件已被使用" });
      }

      // 直接使用明文密碼
      
      // 創建新用戶
      const newUser = await storage.createUser({
        ...userData
        // 直接使用明文密碼
      });

      // 移除敏感信息
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("創建用戶錯誤:", error);
      res.status(500).json({ 
        message: "創建用戶時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 更新用戶信息 (僅管理員或用戶本人可訪問)
  app.patch("/api/users/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 檢查操作權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 普通用戶只能修改自己的信息，管理員可以修改任何用戶
      const isSelfUpdate = user.id === targetUserId;
      const hasPermission = user.role === "ADMIN" || user.isAdminUser;
      
      if (!isSelfUpdate && !hasPermission) {
        return res.status(403).json({ message: "權限不足，您只能更新自己的信息" });
      }

      // 檢查目標用戶是否存在
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "找不到目標用戶" });
      }

      // 限制可修改的字段
      const updateData: Partial<any> = {};
      
      // 只允許管理員修改這些字段
      if (hasPermission) {
        if (req.body.role !== undefined) updateData.role = req.body.role;
        if (req.body.groupId !== undefined) updateData.groupId = req.body.groupId;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      }
      
      // 用戶可以修改自己的這些字段
      if (req.body.displayName !== undefined) updateData.displayName = req.body.displayName;
      
      // 直接使用明文密碼
      if (req.body.password !== undefined) {
        updateData.password = req.body.password;
      }
      
      // 更新用戶
      const updatedUser = await storage.updateUser(targetUserId, updateData);
      
      // 移除敏感信息
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("更新用戶錯誤:", error);
      res.status(500).json({ 
        message: "更新用戶時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 刪除用戶 (僅管理員可訪問)
  app.delete("/api/users/:userId", checkPermission(Permission.DELETE_USER), async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 檢查目標用戶是否存在
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "找不到目標用戶" });
      }

      // 不允許刪除自己
      if (targetUserId === req.session.userId) {
        return res.status(400).json({ message: "不能刪除當前登錄的用戶" });
      }

      // 不允許刪除管理員用戶（除非是管理員本人）
      const currentUser = await storage.getUser(req.session.userId);
      if (targetUser.role === "ADMIN" && currentUser?.role !== "ADMIN") {
        return res.status(403).json({ message: "無法刪除管理員用戶" });
      }

      // 刪除用戶
      const result = await storage.deleteUser(targetUserId);
      
      if (result) {
        res.status(200).json({ message: "用戶已成功刪除" });
      } else {
        res.status(500).json({ message: "刪除用戶失敗" });
      }
    } catch (error) {
      console.error("刪除用戶錯誤:", error);
      res.status(500).json({ 
        message: "刪除用戶時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 這部分已經被上面的更新用戶路由處理了，所以刪除重覆代碼
  
  // 通過ID獲取用戶信息
  app.get("/api/users/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 檢查操作權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 普通用戶只能查看自己的信息，管理員或有VIEW_USERS權限的用戶可以查看任何用戶
      const isSelfQuery = user.id === targetUserId;
      const isAdmin = user.role === "ADMIN" || user.isAdminUser;
      
      // 檢查用戶是否有查看用戶的權限
      let hasViewPermission = false;
      if (user.groupId) {
        const userGroup = await storage.getUserGroupById(user.groupId);
        if (userGroup) {
          const permissions = userGroup.permissions as Permission[];
          hasViewPermission = permissions.includes(Permission.VIEW_USERS);
        }
      }

      if (!isSelfQuery && !isAdmin && !hasViewPermission) {
        return res.status(403).json({ message: "權限不足，您只能查看自己的信息" });
      }

      // 獲取用戶信息
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "找不到目標用戶" });
      }

      // 移除敏感信息
      const { password, ...userWithoutPassword } = targetUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("獲取用戶信息錯誤:", error);
      res.status(500).json({ 
        message: "獲取用戶信息時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 獲取所有用戶群組
  app.get("/api/user-groups", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以查看所有用戶群組
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const groups = await storage.getUserGroups();
      res.json(groups);
    } catch (error) {
      console.error("獲取用戶群組錯誤:", error);
      res.status(500).json({ 
        message: "獲取用戶群組時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 獲取特定用戶群組詳情
  app.get("/api/user-groups/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以查看群組詳情
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "無效的群組ID" });
      }

      const group = await storage.getUserGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: "找不到該用戶群組" });
      }

      // 獲取群組成員
      const users = await storage.getUsersInGroup(groupId);
      
      res.json({
        ...group,
        users: users.map(({ password, ...user }) => user) // 去除密碼字段
      });
    } catch (error) {
      console.error("獲取用戶群組詳情錯誤:", error);
      res.status(500).json({ 
        message: "獲取用戶群組詳情時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 創建新的用戶群組
  app.post("/api/user-groups", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以創建用戶群組
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      // 驗證請求數據
      const groupData = await insertUserGroupSchema.parse(req.body);
      
      // 創建新群組
      const newGroup = await storage.createUserGroup(groupData);
      
      res.status(201).json(newGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "無效的用戶群組數據", 
          errors: error.errors 
        });
      }
      
      console.error("創建用戶群組錯誤:", error);
      res.status(500).json({ 
        message: "創建用戶群組時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 更新用戶群組
  app.put("/api/user-groups/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以更新用戶群組
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "無效的群組ID" });
      }

      // 檢查群組是否存在
      const existingGroup = await storage.getUserGroupById(groupId);
      if (!existingGroup) {
        return res.status(404).json({ message: "找不到該用戶群組" });
      }

      // 更新群組數據
      const groupData = req.body;
      const updatedGroup = await storage.updateUserGroup(groupId, groupData);
      
      res.json(updatedGroup);
    } catch (error) {
      console.error("更新用戶群組錯誤:", error);
      res.status(500).json({ 
        message: "更新用戶群組時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 刪除用戶群組
  app.delete("/api/user-groups/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以刪除用戶群組
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "無效的群組ID" });
      }

      // 嘗試刪除群組
      await storage.deleteUserGroup(groupId);
      
      res.json({ message: "用戶群組已成功刪除" });
    } catch (error) {
      console.error("刪除用戶群組錯誤:", error);
      res.status(500).json({ 
        message: "刪除用戶群組時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 獲取所有用戶列表（僅管理員可訪問）
  app.get("/api/users", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以獲取所有用戶列表
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      // 獲取所有用戶列表
      const users = await storage.getAllUsers();
      
      // 移除敏感信息
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("獲取用戶列表錯誤:", error);
      res.status(500).json({ 
        message: "獲取用戶列表時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 獲取用戶所屬的所有群組
  app.get("/api/users/:userId/groups", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 普通用戶只能查看自己的群組，管理員可以查看任何用戶的群組
      if (user.role !== "ADMIN" && user.id !== targetUserId) {
        return res.status(403).json({ message: "權限不足，您只能查看自己的群組" });
      }

      // 檢查目標用戶是否存在
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "找不到目標用戶" });
      }

      // 獲取用戶的群組成員資格
      const memberships = await storage.getUserGroupMemberships(targetUserId);
      
      // 獲取完整的群組信息
      const groups: UserGroup[] = [];
      for (const membership of memberships) {
        const group = await storage.getUserGroupById(membership.groupId);
        if (group) {
          groups.push(group);
        }
      }
      
      res.json(groups);
    } catch (error) {
      console.error("獲取用戶群組錯誤:", error);
      res.status(500).json({ 
        message: "獲取用戶群組時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 添加用戶到群組
  app.post("/api/user-groups/:groupId/users", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以添加用戶到群組
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "無效的群組ID" });
      }

      // 驗證請求數據
      const { userId } = req.body;
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 添加用戶到群組
      const membership = await storage.addUserToGroup(parseInt(userId), groupId);
      
      res.status(201).json(membership);
    } catch (error) {
      console.error("添加用戶到群組錯誤:", error);
      res.status(500).json({ 
        message: "添加用戶到群組時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  // 從群組移除用戶
  app.delete("/api/user-groups/:groupId/users/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以從群組移除用戶
      if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const groupId = parseInt(req.params.groupId);
      const targetUserId = parseInt(req.params.userId);
      
      if (isNaN(groupId) || isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的群組ID或用戶ID" });
      }

      // 從群組移除用戶
      await storage.removeUserFromGroup(targetUserId, groupId);
      
      res.json({ message: "用戶已從群組中移除" });
    } catch (error) {
      console.error("從群組移除用戶錯誤:", error);
      res.status(500).json({ 
        message: "從群組移除用戶時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });

  return httpServer;
}
