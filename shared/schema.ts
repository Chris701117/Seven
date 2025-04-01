import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  accessToken: text("access_token"),
  fbUserId: text("fb_user_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Facebook Pages
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  pageId: text("page_id").notNull().unique(),
  name: text("name").notNull(),
  accessToken: text("access_token").notNull(),
  userId: integer("user_id").notNull(),
  picture: text("picture"),
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
  category: text("category"), // 宣傳、活動、公告
  scheduledTime: timestamp("scheduled_time"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"), // Added to support video uploads
  linkUrl: text("link_url"),
  linkTitle: text("link_title"),
  linkDescription: text("link_description"),
  linkImageUrl: text("link_image_url"),
  reminderSent: boolean("reminder_sent").default(false), // Track if reminder was sent
  reminderTime: timestamp("reminder_time"), // When reminder should be sent
  isCompleted: boolean("is_completed").default(false), // Track if post was actually published
  completedTime: timestamp("completed_time"), // When the post was marked as completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  publishedTime: timestamp("published_time"),
  updatedAt: timestamp("updated_at"),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  postId: true,
  createdAt: true,
  publishedTime: true,
  updatedAt: true,
  reminderSent: true,
  reminderTime: true,
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
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertPageAnalyticsSchema = createInsertSchema(pageAnalytics).omit({
  id: true,
  lastUpdated: true,
});

// Types
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
