import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  accessToken: text("access_token"),
  fbUserId: text("fb_user_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
});

// Facebook Pages
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  pageId: text("page_id").notNull().unique(),
  pageName: text("page_name").notNull(),
  accessToken: text("access_token").notNull(),
  userId: integer("user_id").notNull(),
  picture: text("picture"),
  pageImage: text("page_image"),
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
  status: text("status").notNull(), // published, scheduled, draft, completed
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
  reminderSent: boolean("reminder_sent").default(false), // Track if reminder was sent
  reminderTime: timestamp("reminder_time"), // When reminder should be sent
  isCompleted: boolean("is_completed").default(false), // Track if post was actually published
  completedTime: timestamp("completed_time"), // When the post was marked as completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  publishedTime: timestamp("published_time"),
  updatedAt: timestamp("updated_at"),
  author: text("author"), // 貼文作者
  publishedBy: text("published_by"), // 發布者
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  postId: true,
  createdAt: true,
  publishedTime: true,
  updatedAt: true,
  reminderSent: true,
  isCompleted: true,
  completedTime: true,
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
  status: text("status").notNull().default("未完成"), // 未完成、已完成
  category: text("category").notNull(), // 一般、活動、測試、會議
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
  platform: text("platform").notNull(), // Media Source (pid)
  campaignCode: text("campaign_code").notNull(), // Campaign (c)
  materialId: text("material_id").notNull(), // af_sub1
  adSet: text("ad_set"), // af_adset
  adName: text("ad_name"), // af_ad
  audienceTag: text("audience_tag"), // af_sub2
  creativeSize: text("creative_size"), // af_sub3
  adPlacement: text("ad_placement"), // af_channel
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
