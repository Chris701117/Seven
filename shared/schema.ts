import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 用戶角色枚舉
export enum UserRole {
  ADMIN = 'ADMIN',
  PM = 'PM',
  USER = 'USER',
}

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // 用户名
  password: text("password").notNull(), // 加密密碼
  displayName: text("display_name"), // 顯示名稱
  email: text("email").notNull().unique(), // 電子郵件 (必須)
  role: text("role").notNull().default('USER'), // 角色: ADMIN, PM, USER
  isEmailVerified: boolean("is_email_verified").default(false), // 電子郵件是否已驗證
  emailVerificationCode: text("email_verification_code"), // 電子郵件驗證碼
  emailVerificationExpires: timestamp("email_verification_expires"), // 驗證碼過期時間
  isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false), // 是否啟用兩步驗證
  twoFactorSecret: text("two_factor_secret"), // 兩步驗證秘鑰
  lastLoginAt: timestamp("last_login_at"), // 上次登入時間
  createdAt: timestamp("created_at").notNull().defaultNow(), // 創建時間
  updatedAt: timestamp("updated_at"), // 更新時間
  invitedBy: integer("invited_by"), // 邀請者ID
  accessToken: text("access_token"), // Facebook 訪問令牌
  fbUserId: text("fb_user_id"), // Facebook 用戶ID
});

// 邀請連結表
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(), // 被邀請者電子郵件
  token: text("token").notNull(), // 邀請令牌
  role: text("role").notNull().default('USER'), // 指定角色
  invitedBy: integer("invited_by").notNull(), // 邀請者ID
  isAccepted: boolean("is_accepted").default(false), // 是否已接受
  expiresAt: timestamp("expires_at").notNull(), // 過期時間
  createdAt: timestamp("created_at").notNull().defaultNow(), // 創建時間
});

// 登入驗證碼表
export const authCodes = pgTable("auth_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // 用戶ID
  code: text("code").notNull(), // 驗證碼
  expiresAt: timestamp("expires_at").notNull(), // 過期時間
  isUsed: boolean("is_used").default(false), // 是否已使用
  createdAt: timestamp("created_at").notNull().defaultNow(), // 創建時間
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  role: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  email: true,
  token: true,
  role: true,
  invitedBy: true,
  expiresAt: true,
});

export const insertAuthCodeSchema = createInsertSchema(authCodes).pick({
  userId: true,
  code: true,
  expiresAt: true,
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type InsertAuthCode = z.infer<typeof insertAuthCodeSchema>;

// Facebook Pages
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  pageId: text("page_id").notNull().unique(),
  pageName: text("page_name").notNull(),
  accessToken: text("access_token").notNull(),
  userId: integer("user_id").notNull(),
  picture: text("picture"),
  pageImage: text("page_image"),
  name: text("name"), // 完整的頁面名稱（與pageName對應）
  devMode: boolean("dev_mode").default(false), // 是否為開發模式
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
});

// Post schema for Facebook Page posts
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  postId: text("post_id"),
  pageId: text("page_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull(), // published, scheduled, draft, completed, deleted, publish_failed
  category: text("category"), // 資訊、活動、公告
  scheduledTime: timestamp("scheduled_time"), // 開始發布時間
  endTime: timestamp("end_time"), // 貼文結束時間（進行區間結束）
  imageUrl: text("image_url"),
  videoUrl: text("video_url"), // Added to support video uploads
  linkUrl: text("link_url"),
  linkTitle: text("link_title"),
  linkDescription: text("link_description"),
  linkImageUrl: text("link_image_url"),
  // 多平台內容支援
  platformContent: jsonb("platform_content").default({}).notNull(), // {ig: "", tiktok: "", threads: "", x: ""}
  platformStatus: jsonb("platform_status").default({}).notNull(), // {fb: true, ig: false, tiktok: false, threads: false, x: false}
  // 用於Facebook Graph API
  fbPostId: text("fb_post_id"), // Facebook帖子ID
  mediaUrls: jsonb("media_urls").default([]).notNull(), // 媒體文件URL數組
  mediaType: text("media_type"), // 媒體類型：image或video
  // 提醒和完成相關
  reminderSent: boolean("reminder_sent").default(false), // Track if reminder was sent
  reminderTime: timestamp("reminder_time"), // When reminder should be sent
  isCompleted: boolean("is_completed").default(false), // Track if post was actually published
  completedTime: timestamp("completed_time"), // When the post was marked as completed
  isDeleted: boolean("is_deleted").default(false), // 用於軟刪除，標記貼文為已刪除
  deletedAt: timestamp("deleted_at"), // 記錄刪除時間
  createdAt: timestamp("created_at").notNull().defaultNow(),
  publishedTime: timestamp("published_time"),
  updatedAt: timestamp("updated_at"),
  author: text("author"), // 貼文作者
  publishedBy: text("published_by"), // 發布者
});

// 創建基本schema
const baseInsertPostSchema = createInsertSchema(posts).omit({
  id: true,
  postId: true,
  createdAt: true,
  publishedTime: true,
  updatedAt: true,
  reminderSent: true,
  isCompleted: true,
  completedTime: true,
  isDeleted: true,
  deletedAt: true,
});

// 自定義schema，添加對ISO日期字符串的支持
export const insertPostSchema = baseInsertPostSchema.extend({
  // 讓scheduledTime和endTime接受Date對象或ISO日期字符串
  scheduledTime: z.union([
    z.date(),
    z.string().refine(
      (val) => !isNaN(new Date(val).getTime()),
      { message: "必須是有效的日期字符串" }
    ).transform(val => new Date(val))
  ]).nullable().optional(),
  
  endTime: z.union([
    z.date(),
    z.string().refine(
      (val) => !isNaN(new Date(val).getTime()),
      { message: "必須是有效的日期字符串" }
    ).transform(val => new Date(val))
  ]).nullable().optional(),
});

// Post Analytics schema
export const postAnalytics = pgTable("post_analytics", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull(),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),
  viewCount: integer("view_count").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  reach: integer("reach").default(0),
  engagementRate: text("engagement_rate"),
  clickCount: integer("click_count").default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertPostAnalyticsSchema = createInsertSchema(postAnalytics).omit({
  id: true,
  lastUpdated: true,
});

// Page Analytics schema
export const pageAnalytics = pgTable("page_analytics", {
  id: serial("id").primaryKey(),
  pageId: text("page_id").notNull(),
  totalLikes: integer("total_likes").default(0),
  totalComments: integer("total_comments").default(0),
  totalShares: integer("total_shares").default(0),
  pageViews: integer("page_views").default(0),
  reachCount: integer("reach_count").default(0),
  engagementRate: text("engagement_rate"),
  demographicsData: text("demographics_data"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertPageAnalyticsSchema = createInsertSchema(pageAnalytics).omit({
  id: true,
  lastUpdated: true,
});

// 行銷模組 - 行銷項目表
export const marketingTasks = pgTable("marketing_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"), // 任務描述
  content: text("content"),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, cancelled
  category: text("category").notNull(), // social-media, content, event, advertising, email, partnership, other
  priority: text("priority").default("normal"), // low, normal, high
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  reminderSent: boolean("reminder_sent").default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertMarketingTaskSchema = createInsertSchema(marketingTasks).omit({
  id: true,
  reminderSent: true,
  createdAt: true,
  updatedAt: true,
});

// 營運模組 - 營運項目表
export const operationTasks = pgTable("operation_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  status: text("status").notNull().default("待處理"), // 待處理、進行中、已完成、已延遲、已取消
  category: text("category").notNull(), // 一般、設備維護、人員調度、物資管理
  priority: text("priority").default("中"), // 低、中、高
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  reminderSent: boolean("reminder_sent").default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertOperationTaskSchema = createInsertSchema(operationTasks).omit({
  id: true,
  reminderSent: true,
  createdAt: true,
  updatedAt: true,
});

// Onelink AppsFlyer 表
export const onelinkFields = pgTable("onelink_fields", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // 平台名稱 (pid)
  campaignCode: text("campaign_code").notNull(), // 活動代碼 (c)
  materialId: text("material_id").notNull(), // 素材ID (af_sub1)
  groupId: text("group_id"), // 廣告群組 (af_sub4)
  customName: text("custom_name"), // 自定義名稱
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertOnelinkFieldSchema = createInsertSchema(onelinkFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 廠商聯絡表
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  chatApp: text("chat_app"), // 聊天軟體
  chatId: text("chat_id"), // 聊天軟體ID
  address: text("address"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
// 定義多平台內容和狀態的類型
export interface PlatformContent {
  fb: string;
  ig: string;
  tiktok: string;
  threads: string;
  x: string;
}

export interface PlatformStatus {
  fb: boolean;
  ig: boolean;
  tiktok: boolean;
  threads: boolean;
  x: boolean;
}

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type PostAnalytics = typeof postAnalytics.$inferSelect;
export type InsertPostAnalytics = z.infer<typeof insertPostAnalyticsSchema>;

export type PageAnalytics = typeof pageAnalytics.$inferSelect;
export type InsertPageAnalytics = z.infer<typeof insertPageAnalyticsSchema>;

export type MarketingTask = typeof marketingTasks.$inferSelect;
export type InsertMarketingTask = z.infer<typeof insertMarketingTaskSchema>;

export type OperationTask = typeof operationTasks.$inferSelect;
export type InsertOperationTask = z.infer<typeof insertOperationTaskSchema>;

export type OnelinkField = typeof onelinkFields.$inferSelect;
export type InsertOnelinkField = z.infer<typeof insertOnelinkFieldSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
