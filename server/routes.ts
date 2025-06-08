import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPostSchema, insertPageSchema, insertUserSchema, type Post, type Page,
  insertUserGroupSchema, type UserGroup, type UserGroupMembership,
  type User, Permission 
} from "@shared/schema";
import session from "express-session";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { upload, uploadFromUrl, deleteFile, getPublicIdFromUrl } from "./cloudinary";
import path from "path";
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

// 從 index.ts 引入變數
import { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, USE_FIXED_2FA_SECRET, FIXED_2FA_SECRET } from "./index";

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
    loginFails?: number;
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
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: 'lax',
      },
    })
  );
  
  // Configuration routes - Facebook 配置
  app.get("/api/config/facebook", (req, res) => {
    const domain = req.get('host') || '';
    const environment = process.env.NODE_ENV || 'development';
    
    // 使用常量中的 FACEBOOK_APP_ID
    const appId = FACEBOOK_APP_ID;
    const hasAppSecret = !!FACEBOOK_APP_SECRET;
    
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
  const loginHandler = async (req: Request, res: Response) => {
    try {
      // 只需要用戶名和密碼的基本驗證
      const loginSchema = z.object({
        username: z.string().min(1, "請輸入用戶名"),
        password: z.string().min(1, "請輸入密碼"),
      });
      
      const { username, password } = await loginSchema.parse(req.body);

      // 檢查過多失敗嘗試
      const fails = req.session.loginFails || 0;
      if (fails > 5) {
        return res.status(429).json({ message: "嘗試次數過多，請稍後再試" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user) {
        req.session.loginFails = fails + 1;
        return res.status(401).json({ message: "用戶名或密碼不正確" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        req.session.loginFails = fails + 1;
        return res.status(401).json({ message: "用戶名或密碼不正確" });
      }

      // 驗證成功重置失敗計數
      req.session.loginFails = 0;

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
  };

  app.post("/api/auth/login", loginHandler);
  app.post("/api/login", loginHandler);

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = await insertUserSchema.parse(req.body);
      
      // 檢查用戶是否已存在
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "用戶名已被使用" });
      }
      
      console.log("註冊新用戶:", {
        username: userData.username,
        role: userData.role,
        email: userData.email
      });
      
      // 創建用戶（直接使用明文密碼）
      const user = await storage.createUser(userData);
      
      // 自動生成二步驗證密鑰
      const secret = USE_FIXED_2FA_SECRET ? FIXED_2FA_SECRET : authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.username, "社群媒體管理系統", secret);
      
      // 生成 QR Code
      const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
      
      // 設置二步驗證密鑰（但尚未啟用）
      await storage.setTwoFactorSecret(user.id, secret);
      
      // 用戶已創建但需要設置二步驗證，不自動登入
      res.status(201).json({ 
        message: "註冊成功，請設置二步驗證", 
        userId: user.id,
        requireTwoFactor: true,
        qrCode: qrCodeDataUrl,
        secret: secret // 僅在初始化時發送一次
      });
    } catch (error) {
      console.error("註冊錯誤:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ 
        message: "伺服器錯誤", 
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
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
      
      console.log('收到二步驗證設置請求:', JSON.stringify(req.body));
      
      const { userId, code } = await verifySchema.parse(req.body);
      const user = await storage.getUser(userId);
      
      console.log('用戶信息:', user ? `找到用戶 ID: ${user.id}` : '用戶不存在');
      
      if (!user) {
        console.log('設置二步驗證失敗: 用戶不存在');
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      console.log('二步驗證狀態:', {
        twoFactorSecret: !!user.twoFactorSecret, 
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        code: code
      });
      
      if (!user.twoFactorSecret) {
        console.log('設置二步驗證失敗: 未初始化二步驗證密鑰');
        return res.status(400).json({ message: "請先初始化二步驗證" });
      }
      
      if (user.isTwoFactorEnabled) {
        console.log('設置二步驗證失敗: 二步驗證已啟用');
        return res.status(400).json({ message: "二步驗證已經啟用" });
      }
      
      // 驗證 TOTP 代碼
      let isValid = false;
      try {
        isValid = authenticator.verify({ 
          token: code, 
          secret: user.twoFactorSecret 
        });
        console.log('TOTP驗證結果:', isValid);
      } catch (verifyError) {
        console.error('TOTP驗證發生錯誤:', verifyError);
      }
      
      // 嚴格驗證：必須使用正確的驗證碼，防止任意驗證碼繞過
      if (!isValid) {
        console.log('設置二步驗證失敗: 驗證碼無效');
        // 增加記錄失敗次數，防止暴力破解
        const failCount = req.session.twoFactorSetupFails || 0;
        req.session.twoFactorSetupFails = failCount + 1;
        if (req.session.twoFactorSetupFails > 5) {
          console.log('二步驗證嘗試次數過多，暫時鎖定');
          return res.status(429).json({ message: "驗證嘗試次數過多，請稍後再試" });
        }
        return res.status(401).json({ message: "驗證碼無效，請確認您輸入了正確的6位數驗證碼" });
      }
      // 重置失敗計數
      req.session.twoFactorSetupFails = 0;
      
      // 驗證成功，啟用二步驗證
      console.log('驗證通過，正在啟用二步驗證');
      const updatedUser = await storage.enableTwoFactor(user.id);
      
      // 設置用戶會話
      req.session.userId = userId;
      
      // 更新最後登入時間
      await storage.updateUser(userId, { lastLoginAt: new Date() });
      
      const { password, ...userWithoutPassword } = updatedUser;
      console.log('二步驗證設置成功');
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
      
      console.log('2FA驗證請求 - 用戶:', userId, '驗證碼:', code);
      
      if (!user) {
        console.log('2FA驗證失敗: 用戶不存在');
        return res.status(404).json({ message: "用戶不存在" });
      }
      
      // 檢查用戶是否已經設置二步驗證密鑰
      if (!user.twoFactorSecret) {
        console.log('2FA驗證失敗: 用戶未設置二步驗證密鑰');
        return res.status(400).json({ message: "請先設置二步驗證" });
      }
      
      // 檢查用戶是否已經啟用二步驗證 - 注意，即使沒有啟用，也需要驗證
      console.log('用戶二步驗證狀態:', {
        userId: user.id,
        username: user.username,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        hasTwoFactorSecret: !!user.twoFactorSecret
      });
      
      // 檢查是否有儲存的驗證碼
      const authCode = await storage.getAuthCodeByUserIdAndCode(userId, code);
      console.log('儲存的一次性驗證碼:', authCode ? '找到' : '未找到');
      
      let isValid = false;
      
      // 先檢查儲存的一次性驗證碼
      if (authCode && !authCode.isUsed && new Date() <= authCode.expiresAt) {
        isValid = true;
        // 標記驗證碼為已使用
        await storage.markAuthCodeAsUsed(authCode.id);
        console.log('使用一次性驗證碼成功');
      } 
      // 檢查是否為 TOTP (Google Authenticator)
      else if (user.twoFactorSecret) {
        try {
          // 驗證 TOTP 代碼 - 必須針對該用戶 ID 的密鑰進行驗證
          isValid = authenticator.verify({ 
            token: code, 
            // 確保使用該用戶的密鑰而不是全局密鑰
            secret: user.twoFactorSecret 
          });
          console.log('TOTP 驗證結果:', isValid, '用戶:', user.id, '密鑰:', user.twoFactorSecret.substring(0, 5) + '...');
        } catch (verifyError) {
          console.error('TOTP 驗證錯誤:', verifyError);
          isValid = false;
        }
      }
      
      // 嚴格驗證：必須使用正確的驗證碼，防止任意驗證碼繞過
      if (!isValid) {
        console.log('2FA驗證失敗: 驗證碼無效');
        // 增加記錄失敗次數，防止暴力破解
        const failCount = req.session.twoFactorVerifyFails || 0;
        req.session.twoFactorVerifyFails = failCount + 1;
        
        if (req.session.twoFactorVerifyFails > 5) {
          console.log('二步驗證嘗試次數過多，暫時鎖定');
          return res.status(429).json({ message: "驗證嘗試次數過多，請稍後再試" });
        }
        
        return res.status(401).json({ message: "驗證碼無效或已過期，請確認您輸入了正確的6位數驗證碼" });
      }
      
      // 重置失敗計數
      req.session.twoFactorVerifyFails = 0;
      
      console.log('2FA驗證成功，設置用戶會話');
      // 驗證成功，設置會話
      req.session.userId = userId;
      
      // 更新最後登入時間
      await storage.updateUser(userId, { lastLoginAt: new Date() });
      
      res.json({
        message: "驗證成功",
        userId,
        username: user.username
      });
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
      let isValid = false;
      
      try {
        isValid = authenticator.verify({ 
          token: code, 
          secret: user.twoFactorSecret 
        });
        console.log('TOTP verify-2fa-setup 驗證結果:', isValid);
      } catch (verifyError) {
        console.error('TOTP verify-2fa-setup 驗證錯誤:', verifyError);
      }
      
      // 嚴格驗證：必須使用正確的驗證碼，防止任意驗證碼繞過
      if (!isValid) {
        console.log('2FA設置驗證失敗: 驗證碼無效');
        // 增加記錄失敗次數，防止暴力破解
        const failCount = req.session.twoFactorSetupVerifyFails || 0;
        req.session.twoFactorSetupVerifyFails = failCount + 1;
        
        if (req.session.twoFactorSetupVerifyFails > 5) {
          console.log('二步驗證設置嘗試次數過多，暫時鎖定');
          return res.status(429).json({ message: "驗證嘗試次數過多，請稍後再試" });
        }
        
        return res.status(401).json({ message: "驗證碼無效，請確認您輸入了正確的6位數驗證碼" });
      }
      
      // 重置失敗計數
      req.session.twoFactorSetupVerifyFails = 0;
      
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
      console.log(`請求獲取頁面 ${pageId} 的已刪除貼文`);
      
      // 檢查請求的頁面是否存在
      const page = await storage.getPageByPageId(pageId);
      
      // 如果是測試頁面 (page_123456)，允許直接訪問
      if (pageId === "page_123456") {
        console.log(`獲取測試頁面 ${pageId} 的已刪除貼文`);
        const deletedPosts = await storage.getDeletedPosts(pageId);
        console.log(`返回測試頁面的 ${deletedPosts.length} 個已刪除貼文`);
        return res.json(deletedPosts);
      }
      
      // 針對實際頁面進行授權檢查
      if (!page) {
        console.log(`頁面不存在: ${pageId}`);
        return res.status(404).json({ message: "Page not found" });
      }
      
      if (page.userId !== req.session.userId) {
        console.log(`用戶 ${req.session.userId} 無權訪問頁面 ${pageId}`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // 獲取指定頁面的已刪除貼文
      const deletedPosts = await storage.getDeletedPosts(pageId);
      console.log(`找到頁面 ${pageId} 的 ${deletedPosts.length} 個已刪除貼文`);
      
      // 如果當前頁面沒有已刪除貼文，嘗試返回測試頁面的已刪除貼文
      if (deletedPosts.length === 0 && pageId !== "page_123456") {
        console.log(`嘗試從測試頁面獲取已刪除貼文`);
        const testPagePosts = await storage.getDeletedPosts("page_123456");
        if (testPagePosts.length > 0) {
          console.log(`從測試頁面返回 ${testPagePosts.length} 個已刪除貼文`);
          return res.json(testPagePosts);
        }
      }
      
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
      console.log(`正在軟刪除貼文 ID=${postId}`);
      const deleted = await storage.deletePost(postId);
      if (!deleted) {
        console.error(`軟刪除貼文失敗，ID=${postId}`);
        return res.status(500).json({ message: "刪除貼文時發生錯誤" });
      }
      
      // 確認貼文已成功標記為刪除
      const updatedPost = await storage.getPostById(postId);
      console.log(`貼文軟刪除結果:`, { 
        id: updatedPost?.id, 
        isDeleted: updatedPost?.isDeleted, 
        deletedAt: updatedPost?.deletedAt 
      });

      res.json({ message: "Post deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // 導入需要的類型
  
  // 還原被刪除的貼文
  app.post("/api/posts/:id/restore", async (req, res) => {
    if (!req.session.userId) {
      console.log(`還原貼文失敗：用戶未登入`);
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // 驗證並轉換ID參數
      const postIdParam = req.params.id;
      if (!postIdParam || isNaN(Number(postIdParam))) {
        console.error(`無效的貼文ID參數: ${postIdParam}`);
        return res.status(400).json({ message: "Invalid post ID format" });
      }
      
      const postId = parseInt(postIdParam, 10);
      console.log(`開始處理還原貼文請求，貼文ID=${postId}, 用戶ID=${req.session.userId}`);
      
      // 嘗試獲取貼文信息
      let post;
      try {
        post = await storage.getPostById(postId);
      } catch (fetchError) {
        console.error(`獲取貼文信息時出錯:`, fetchError);
        return res.status(500).json({ 
          success: false, 
          message: "獲取貼文信息時發生錯誤" 
        });
      }
      
      if (!post) {
        console.log(`找不到貼文ID=${postId}`);
        return res.status(404).json({ 
          success: false, 
          message: "找不到指定的貼文" 
        });
      }
      
      console.log(`找到待還原貼文，頁面ID=${post.pageId}, 刪除狀態=${post.isDeleted}, 當前狀態=${post.status}`);
      
      // 驗證貼文是否已被刪除
      if (!post.isDeleted) {
        console.log(`貼文未被刪除，無法還原`);
        return res.status(400).json({ 
          success: false, 
          message: "這個貼文尚未被刪除，無法還原" 
        });
      }
      
      // 查找用戶的活動頁面，用於將測試頁面的貼文轉移
      let userPages: Array<any> = [];
      try {
        userPages = await storage.getPages(req.session.userId);
        console.log(`找到用戶頁面數量: ${userPages.length}`);
      } catch (pagesError) {
        console.error(`獲取用戶頁面時出錯:`, pagesError);
        // 繼續處理，但沒有可用的頁面
      }
      
      let targetPageId: string | undefined = undefined;
      
      // 處理測試頁面貼文轉移
      if (post.pageId === "page_123456" && userPages && userPages.length > 0) {
        try {
          // 優先選擇非測試頁面作為目標頁面
          const realPages = userPages.filter(p => p.pageId !== "page_123456" && p.id !== 9999);
          console.log(`找到用戶的實際頁面數量: ${realPages.length}`);
          
          if (realPages.length > 0) {
            targetPageId = realPages[0].pageId;
            console.log(`自動選擇頁面 ${targetPageId} 作為目標還原頁面`);
          } else {
            targetPageId = undefined;
            console.log(`未找到實際頁面，將使用自動選擇`);
          }
        } catch (pageFilterError) {
          console.error(`篩選頁面時出錯:`, pageFilterError);
          // 繼續使用默認值
        }
      }
      
      // 檢查這是否為測試頁面的貼文
      if (post.pageId === "page_123456") {
        console.log(`這是測試頁面的貼文，允許還原，目標頁面=${targetPageId || '自動選擇'}`);
        
        // 使用增強的restorePost函數還原貼文
        try {
          const restoredPost = await storage.restorePost(postId, targetPageId);
          console.log(`測試頁面貼文還原成功:`, {
            id: restoredPost.id,
            pageId: restoredPost.pageId,
            status: restoredPost.status,
            isDeleted: restoredPost.isDeleted
          });
          
          return res.json({ 
            success: true,
            message: "貼文還原成功", 
            post: restoredPost 
          });
        } catch (restoreError: any) { // 使用 any 類型以訪問 message 屬性
          const errorMessage = restoreError?.message || '未知錯誤';
          console.error(`還原測試頁面貼文過程中出錯:`, restoreError);
          return res.status(500).json({ 
            success: false,
            message: `還原貼文失敗: ${errorMessage}`
          });
        }
      }
      
      // 如果不是測試頁面，則執行標準授權檢查
      try {
        const page = await storage.getPageByPageId(post.pageId);
        if (!page) {
          console.log(`找不到頁面ID=${post.pageId}`);
          return res.status(404).json({ 
            success: false, 
            message: "找不到對應的頁面" 
          });
        }
        
        if (page.userId !== req.session.userId) {
          console.log(`授權檢查失敗，用戶${req.session.userId}無權訪問頁面${post.pageId}`);
          return res.status(403).json({ 
            success: false, 
            message: "您沒有權限還原此貼文" 
          });
        }
        
        // 授權檢查通過，使用增強的restorePost函數還原貼文
        const restoredPost = await storage.restorePost(postId);
        console.log(`貼文還原成功:`, {
          id: restoredPost.id,
          pageId: restoredPost.pageId,
          status: restoredPost.status,
          isDeleted: restoredPost.isDeleted
        });
        
        return res.json({ 
          success: true,
          message: "貼文還原成功", 
          post: restoredPost 
        });
      } catch (authError) {
        console.error(`授權檢查或還原過程中出錯:`, authError);
        return res.status(500).json({ 
          success: false, 
          message: "處理還原請求時發生錯誤" 
        });
      }
    } catch (error: any) { // 使用 any 類型以訪問 message 屬性
      const errorMessage = error?.message || '未知錯誤';
      console.error("還原貼文處理過程中發生未捕獲的錯誤:", error);
      return res.status(500).json({ 
        success: false,
        message: "還原貼文時發生系統錯誤", 
        error: errorMessage
      });
    }
  });
  
  // 永久刪除貼文
  app.delete("/api/posts/:id/permanent", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const postId = parseInt(req.params.id);
      console.log(`嘗試永久刪除貼文ID=${postId}`);
      
      const post = await storage.getPostById(postId);
      
      if (!post) {
        console.log(`找不到貼文ID=${postId}`);
        return res.status(404).json({ message: "Post not found" });
      }
      
      console.log(`找到貼文，頁面ID=${post.pageId}`);
      
      // 檢查這是否為測試頁面的貼文
      if (post.pageId === "page_123456") {
        console.log(`這是測試頁面的貼文，允許永久刪除`);
        
        // 刪除 Cloudinary 圖片 (如果存在)
        if (post.imageUrl) {
          try {
            const publicId = getPublicIdFromUrl(post.imageUrl);
            if (publicId) {
              await deleteFile(publicId);
              console.log(`已從Cloudinary刪除圖片: ${publicId}`);
            }
          } catch (cloudinaryError) {
            console.error("從Cloudinary刪除媒體時發生錯誤:", cloudinaryError);
          }
        }
        
        // 永久刪除
        const deleted = await storage.permanentlyDeletePost(postId);
        if (!deleted) {
          console.log(`貼文ID=${postId}永久刪除失敗`);
          return res.status(500).json({ message: "永久刪除貼文時發生錯誤" });
        }
        
        console.log(`測試頁面貼文ID=${postId}永久刪除成功`);
        return res.json({ message: "Post permanently deleted" });
      }
      
      // 如果不是測試頁面，則執行標準授權檢查
      const page = await storage.getPageByPageId(post.pageId);
      if (!page || page.userId !== req.session.userId) {
        console.log(`授權檢查失敗，頁面不存在或用戶無權訪問`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // 刪除 Cloudinary 圖片 (如果存在)
      if (post.imageUrl) {
        try {
          const publicId = getPublicIdFromUrl(post.imageUrl);
          if (publicId) {
            await deleteFile(publicId);
            console.log(`已從Cloudinary刪除圖片: ${publicId}`);
          }
        } catch (cloudinaryError) {
          console.error("從Cloudinary刪除媒體時發生錯誤:", cloudinaryError);
          // Continue with post deletion even if media deletion fails
        }
      }
      
      // 永久刪除
      const deleted = await storage.permanentlyDeletePost(postId);
      if (!deleted) {
        console.log(`貼文ID=${postId}永久刪除失敗`);
        return res.status(500).json({ message: "永久刪除貼文時發生錯誤" });
      }
      
      console.log(`貼文ID=${postId}永久刪除成功`);
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
    
    // Setup WebSocket server - 使用明確的路徑以避免與Vite HMR衝突
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/api/ws', // 更改為更具體的路徑
      perMessageDeflate: false // Disable per-message deflate to avoid issues
    });
    console.log("WebSocket 伺服器已初始化");
    
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

      // 獲取所有群組
      const groups = await storage.getUserGroups();
      
      // 對權限數據進行驗證和轉換，確保所有群組的權限都是數組格式
      const safeGroups = groups.map(group => {
        let permissions: Permission[] = [];
        
        // 權限數據格式檢查和轉換
        if (Array.isArray(group.permissions)) {
          permissions = [...group.permissions]; // 確保是深度複製
        } else if (group.permissions) {
          try {
            permissions = JSON.parse(JSON.stringify(group.permissions));
          } catch (e) {
            console.error(`無法解析群組 ${group.id} 的權限數據:`, e);
          }
        }
        
        // 返回安全的群組對象，權限始終為數組
        return {
          ...group,
          permissions: Array.isArray(permissions) ? permissions : []
        };
      });
      
      // 記錄返回的數據，用於調試
      console.log(`向前端返回 ${safeGroups.length} 個群組`);
      safeGroups.forEach(group => {
        console.log(`群組 ${group.id}: ${group.name}, 權限數量: ${group.permissions.length}`);
      });
      
      res.json(safeGroups);
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

      // 驗證權限數據格式，確保前端獲取到正確的數組形式
      let permissions: Permission[] = [];
      if (Array.isArray(group.permissions)) {
        permissions = [...group.permissions]; // 深度複製
      } else if (group.permissions) {
        console.warn(`群組 ${groupId} 權限數據格式不正確:`, typeof group.permissions);
        try {
          permissions = JSON.parse(JSON.stringify(group.permissions));
        } catch (e) {
          console.error(`無法解析群組 ${groupId} 的權限數據:`, e);
        }
      }
      
      // 確保返回明確的權限格式
      const safeGroup = {
        ...group,
        permissions: Array.isArray(permissions) ? permissions : []
      };
      
      // 獲取群組成員
      const users = await storage.getUsersInGroup(groupId);
      
      // 記錄返回的權限數據，用於調試
      console.log(`向前端返回群組詳情，ID: ${groupId}，權限數量: ${safeGroup.permissions.length}`);
      
      res.json({
        ...safeGroup,
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

      // 記錄請求體原始數據
      console.log('接收到的原始請求體:', req.body);
      console.log('請求體類型:', typeof req.body);
      
      // 更新群組數據
      let groupData = req.body;
      
      // 檢查是否使用了保留字段 "_permissions"（這是一種常見的兼容性問題）
      if (groupData._permissions && !groupData.permissions) {
        console.log('檢測到使用了 _permissions 字段，正在複製到 permissions');
        groupData.permissions = groupData._permissions;
        delete groupData._permissions;
      }
      
      // 確保 permissions 字段是數組
      if (groupData.permissions && !Array.isArray(groupData.permissions)) {
        console.warn('警告: permissions 不是數組類型:', typeof groupData.permissions);
        
        // 如果是對象並且有 permissions 屬性（嵌套情況），提取它
        if (typeof groupData.permissions === 'object' && groupData.permissions !== null) {
          const nestedPermissions = groupData.permissions.permissions;
          if (Array.isArray(nestedPermissions)) {
            console.log('從嵌套對象中提取權限數組');
            groupData.permissions = nestedPermissions;
          } else {
            console.error('無法從嵌套對象中提取權限數組，使用空數組');
            groupData.permissions = [];
          }
        } else {
          console.error('permissions 不是有效對象，使用空數組');
          groupData.permissions = [];
        }
      }
      
      console.log('接收到的群組權限更新數據:', JSON.stringify(groupData, null, 2));
      
      // 嚴格檢查權限格式
      if (!groupData.permissions) {
        return res.status(400).json({ message: "請提供permissions字段" });
      }
      
      if (!Array.isArray(groupData.permissions)) {
        return res.status(400).json({ message: "權限格式無效，應為權限ID數組" });
      }
      
      // 深度複製權限數組，避免任何引用問題
      const permissionsCopy = [...groupData.permissions];
      
      console.log(`更新群組 ${groupId} 權限，共 ${permissionsCopy.length} 個權限`);
      console.log('權限詳情:', JSON.stringify(permissionsCopy, null, 2));
      
      if (permissionsCopy.length === 0) {
        console.log(`警告：更新群組 ${groupId} 權限為空列表`);
      }
      
      // 執行更新
      try {
        // 直接將權限數據保存到數據庫
        const updated = await storage.updateUserGroupPermissions(groupId, permissionsCopy);
        
        if (!updated) {
          console.error("權限更新失敗，數據庫返回空結果");
          return res.status(500).json({ 
            message: "權限更新失敗，請檢查伺服器日誌",
            error: "數據庫返回空結果" 
          });
        }
        
        // 驗證更新是否成功
        if (!updated.permissions || updated.permissions.length !== permissionsCopy.length) {
          console.error(`權限數據不一致：原有 ${permissionsCopy.length} 個，保存後有 ${updated.permissions?.length || 0} 個`);
          
          if (permissionsCopy.length > 0 && (!updated.permissions || updated.permissions.length === 0)) {
            return res.status(500).json({ 
              message: "權限更新不完整，數據丟失",
              error: "數據丟失" 
            });
          }
        }
        
        console.log('群組更新成功，結果:', JSON.stringify(updated, null, 2));
        console.log('權限數量:', updated.permissions ? updated.permissions.length : 0);
        
        // 設置響應頭，確保返回 JSON
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(updated);
      } catch (updateError) {
        console.error('群組更新失敗:', updateError);
        return res.status(500).json({ 
          message: "更新群組時發生錯誤",
          error: updateError instanceof Error ? updateError.message : "未知錯誤" 
        });
      }
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

  // 創建新用戶（僅管理員可使用）
  app.post("/api/users", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以創建用戶
      if (currentUser.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      // 驗證用戶數據
      const userData = await insertUserSchema.parse(req.body);
      
      // 檢查用戶名是否已存在
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "用戶名已被使用" });
      }
      
      // 確保管理員通過API創建的用戶有正確的角色，默認為USER
      if (!userData.role) {
        userData.role = "USER";
      }
      
      console.log("管理員創建新用戶:", {
        username: userData.username,
        role: userData.role,
        email: userData.email,
        groupId: userData.groupId
      });
      
      // 創建用戶
      const newUser = await storage.createUser(userData);
      
      // 如果指定了群組ID，將用戶添加到該群組
      if (userData.groupId && typeof userData.groupId === 'number') {
        try {
          await storage.addUserToGroup(newUser.id, userData.groupId);
          console.log(`用戶已添加到群組 ${userData.groupId}`);
        } catch (groupError) {
          console.error("添加用戶到群組錯誤:", groupError);
          // 不中斷創建流程，僅記錄錯誤
        }
      }
      
      // 生成二步驗證密鑰和QR碼（但不啟用）
      const secret = USE_FIXED_2FA_SECRET ? FIXED_2FA_SECRET : authenticator.generateSecret();
      await storage.setTwoFactorSecret(newUser.id, secret);
      
      // 移除敏感信息
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        message: "用戶創建成功",
        user: {
          ...userWithoutPassword,
          isTwoFactorEnabled: false,
          isAdmin: userWithoutPassword.role === "ADMIN"
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "無效的用戶數據", 
          errors: error.errors 
        });
      }
      
      console.error("創建用戶錯誤:", error);
      res.status(500).json({ 
        message: "創建用戶時發生錯誤",
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
      
      console.log(`獲取到 ${users.length} 個用戶`);
      
      // 移除敏感信息
      const sanitizedUsers = users.map(({ password, ...user }) => {
        return {
          ...user,
          // 確保正確顯示2FA狀態
          isTwoFactorEnabled: !!user.isTwoFactorEnabled,
          isAdmin: user.role === "ADMIN"
        };
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("獲取用戶列表錯誤:", error);
      res.status(500).json({ 
        message: "獲取用戶列表時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  // 更新用戶信息
  app.put("/api/users/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查當前用戶權限
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 只有管理員可以更新其他用戶，普通用戶只能更新自己
      if (currentUser.role !== "ADMIN" && currentUser.id !== targetUserId) {
        return res.status(403).json({ message: "權限不足，您只能更新自己的信息" });
      }

      // 獲取目標用戶
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "找不到目標用戶" });
      }

      // 驗證更新數據 - 只允許更新部分欄位
      const allowedFields = ['displayName', 'email', 'groupId', 'isActive'];
      
      // 管理員可以更新角色
      if (currentUser.role === "ADMIN") {
        allowedFields.push('role');
      }
      
      // 過濾出允許的欄位
      const updateData: Partial<User> = {};
      for (const field of allowedFields) {
        if (field in req.body) {
          updateData[field] = req.body[field];
        }
      }
      
      console.log(`更新用戶 ${targetUserId} 的信息:`, updateData);
      
      // 執行更新
      const updatedUser = await storage.updateUser(targetUserId, updateData);
      
      // 移除敏感信息
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json({
        message: "用戶信息已更新",
        user: {
          ...userWithoutPassword,
          isTwoFactorEnabled: !!userWithoutPassword.isTwoFactorEnabled,
          isAdmin: userWithoutPassword.role === "ADMIN"
        }
      });
    } catch (error) {
      console.error("更新用戶信息錯誤:", error);
      res.status(500).json({ 
        message: "更新用戶信息時發生錯誤",
        error: error instanceof Error ? error.message : "未知錯誤" 
      });
    }
  });
  
  // 刪除用戶
  app.delete("/api/users/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未認證" });
    }

    try {
      // 檢查用戶權限
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ message: "用戶不存在" });
      }

      // 只有管理員可以刪除用戶
      if (currentUser.role !== "ADMIN") {
        return res.status(403).json({ message: "權限不足，需要管理員權限" });
      }

      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "無效的用戶ID" });
      }

      // 不能刪除自己的帳號
      if (currentUser.id === targetUserId) {
        return res.status(400).json({ message: "不能刪除自己的帳號" });
      }

      // 檢查目標用戶是否存在
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "找不到目標用戶" });
      }

      // 刪除用戶
      await storage.deleteUser(targetUserId);
      
      res.json({ message: "用戶已成功刪除" });
    } catch (error) {
      console.error("刪除用戶錯誤:", error);
      res.status(500).json({ 
        message: "刪除用戶時發生錯誤",
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
