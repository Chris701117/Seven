import { 
  users, type User, type InsertUser, UserRole,
  pages, type Page, type InsertPage,
  posts, type Post, type InsertPost,
  postAnalytics, type PostAnalytics, type InsertPostAnalytics,
  pageAnalytics, type PageAnalytics, type InsertPageAnalytics,
  marketingTasks, type MarketingTask, type InsertMarketingTask,
  operationTasks, type OperationTask, type InsertOperationTask,
  onelinkFields, type OnelinkField, type InsertOnelinkField,
  vendors, type Vendor, type InsertVendor,
  invitations, type InsertInvitation,
  authCodes, type InsertAuthCode,
  userGroups, type UserGroup, type InsertUserGroup,
  userGroupMemberships, type UserGroupMembership, type InsertUserGroupMembership,
  type PlatformContent, type PlatformStatus,
  Permission
} from "@shared/schema";

// 引入會話和內存存儲相關庫
import session from "express-session";
import createMemoryStore from "memorystore";
import fetch from "node-fetch";
// 不再使用 bcrypt，改用明文密碼存储
// import * as bcrypt from 'bcryptjs';
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // 會話存儲
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  verifyUserPassword(userId: number, password: string): Promise<boolean>;
  updateUserAccessToken(id: number, accessToken: string, fbUserId: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // 用戶認證相關
  verifyUserEmail(userId: number): Promise<User>;
  setEmailVerificationCode(userId: number, code: string, expiresAt: Date): Promise<User>;
  checkEmailVerificationCode(userId: number, code: string): Promise<boolean>;
  setTwoFactorSecret(userId: number, secret: string): Promise<User>;
  enableTwoFactor(userId: number): Promise<User>;
  disableTwoFactor(userId: number): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  
  // 邀請相關
  createInvitation(invitation: InsertInvitation): Promise<typeof invitations.$inferSelect>;
  getInvitationByToken(token: string): Promise<typeof invitations.$inferSelect | undefined>;
  getInvitationsByInviter(inviterId: number): Promise<typeof invitations.$inferSelect[]>;
  markInvitationAsAccepted(token: string): Promise<typeof invitations.$inferSelect>;
  
  // 驗證碼相關
  createAuthCode(authCode: InsertAuthCode): Promise<typeof authCodes.$inferSelect>;
  getAuthCodeByUserIdAndCode(userId: number, code: string): Promise<typeof authCodes.$inferSelect | undefined>;
  markAuthCodeAsUsed(id: number): Promise<typeof authCodes.$inferSelect>;

  // Page operations
  getPages(userId: number): Promise<Page[]>;
  getPageById(id: number): Promise<Page | undefined>;
  getPageByPageId(pageId: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: number, page: Partial<Page>): Promise<Page>;
  deletePage(id: number): Promise<boolean>;

  // Post operations
  getPosts(pageId: string): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostByPostId(postId: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: Partial<Post>): Promise<Post>;
  deletePost(id: number): Promise<boolean>; // 軟刪除，標記為已刪除
  restorePost(id: number): Promise<Post>; // 還原已刪除的貼文
  getDeletedPosts(pageId: string): Promise<Post[]>; // 獲取已刪除的貼文
  permanentlyDeletePost(id: number): Promise<boolean>; // 永久刪除貼文
  getPostsByStatus(pageId: string, status: string): Promise<Post[]>;
  getScheduledPosts(pageId: string): Promise<Post[]>;
  
  // Reminder and completion operations
  getPostsNeedingReminders(): Promise<Post[]>;
  markReminderSent(id: number): Promise<Post>;
  markPostAsCompleted(id: number): Promise<Post>;
  getPostsDueForPublishing(): Promise<Post[]>;
  publishToAllPlatforms(id: number): Promise<Post>; // 新增一鍵發布功能

  // Post Analytics operations
  getPostAnalytics(postId: string): Promise<PostAnalytics | undefined>;
  createPostAnalytics(analytics: InsertPostAnalytics): Promise<PostAnalytics>;
  updatePostAnalytics(postId: string, analytics: Partial<PostAnalytics>): Promise<PostAnalytics>;

  // Page Analytics operations
  getPageAnalytics(pageId: string): Promise<PageAnalytics | undefined>;
  createPageAnalytics(analytics: InsertPageAnalytics): Promise<PageAnalytics>;
  updatePageAnalytics(pageId: string, analytics: Partial<PageAnalytics>): Promise<PageAnalytics>;

  // 行銷模組操作
  getMarketingTasks(): Promise<MarketingTask[]>;
  getMarketingTaskById(id: number): Promise<MarketingTask | undefined>;
  getMarketingTasksByStatus(status: string): Promise<MarketingTask[]>;
  getMarketingTasksByCategory(category: string): Promise<MarketingTask[]>;
  createMarketingTask(task: InsertMarketingTask): Promise<MarketingTask>;
  updateMarketingTask(id: number, task: Partial<MarketingTask>): Promise<MarketingTask>;
  deleteMarketingTask(id: number): Promise<boolean>;
  getMarketingTasksNeedingReminders(): Promise<MarketingTask[]>;
  markMarketingTaskReminderSent(id: number): Promise<MarketingTask>;
  
  // 營運模組操作
  getOperationTasks(): Promise<OperationTask[]>;
  getOperationTaskById(id: number): Promise<OperationTask | undefined>;
  getOperationTasksByStatus(status: string): Promise<OperationTask[]>;
  getOperationTasksByCategory(category: string): Promise<OperationTask[]>;
  createOperationTask(task: InsertOperationTask): Promise<OperationTask>;
  updateOperationTask(id: number, task: Partial<OperationTask>): Promise<OperationTask>;
  deleteOperationTask(id: number): Promise<boolean>;
  getOperationTasksNeedingReminders(): Promise<OperationTask[]>;
  markOperationTaskReminderSent(id: number): Promise<OperationTask>;
  
  // Onelink AppsFlyer 操作
  getOnelinkFields(): Promise<OnelinkField[]>;
  getOnelinkFieldById(id: number): Promise<OnelinkField | undefined>;
  createOnelinkField(field: InsertOnelinkField): Promise<OnelinkField>;
  updateOnelinkField(id: number, field: Partial<OnelinkField>): Promise<OnelinkField>;
  deleteOnelinkField(id: number): Promise<boolean>;
  
  // 廠商聯絡表操作
  getVendors(): Promise<Vendor[]>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<boolean>;
  
  // 用戶群組操作
  getUserGroups(): Promise<UserGroup[]>;
  getUserGroupById(id: number): Promise<UserGroup | undefined>;
  createUserGroup(group: InsertUserGroup): Promise<UserGroup>;
  updateUserGroup(id: number, group: Partial<UserGroup>): Promise<UserGroup>;
  deleteUserGroup(id: number): Promise<boolean>;
  
  // 用戶-群組關係操作
  getUserGroupMemberships(userId: number): Promise<UserGroupMembership[]>;
  getUsersInGroup(groupId: number): Promise<User[]>;
  addUserToGroup(userId: number, groupId: number): Promise<UserGroupMembership>;
  removeUserFromGroup(userId: number, groupId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pages: Map<number, Page>;
  private posts: Map<number, Post>;
  private postAnalytics: Map<number, PostAnalytics>;
  private pageAnalytics: Map<number, PageAnalytics>;
  private marketingTasks: Map<number, MarketingTask>;
  private operationTasks: Map<number, OperationTask>;
  private onelinkFields: Map<number, OnelinkField>;
  private vendors: Map<number, Vendor>;
  private invitations: Map<number, typeof invitations.$inferSelect>;
  private authCodes: Map<number, typeof authCodes.$inferSelect>;
  private userGroups: Map<number, UserGroup>;
  private userGroupMemberships: Map<number, UserGroupMembership>;

  private userId: number;
  private pageId: number;
  private postId: number;
  private postAnalyticsId: number;
  private pageAnalyticsId: number;
  private marketingTaskId: number;
  private operationTaskId: number;
  private onelinkFieldId: number;
  private vendorId: number;
  private invitationId: number;
  private authCodeId: number;
  private userGroupId: number;
  private userGroupMembershipId: number;
  
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.pages = new Map();
    this.posts = new Map();
    this.postAnalytics = new Map();
    this.pageAnalytics = new Map();
    this.marketingTasks = new Map();
    this.operationTasks = new Map();
    this.onelinkFields = new Map();
    this.vendors = new Map();
    this.invitations = new Map();
    this.authCodes = new Map();
    this.userGroups = new Map();
    this.userGroupMemberships = new Map();
    
    this.userId = 1;
    this.pageId = 1;
    this.postId = 1;
    this.postAnalyticsId = 1;
    this.pageAnalyticsId = 1;
    this.marketingTaskId = 1;
    this.operationTaskId = 1;
    this.onelinkFieldId = 1;
    this.vendorId = 1;
    this.invitationId = 1;
    this.authCodeId = 1;
    this.userGroupId = 1;
    this.userGroupMembershipId = 1;
    
    // 初始化會話存儲
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 每24小時清理過期會話
    });
    
    // 初始化示例數據（使用 Promise 來處理非同步函數）
    this.initialize();
  }
  
  // 初始化所有示例數據
  private async initialize() {
    // 按順序初始化所有數據
    await this.initSampleData();
    this.initSampleDeletedPosts(); // 添加刪除的測試貼文
    this.initSampleMarketingTasks();
    this.initSampleOperationTasks();
    this.initSampleOnelinkFields();
    this.initSampleVendors();
    this.initSampleUserGroups();
    
    console.log('示例數據初始化完成');
  }
  
  // 初始化刪除的測試貼文
  private initSampleDeletedPosts() {
    console.log('初始化刪除的測試貼文...');
    
    // 創建特別的測試頁面 (page_123456)
    const testPageId = "page_123456";
    const testPage: Page = {
      id: 9999,
      pageId: testPageId,
      pageName: "測試頁面",
      name: "測試頁面",
      userId: 1, // 假設用戶ID為1
      picture: null,
      pageImage: null,
      accessToken: "EAAXXXtesttoken", // 測試令牌
      devMode: true
    };
    this.pages.set(9999, testPage);
    
    // 創建已刪除的測試貼文
    const deletedPostId = this.postId++;
    const deletedPost1: Post = {
      id: deletedPostId,
      postId: "deleted_post_123",
      pageId: testPageId,
      content: "這是一個已刪除的測試貼文，用於測試還原區功能。此貼文應該出現在還原區中，可以被還原或永久刪除。#測試 #還原區",
      status: "published",
      category: "announcement",
      scheduledTime: null,
      endTime: null,
      imageUrl: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2",
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      platformContent: {
        fb: "這是一個已刪除的測試貼文，用於測試還原區功能。",
        ig: "這是一個已刪除的測試貼文，用於測試還原區功能。 #測試 #還原區",
        tiktok: "",
        threads: "",
        x: ""
      },
      platformStatus: {
        fb: true,
        ig: true,
        tiktok: false,
        threads: false,
        x: false
      },
      fbPostId: "fb_deleted_test",
      mediaUrls: ["https://images.unsplash.com/photo-1515378791036-0648a3ef77b2"],
      mediaType: "image",
      reminderSent: false,
      reminderTime: null,
      isCompleted: true,
      completedTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      isDeleted: true, // 標記為已刪除
      deletedAt: new Date(), // 現在刪除
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      publishedTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      updatedAt: new Date(),
      author: "測試帳號",
      publishedBy: "測試帳號"
    };
    this.posts.set(deletedPostId, deletedPost1);
    
    // 再創建一個已刪除的測試貼文
    const deletedPostId2 = this.postId++;
    const deletedPost2: Post = {
      id: deletedPostId2,
      postId: "deleted_post_456",
      pageId: testPageId,
      content: "這是另一個已刪除的測試貼文，與第一個不同，用於測試還原區可以顯示多個已刪除的貼文。#測試 #還原區 #多個貼文",
      status: "draft",
      category: "event",
      scheduledTime: null,
      endTime: null,
      imageUrl: null,
      videoUrl: null,
      linkUrl: "https://example.com/event",
      linkTitle: "測試活動頁面",
      linkDescription: "這是一個用於測試的活動頁面鏈接",
      linkImageUrl: null,
      platformContent: {
        fb: "這是另一個已刪除的測試貼文，與第一個不同。",
        ig: "",
        tiktok: "",
        threads: "",
        x: ""
      },
      platformStatus: {
        fb: false,
        ig: false,
        tiktok: false,
        threads: false,
        x: false
      },
      fbPostId: null,
      mediaUrls: [],
      mediaType: null,
      reminderSent: false,
      reminderTime: null,
      isCompleted: false,
      completedTime: null,
      isDeleted: true, // 標記為已刪除
      deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      publishedTime: null,
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      author: "測試帳號",
      publishedBy: null
    };
    this.posts.set(deletedPostId2, deletedPost2);
    
    console.log(`已創建 ${testPageId} 測試頁面並添加 2 個已刪除的測試貼文`);
  }

  private async initSampleData() {
    // 為示例用戶使用明文密碼
    const plainPassword = "password123";
    
    // 先創建一個管理員群組
    const adminGroup = {
      id: this.userGroupId++,
      name: 'Administrators',
      description: '系統管理員群組',
      permissions: { 
        permissions: Object.values(Permission) 
      }, // 所有權限
      createdAt: new Date(),
      updatedAt: null
    };
    this.userGroups.set(adminGroup.id, adminGroup);
    
    // Create a sample user with new fields
    const user: User = {
      id: this.userId++,
      username: "demouser",
      password: plainPassword, // 使用明文密碼
      displayName: "示範用戶",
      email: "demo@example.com",
      role: UserRole.ADMIN,
      groupId: adminGroup.id, // 設置為管理員群組
      isActive: true,
      isEmailVerified: true, 
      emailVerificationCode: null,
      emailVerificationExpires: null,
      isTwoFactorEnabled: true, // 啟用二步驗證
      twoFactorSecret: "JBSWY3DPEHPK3PXP", // 固定的測試密鑰
      twoFactorQrCode: "data:image/png;base64,testing-qr-code", // 固定的測試QR碼
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: null,
      invitedBy: null,
      accessToken: "sample_fb_access_token",
      fbUserId: "10123456789",
      isAdminUser: true
    };
    this.users.set(user.id, user);

    // Create a sample page
    const page: Page = {
      id: this.pageId++,
      pageId: "page_123456", // 更改為客戶端期望的格式
      pageName: "Home & Garden Tips",
      name: "Home & Garden Tips", // 頁面完整名稱
      accessToken: "sample_page_access_token",
      userId: user.id,
      picture: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      pageImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      devMode: true // 默認為開發模式
    };
    this.pages.set(page.id, page);

    // Create sample analytics for the page
    const pageAnalyticsData: PageAnalytics = {
      id: this.pageAnalyticsId++,
      pageId: page.pageId,
      totalLikes: 12493,
      totalComments: 1849,
      totalShares: 724,
      pageViews: 28391,
      reachCount: 42500,
      engagementRate: "4.8",
      demographicsData: JSON.stringify({
        ageGroups: {
          "18-24": 15,
          "25-34": 42,
          "35-44": 28,
          "45-54": 10,
          "55+": 5
        },
        gender: {
          male: 60,
          female: 40
        },
        locations: [
          { name: "台北", percentage: 35 },
          { name: "新北", percentage: 25 },
          { name: "台中", percentage: 15 },
          { name: "高雄", percentage: 10 },
          { name: "其他", percentage: 15 }
        ]
      }),
      lastUpdated: new Date()
    };
    this.pageAnalytics.set(pageAnalyticsData.id, pageAnalyticsData);

    // Create sample posts
    const publishedPost1: Post = {
      id: this.postId++,
      postId: "post_123456", // 更改為客戶端期望的格式
      pageId: page.pageId,
      content: "Spring is finally here! Check out our latest collection of garden furniture to spruce up your outdoor space. Perfect for those warm evenings ahead! 🌿☀️ #SpringGardening #OutdoorLiving",
      status: "published",
      category: "promotion",
      scheduledTime: null,
      endTime: null,
      imageUrl: "https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28",
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      platformContent: { 
        fb: "Spring is finally here! Check out our latest collection of garden furniture to spruce up your outdoor space.",
        ig: "春天終於來了！快來看看我們最新的花園家具系列，讓你的戶外空間煥然一新。溫暖的夜晚即將來臨！🌿☀️ #SpringGardening #OutdoorLiving",
        tiktok: "",
        threads: "",
        x: ""
      },
      platformStatus: { 
        fb: true, 
        ig: true, 
        tiktok: false, 
        threads: false, 
        x: false 
      },
      // 新增字段用於 Facebook Graph API
      fbPostId: "fb_1234567890",
      mediaUrls: ["https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28"],
      mediaType: "image",
      // 其他字段
      reminderSent: false,
      reminderTime: null,
      isCompleted: true,
      completedTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      isDeleted: false, // 新增欄位
      deletedAt: null, // 新增欄位
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      publishedTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      author: "行銷團隊",
      publishedBy: "系統管理員"
    };
    this.posts.set(publishedPost1.id, publishedPost1);

    // Add analytics for the post
    const postAnalytics1: PostAnalytics = {
      id: this.postAnalyticsId++,
      postId: publishedPost1.postId!,
      likeCount: 243,
      commentCount: 36,
      shareCount: 12,
      viewCount: 1089,
      likes: 243,
      comments: 36,
      shares: 12,
      reach: 1620,
      engagementRate: "17.8",
      clickCount: 54,
      lastUpdated: new Date()
    };
    this.postAnalytics.set(postAnalytics1.id, postAnalytics1);

    // Add another published post
    const publishedPost2: Post = {
      id: this.postId++,
      postId: "post987654321",
      pageId: page.pageId,
      content: "We're excited to announce our summer workshop series! Learn everything from container gardening to landscape design from our experts. Limited spots available, book now! 🌸🌼",
      status: "published",
      category: "event",
      scheduledTime: null,
      endTime: null,
      imageUrl: null,
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      platformContent: { 
        fb: "We're excited to announce our summer workshop series! Learn everything from container gardening to landscape design from our experts.",
        ig: "夏季工作坊系列即將開始！從容器園藝到景觀設計，跟著我們的專家一起學習。名額有限，立即報名！🌸🌼 #花園工作坊 #景觀設計",
        tiktok: "",
        threads: "",
        x: ""
      },
      platformStatus: { 
        fb: true, 
        ig: false, 
        tiktok: false, 
        threads: false, 
        x: false 
      },
      // Facebook Graph API 相關字段
      fbPostId: "fb_9876543210",
      mediaUrls: [],
      mediaType: null,
      // 其他字段
      reminderSent: false,
      reminderTime: null,
      isCompleted: true,
      completedTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      isDeleted: false, // 新增欄位
      deletedAt: null, // 新增欄位
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      publishedTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      author: "內容團隊",
      publishedBy: "系統管理員"
    };
    this.posts.set(publishedPost2.id, publishedPost2);

    // Add analytics for the second post
    const postAnalytics2: PostAnalytics = {
      id: this.postAnalyticsId++,
      postId: publishedPost2.postId!,
      likeCount: 187,
      commentCount: 42,
      shareCount: 8,
      viewCount: 892,
      likes: 187,
      comments: 42,
      shares: 8,
      reach: 1250,
      engagementRate: "19.0",
      clickCount: 32,
      lastUpdated: new Date()
    };
    this.postAnalytics.set(postAnalytics2.id, postAnalytics2);

    // Add a scheduled post
    const scheduledPost: Post = {
      id: this.postId++,
      postId: null,
      pageId: page.pageId,
      content: "Looking for easy ways to reduce your water bill this summer? Here are our top 5 water-saving tips for your garden! Click the link to read the full guide. #WaterConservation #SummerGardening",
      status: "scheduled",
      category: "promotion",
      scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 結束時間設置為一週後
      imageUrl: null,
      videoUrl: null,
      linkUrl: "https://www.homeandgardentips.com/water-saving-tips",
      linkTitle: "5 Water-Saving Garden Tips for Summer",
      linkDescription: "Learn how to save water and money with these eco-friendly garden tips.",
      linkImageUrl: "https://images.unsplash.com/photo-1591382386627-349b692688ff",
      platformContent: { 
        fb: "Looking for easy ways to reduce your water bill this summer? Here are our top 5 water-saving tips for your garden!",
        ig: "想找省水的方法嗎？查看我們的夏季花園省水攻略，輕鬆省水又省錢！點擊連結閱讀完整指南。 #省水 #夏季園藝",
        tiktok: "夏季省水花園小技巧！#省水 #園藝 #環保生活",
        threads: "",
        x: ""
      },
      platformStatus: { 
        fb: false, 
        ig: false, 
        tiktok: false, 
        threads: false, 
        x: false 
      },
      // 新增字段用於 Facebook Graph API
      fbPostId: null,
      mediaUrls: ["https://images.unsplash.com/photo-1591382386627-349b692688ff"],
      mediaType: "image",
      // 其他字段
      reminderSent: false,
      reminderTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // One day before scheduled time
      isCompleted: false,
      completedTime: null,
      isDeleted: false, // 新增欄位
      deletedAt: null, // 新增欄位
      createdAt: new Date(),
      publishedTime: null,
      updatedAt: new Date(),
      author: "內容團隊",
      publishedBy: null
    };
    this.posts.set(scheduledPost.id, scheduledPost);

    // Add a scheduled post for tomorrow that needs a reminder today
    const upcomingScheduledPost: Post = {
      id: this.postId++,
      postId: null,
      pageId: page.pageId,
      content: "明天就是我們的大型活動！不要錯過這個與我們互動的機會，我們將提供獨家優惠和免費禮品。快來參加吧！ #特別活動 #限時優惠",
      status: "scheduled",
      category: "event",
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days after
      imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72",
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      platformContent: { 
        fb: "明天就是我們的大型活動！不要錯過這個與我們互動的機會，我們將提供獨家優惠和免費禮品。快來參加吧！ #特別活動 #限時優惠",
        ig: "明天就是我們的大型活動！🎉 與我們互動並獲得獨家優惠和免費禮品！ #特別活動 #限時優惠 #驚喜",
        tiktok: "倒數24小時！明天大型活動，獨家優惠，禮品等你拿！ #特別活動 #限時優惠 #倒數",
        threads: "",
        x: ""
      },
      platformStatus: { 
        fb: false, 
        ig: false, 
        tiktok: false, 
        threads: false, 
        x: false 
      },
      // Facebook Graph API 相關字段
      fbPostId: null,
      mediaUrls: ["https://images.unsplash.com/photo-1556761175-b413da4baf72"],
      mediaType: "image",
      // 其他字段
      reminderSent: false,
      reminderTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago (to trigger immediate reminder)
      isCompleted: false,
      completedTime: null,
      isDeleted: false, // 新增欄位
      deletedAt: null, // 新增欄位
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // Created 2 days ago
      publishedTime: null,
      updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      author: "行銷團隊",
      publishedBy: null
    };
    this.posts.set(upcomingScheduledPost.id, upcomingScheduledPost);

    // Add a draft post
    const draftPost: Post = {
      id: this.postId++,
      postId: null,
      pageId: page.pageId,
      content: "Working on our new product launch post. Indoor plants that purify your air and look amazing too!",
      status: "draft",
      category: "announcement",
      scheduledTime: null,
      endTime: null,
      imageUrl: null,
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      platformContent: { 
        fb: "室內淨化空氣植物—美觀又實用！新品即將上市，敬請期待更多細節。",
        ig: "室內淨化空氣植物，讓你呼吸更健康！新品即將推出，關注我們獲取最新消息！#室內植物 #空氣淨化 #新品預告",
        tiktok: "淨化空氣的室內植物，美觀又實用！#室內植物 #空氣淨化 #新品預告",
        threads: "",
        x: ""
      },
      platformStatus: { 
        fb: false, 
        ig: false, 
        tiktok: false, 
        threads: false, 
        x: false 
      },
      // Facebook Graph API 相關字段
      fbPostId: null,
      mediaUrls: [],
      mediaType: null,
      // 其他字段
      reminderSent: false,
      reminderTime: null,
      isCompleted: false,
      completedTime: null,
      isDeleted: false, // 新增欄位
      deletedAt: null, // 新增欄位
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      publishedTime: null,
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      author: "產品團隊",
      publishedBy: null
    };
    this.posts.set(draftPost.id, draftPost);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async verifyUserPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }
    
    // 直接比較明文密碼
    return password === user.password;
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // 確保groupId是null而不是undefined
    const groupId = insertUser.groupId || null;
    
    const user: User = { 
      ...insertUser, 
      id, 
      groupId,
      displayName: insertUser.displayName || null,
      isActive: true,
      isEmailVerified: false,
      emailVerificationCode: null,
      emailVerificationExpires: null,
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorQrCode: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: null,
      invitedBy: null,
      accessToken: null, 
      fbUserId: null,
      isAdminUser: insertUser.role === 'ADMIN' ? true : false // 如果是ADMIN角色，自動設置為管理員用戶
    };
    this.users.set(id, user);
    
    // 如果指定了groupId，自動將用戶添加到該群組
    if (groupId) {
      try {
        await this.addUserToGroup(id, groupId);
        console.log(`已自動將用戶(ID: ${id})添加到群組(ID: ${groupId})`);
      } catch (error) {
        console.error(`自動添加用戶到群組失敗:`, error);
      }
    }
    
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async verifyUserEmail(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpires: null,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async setEmailVerificationCode(userId: number, code: string, expiresAt: Date): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      emailVerificationCode: code,
      emailVerificationExpires: expiresAt,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async checkEmailVerificationCode(userId: number, code: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.emailVerificationCode || !user.emailVerificationExpires) {
      return false;
    }
    
    if (user.emailVerificationCode !== code) {
      return false;
    }
    
    if (user.emailVerificationExpires < new Date()) {
      return false; // 驗證碼已過期
    }
    
    return true;
  }
  
  async setTwoFactorSecret(userId: number, secret: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      twoFactorSecret: secret,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async enableTwoFactor(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    if (!user.twoFactorSecret) {
      throw new Error(`User with id ${userId} has no two factor secret set`);
    }
    
    const updatedUser = { 
      ...user, 
      isTwoFactorEnabled: true,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async disableTwoFactor(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      isTwoFactorEnabled: false,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserPassword(userId: number, password: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      password,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserAccessToken(id: number, accessToken: string, fbUserId: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    // 分析是否為頁面訪問令牌
    const isPageToken = accessToken.includes('EAANn') || 
                        accessToken.includes('EAAG') || 
                        accessToken.includes('EAAJ') ||
                        accessToken.includes('EAAB');
                         
    // 如果是開發模式令牌，設置開發模式標誌
    const isDevToken = accessToken.startsWith('DEV_MODE_');
    
    console.log(`更新用戶訪問令牌 - 用戶ID: ${id}, 令牌類型: ${isPageToken ? '頁面令牌' : '用戶令牌'}, 開發模式: ${isDevToken}`);
    
    const updatedUser = { 
      ...user, 
      accessToken,
      fbUserId,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) {
      return false;
    }
    
    // 刪除用戶的群組關係
    const memberships: UserGroupMembership[] = [];
    for (const [membershipId, membership] of this.userGroupMemberships.entries()) {
      if (membership.userId === id) {
        memberships.push(membership);
      }
    }
    
    // 刪除關聯的群組會員資料
    for (const membership of memberships) {
      this.userGroupMemberships.delete(membership.id);
    }
    
    // 刪除用戶所擁有的頁面
    const userPages: Page[] = [];
    for (const [pageId, page] of this.pages.entries()) {
      if (page.userId === id) {
        userPages.push(page);
      }
    }
    
    // 刪除頁面
    for (const page of userPages) {
      await this.deletePage(page.id);
    }
    
    // 最後刪除用戶
    return this.users.delete(id);
  }
  
  // 邀請相關
  async createInvitation(invitation: InsertInvitation): Promise<typeof invitations.$inferSelect> {
    const id = this.invitationId++;
    const invitationRecord = {
      id,
      ...invitation,
      role: invitation.role || 'USER', // 確保role有默認值
      isAccepted: false,
      createdAt: new Date()
    };
    this.invitations.set(id, invitationRecord);
    return invitationRecord;
  }
  
  async getInvitationByToken(token: string): Promise<typeof invitations.$inferSelect | undefined> {
    return Array.from(this.invitations.values()).find(
      (invitation) => invitation.token === token
    );
  }
  
  async getInvitationsByInviter(inviterId: number): Promise<typeof invitations.$inferSelect[]> {
    return Array.from(this.invitations.values()).filter(
      (invitation) => invitation.invitedBy === inviterId
    );
  }
  
  async markInvitationAsAccepted(token: string): Promise<typeof invitations.$inferSelect> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error(`Invitation with token ${token} not found`);
    }
    
    const updatedInvitation = {
      ...invitation,
      isAccepted: true
    };
    this.invitations.set(invitation.id, updatedInvitation);
    return updatedInvitation;
  }
  
  // 驗證碼相關
  async createAuthCode(authCode: InsertAuthCode): Promise<typeof authCodes.$inferSelect> {
    const id = this.authCodeId++;
    const authCodeRecord = {
      id,
      ...authCode,
      isUsed: false,
      createdAt: new Date()
    };
    this.authCodes.set(id, authCodeRecord);
    return authCodeRecord;
  }
  
  async getAuthCodeByUserIdAndCode(userId: number, code: string): Promise<typeof authCodes.$inferSelect | undefined> {
    return Array.from(this.authCodes.values()).find(
      (authCode) => authCode.userId === userId && authCode.code === code && !authCode.isUsed && authCode.expiresAt > new Date()
    );
  }
  
  async markAuthCodeAsUsed(id: number): Promise<typeof authCodes.$inferSelect> {
    const authCode = this.authCodes.get(id);
    if (!authCode) {
      throw new Error(`Auth code with id ${id} not found`);
    }
    
    const updatedAuthCode = {
      ...authCode,
      isUsed: true
    };
    this.authCodes.set(id, updatedAuthCode);
    return updatedAuthCode;
  }

  // Page operations
  async getPages(userId: number): Promise<Page[]> {
    return Array.from(this.pages.values()).filter(
      (page) => page.userId === userId
    );
  }

  async getPageById(id: number): Promise<Page | undefined> {
    return this.pages.get(id);
  }

  async getPageByPageId(pageId: string): Promise<Page | undefined> {
    return Array.from(this.pages.values()).find(
      (page) => page.pageId === pageId
    );
  }

  async createPage(insertPage: InsertPage): Promise<Page> {
    const id = this.pageId++;
    const page: Page = { 
      ...insertPage, 
      id,
      picture: insertPage.picture || null,
      pageImage: insertPage.pageImage || null,
      name: insertPage.name || null,
      devMode: insertPage.devMode !== undefined ? insertPage.devMode : true // 默認為開發模式
    };
    this.pages.set(id, page);
    return page;
  }

  async updatePage(id: number, updateData: Partial<Page>): Promise<Page> {
    const page = await this.getPageById(id);
    if (!page) {
      throw new Error(`Page with id ${id} not found`);
    }
    
    const updatedPage = { ...page, ...updateData };
    this.pages.set(id, updatedPage);
    return updatedPage;
  }

  async deletePage(id: number): Promise<boolean> {
    return this.pages.delete(id);
  }

  // Post operations
  async getPosts(pageId: string): Promise<Post[]> {
    console.log(`獲取頁面貼文: 頁面ID=${pageId}`);
    
    const allPosts = Array.from(this.posts.values());
    console.log(`系統中總貼文數: ${allPosts.length}`);
    
    const filteredPosts = allPosts.filter((post) => {
      const matchesPage = post.pageId === pageId;
      const notDeleted = !post.isDeleted;
      
      if (matchesPage && notDeleted) {
        console.log(`找到符合的貼文 ID=${post.id}, 狀態=${post.status}`);
        return true;
      }
      
      if (matchesPage && post.isDeleted) {
        console.log(`找到已刪除的貼文 ID=${post.id}, 頁面=${post.pageId}`);
      }
      
      return false;
    });
    
    console.log(`找到頁面 ${pageId} 的非刪除貼文: ${filteredPosts.length}個`);
    
    return filteredPosts.sort((a, b) => {
      if (a.scheduledTime && b.scheduledTime) {
        return a.scheduledTime.getTime() - b.scheduledTime.getTime();
      }
      if (a.scheduledTime) return -1;
      if (b.scheduledTime) return 1;
      
      if (a.publishedTime && b.publishedTime) {
        return b.publishedTime.getTime() - a.publishedTime.getTime();
      }
      if (a.publishedTime) return -1;
      if (b.publishedTime) return 1;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async getPostById(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPostByPostId(postId: string): Promise<Post | undefined> {
    return Array.from(this.posts.values()).find(
      (post) => post.postId === postId
    );
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postId++;
    
    // 確定媒體類型
    let mediaType = null;
    if (insertPost.imageUrl) {
      mediaType = "image";
    } else if (insertPost.videoUrl) {
      mediaType = "video";
    }
    
    // 建立媒體URL陣列
    const mediaUrls = [];
    if (insertPost.imageUrl) {
      mediaUrls.push(insertPost.imageUrl);
    }
    if (insertPost.videoUrl) {
      mediaUrls.push(insertPost.videoUrl);
    }
    
    const post: Post = {
      ...insertPost,
      id,
      postId: null,
      scheduledTime: insertPost.scheduledTime || null,
      endTime: insertPost.endTime || null,
      imageUrl: insertPost.imageUrl || null,
      videoUrl: insertPost.videoUrl || null,
      linkUrl: insertPost.linkUrl || null,
      linkTitle: insertPost.linkTitle || null,
      linkDescription: insertPost.linkDescription || null,
      linkImageUrl: insertPost.linkImageUrl || null,
      category: insertPost.category || null,
      platformContent: insertPost.platformContent || { fb: "", ig: "", tiktok: "", threads: "", x: "" } as PlatformContent,
      platformStatus: insertPost.platformStatus || { fb: false, ig: false, tiktok: false, threads: false, x: false } as PlatformStatus,
      // 新增 Facebook Graph API 相關字段
      fbPostId: null,
      mediaUrls,
      mediaType,
      // 其他字段
      reminderSent: false,
      reminderTime: insertPost.scheduledTime ? new Date(insertPost.scheduledTime.getTime() - 24 * 60 * 60 * 1000) : null, // Set reminder 1 day before
      isCompleted: false,
      completedTime: null,
      isDeleted: false, // 默認未刪除
      deletedAt: null, // 默認刪除時間為 null
      createdAt: new Date(),
      publishedTime: null,
      updatedAt: new Date(),
      author: insertPost.author || null,
      publishedBy: null
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: number, updateData: Partial<Post>): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    const updatedPost = { 
      ...post, 
      ...updateData,
      updatedAt: new Date()
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    const post = await this.getPostById(id);
    if (!post) {
      return false;
    }
    
    console.log(`正在軟刪除貼文 ID=${id}`);
    const updatedPost = { 
      ...post, 
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    };
    this.posts.set(id, updatedPost);
    console.log(`貼文軟刪除結果:`, { 
      id: updatedPost.id, 
      isDeleted: updatedPost.isDeleted, 
      deletedAt: updatedPost.deletedAt 
    });
    return true;
  }

  async restorePost(id: number, targetPageId?: string): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    if (!post.isDeleted) {
      throw new Error(`Post with id ${id} is not deleted`);
    }
    
    console.log(`開始還原貼文 ID=${id}, 原頁面=${post.pageId}, 目標頁面=${targetPageId || '未指定'}`);
    
    // 如果這是測試頁面的貼文，將它關聯到實際頁面
    let pageId = post.pageId;
    let needUpdatePostId = false;
    
    if (pageId === "page_123456") {
      if (targetPageId && targetPageId !== "page_123456") {
        console.log(`將測試頁面貼文轉移到指定的實際頁面 ${targetPageId}`);
        pageId = targetPageId;
        needUpdatePostId = true;
      } else {
        // 如果沒有指定目標頁面，使用第一個可用的實際頁面
        const activePages = Array.from(this.pages.values())
          .filter(p => p.pageId !== "page_123456" && p.id !== 9999);
        
        if (activePages.length > 0) {
          pageId = activePages[0].pageId;
          console.log(`自動將測試頁面貼文轉移到第一個可用頁面 ${pageId}`);
          needUpdatePostId = true;
        } else {
          console.log(`找不到可用的實際頁面，保持在原測試頁面`);
        }
      }
    }
    
    // 為還原後的貼文生成一個唯一的 postId（如果需要）
    const postId = needUpdatePostId ? 
      `restored_${Date.now()}_${Math.floor(Math.random() * 1000)}` : 
      post.postId;
    
    // 將還原後的貼文狀態設置為"published"，以確保它可以在頁面上顯示
    const status = post.status === "draft" ? "draft" : "published";
    
    const updatedPost = { 
      ...post, 
      pageId: pageId, // 更新頁面ID
      postId: postId, // 更新或保留postId
      status: status, // 設置狀態
      isDeleted: false, // 取消刪除標記
      deletedAt: null,  // 清除刪除時間
      publishedTime: status === "published" ? new Date() : null, // 如果狀態為published，設置發布時間
      updatedAt: new Date()
    };
    
    this.posts.set(id, updatedPost);
    
    console.log(`貼文 ${id} 還原成功，關聯到頁面 ${pageId}，狀態=${status}，postId=${postId}`);
    
    // 打印用於調試
    console.log(`還原後的貼文詳情:`, {
      id: updatedPost.id,
      pageId: updatedPost.pageId,
      postId: updatedPost.postId,
      status: updatedPost.status,
      isDeleted: updatedPost.isDeleted
    });
    
    return updatedPost;
  }

  async getDeletedPosts(pageId: string): Promise<Post[]> {
    console.log(`獲取已刪除貼文: 頁面ID=${pageId}`);
    
    // 如果是測試頁面，則從所有頁面獲取已刪除貼文
    if (pageId === "page_123456") {
      console.log(`這是測試頁面ID，獲取所有已刪除貼文`);
      const allDeletedPosts = Array.from(this.posts.values())
        .filter((post) => post.isDeleted)
        .sort((a, b) => {
          // 按刪除時間排序，最近刪除的放在前面
          return (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0);
        });
        
      console.log(`從所有頁面找到 ${allDeletedPosts.length} 個已刪除貼文`);
      return allDeletedPosts;
    }
    
    // 普通頁面只獲取該頁面的已刪除貼文
    const deletedPosts = Array.from(this.posts.values())
      .filter((post) => post.pageId === pageId && post.isDeleted)
      .sort((a, b) => {
        // 按刪除時間排序，最近刪除的放在前面
        return (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0);
      });
    
    console.log(`從頁面 ${pageId} 找到 ${deletedPosts.length} 個已刪除貼文`);
    return deletedPosts;
  }

  async permanentlyDeletePost(id: number): Promise<boolean> {
    const post = await this.getPostById(id);
    if (!post) {
      return false;
    }
    
    return this.posts.delete(id);
  }

  async getPostsByStatus(pageId: string, status: string): Promise<Post[]> {
    console.log(`獲取頁面 ${pageId} 的 ${status} 狀態貼文`);
    
    const allPosts = Array.from(this.posts.values());
    console.log(`系統中總貼文數: ${allPosts.length}`);
    
    const filteredPosts = allPosts.filter((post) => {
      const matchesPage = post.pageId === pageId;
      const matchesStatus = post.status === status;
      const notDeleted = !post.isDeleted;
      
      if (matchesPage && matchesStatus && notDeleted) {
        console.log(`找到符合的貼文 ID=${post.id}, 頁面=${post.pageId}, 狀態=${post.status}`);
        return true;
      }
      
      return false;
    });
    
    console.log(`找到頁面 ${pageId} 的 ${status} 狀態貼文: ${filteredPosts.length}個`);
    
    return filteredPosts.sort((a, b) => {
      if (status === "scheduled" && a.scheduledTime && b.scheduledTime) {
        // 確保日期是Date對象
        const timeA = a.scheduledTime instanceof Date ? a.scheduledTime : new Date(a.scheduledTime);
        const timeB = b.scheduledTime instanceof Date ? b.scheduledTime : new Date(b.scheduledTime);
        return timeA.getTime() - timeB.getTime();
      }
      // 確保createdAt也是Date對象
      const createdAtA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const createdAtB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return createdAtB.getTime() - createdAtA.getTime();
    });
  }

  async getScheduledPosts(pageId: string): Promise<Post[]> {
    return this.getPostsByStatus(pageId, "scheduled");
  }

  async getPostsNeedingReminders(): Promise<Post[]> {
    const now = new Date();
    return Array.from(this.posts.values()).filter(
      (post) => {
        if (post.status !== "scheduled" || post.reminderTime === null || post.reminderSent || post.isDeleted) {
          return false;
        }
        
        // 確保reminderTime是Date對象
        const reminderTime = post.reminderTime instanceof Date 
          ? post.reminderTime 
          : new Date(post.reminderTime);
        
        return reminderTime <= now;
      }
    );
  }

  async markReminderSent(id: number): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    const updatedPost = { 
      ...post, 
      reminderSent: true,
      updatedAt: new Date()
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async markPostAsCompleted(id: number): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    const updatedPost = { 
      ...post, 
      isCompleted: true,
      completedTime: new Date(),
      updatedAt: new Date()
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async getPostsDueForPublishing(): Promise<Post[]> {
    const now = new Date();
    return Array.from(this.posts.values()).filter(
      (post) => {
        if (post.status !== "scheduled" || post.scheduledTime === null || post.isDeleted) {
          return false;
        }
        // 確保排程時間是Date對象
        const scheduledTime = post.scheduledTime instanceof Date 
          ? post.scheduledTime 
          : new Date(post.scheduledTime);
        
        return scheduledTime <= now;
      }
    );
  }

  async publishToAllPlatforms(id: number): Promise<Post> {
    console.log(`[DEBUG] 開始執行 publishToAllPlatforms，貼文ID: ${id}`);
    
    const post = await this.getPostById(id);
    if (!post) {
      console.error(`[ERROR] 找不到ID為 ${id} 的貼文`);
      throw new Error(`Post with id ${id} not found`);
    }
    
    console.log(`[DEBUG] 找到貼文，目前狀態: ${post.status}，頁面ID: ${post.pageId}`);
    
    // 獲取頁面和用戶信息
    const page = await this.getPageByPageId(post.pageId);
    if (!page) {
      console.error(`[ERROR] 找不到ID為 ${post.pageId} 的頁面`);
      throw new Error(`Page with ID ${post.pageId} not found`);
    }
    
    console.log(`[DEBUG] 找到頁面: ${page.pageName || page.name}，開發模式: ${page.devMode}`);
    
    const user = await this.getUserById(page.userId);
    if (!user) {
      console.error(`[ERROR] 找不到ID為 ${page.userId} 的用戶`);
      throw new Error(`User with ID ${page.userId} not found`);
    }
    
    console.log(`[DEBUG] 找到用戶: ${user.username}`);
    
    
    // 初始化平台狀態
    const updatedPlatformStatus: PlatformStatus = { 
      fb: false, 
      ig: false, 
      tiktok: false, 
      threads: false, 
      x: false 
    };
    
    // 是否有任何平台發布成功
    let anyPlatformSuccess = false;
    
    // 如果有頁面訪問令牌且不是開發模式，實際發布到Facebook
    if (page.accessToken && !page.devMode) {
      try {
        console.log(`嘗試發布到Facebook頁面 ${page.name || page.pageName} (${page.pageId})`);
        
        // 根據媒體類型選擇不同的 Graph API 端點和參數
        let fbGraphUrl = ''; 
        const params = new URLSearchParams();
        
        // 添加共同參數 - 確保使用頁面訪問令牌
        // Facebook API 要求使用頁面訪問令牌而非用戶訪問令牌
        params.append('access_token', page.accessToken);
        
        // 驗證是否為正確的令牌類型 - 接受更多類型的有效令牌前綴
        // Facebook令牌格式隨時可能更改，添加EAANn等新格式支持
        if (!page.accessToken.includes('EAAG') && 
            !page.accessToken.includes('EAAJ') && 
            !page.accessToken.includes('EAANn') && 
            !page.accessToken.includes('EAAB') && 
            !page.accessToken.includes('EAA')) {
          console.warn('警告：可能不是有效的頁面訪問令牌格式');
        }
        
        // 根據貼文內容確定使用哪個 API 端點
        if (post.mediaUrls && post.mediaUrls.length > 0) {
          // 如果有媒體
          if (post.mediaType === 'image') {
            // 圖片貼文 - 有兩種方式：photos 或 feed with link
            if (post.platformContent?.fb && post.platformContent.fb.trim() !== '') {
              // 使用平台特定內容 (如果有)
              params.append('message', post.platformContent.fb);
            } else {
              params.append('message', post.content);
            }
            
            // 使用照片 API 端點
            fbGraphUrl = `https://graph.facebook.com/v18.0/${page.pageId}/photos`;
            
            // 添加圖片 URL
            params.append('url', post.mediaUrls[0]);
          } else if (post.mediaType === 'video') {
            // 視頻貼文
            if (post.platformContent?.fb && post.platformContent.fb.trim() !== '') {
              params.append('description', post.platformContent.fb);
            } else {
              params.append('description', post.content);
            }
            
            // 使用視頻 API 端點
            fbGraphUrl = `https://graph.facebook.com/v18.0/${page.pageId}/videos`;
            
            // 添加視頻 URL (注意：真實場景需要上傳視頻文件，這裡使用公開可訪問的 URL 作為示例)
            params.append('file_url', post.mediaUrls[0]);
          }
        } else {
          // 純文字貼文
          fbGraphUrl = `https://graph.facebook.com/v18.0/${page.pageId}/feed`;
          
          if (post.platformContent?.fb && post.platformContent.fb.trim() !== '') {
            params.append('message', post.platformContent.fb);
          } else {
            params.append('message', post.content);
          }
          
          // 如果有連結
          if (post.linkUrl) {
            params.append('link', post.linkUrl);
            
            if (post.linkTitle) {
              params.append('name', post.linkTitle);
            }
            
            if (post.linkDescription) {
              params.append('description', post.linkDescription);
            }
            
            if (post.linkImageUrl) {
              params.append('picture', post.linkImageUrl);
            }
          }
        }
        
        console.log(`正在向 ${fbGraphUrl} 發送 POST 請求，參數:`, Object.fromEntries(params));
        
        // 發送請求
        const response = await fetch(fbGraphUrl, {
          method: 'POST',
          body: params
        });
        
        // 檢查響應
        if (response.ok) {
          // 解析JSON響應，強制類型轉換以解決TypeScript錯誤
          const result = await response.json() as { id?: string; post_id?: string };
          console.log('Facebook發布成功:', result);
          
          // 更新帖子的社交媒體ID
          if (result.id) {
            post.fbPostId = result.id;
          } else if (result.post_id) {
            post.fbPostId = result.post_id;
          }
          
          // 標記Facebook發布為成功
          updatedPlatformStatus.fb = true;
          anyPlatformSuccess = true;
        } else {
          // 處理 API 錯誤
          let errorMessage = '';
          try {
            const errorData = await response.json();
            errorMessage = JSON.stringify(errorData);
            console.error('Facebook API 錯誤:', errorData);
          } catch (e) {
            const errorText = await response.text();
            errorMessage = errorText;
            console.error('Facebook發布失敗:', errorText);
          }
          throw new Error(`Facebook發布失敗: ${errorMessage}`);
        }
      } catch (error) {
        console.error('Facebook發布過程中出錯:', error);
        // 失敗時不會拋出異常，而是將該平台標記為失敗
      }
    } else {
      console.log(`開發模式=${page.devMode}, 跳過實際Facebook發布，模擬成功`);
      // 在開發模式下，我們模擬成功
      if (page.devMode) {
        updatedPlatformStatus.fb = true;
        anyPlatformSuccess = true;
        
        // 在開發模式下，生成一個模擬的 Facebook 帖子 ID
        if (!post.fbPostId) {
          post.fbPostId = `dev_fb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }
      }
    }
    
    // 在這裡添加其他平台的發布邏輯（Instagram, TikTok等）
    // 為簡化，我們暫時將Instagram標記為與fb相同的狀態，其他平台標記為不支持
    updatedPlatformStatus.ig = updatedPlatformStatus.fb; // 假設 Instagram 與 Facebook 一起發布
    updatedPlatformStatus.tiktok = false; // 暫時不支持TikTok
    updatedPlatformStatus.threads = false; // 暫時不支持Threads
    updatedPlatformStatus.x = false; // 暫時不支持X
    
    // 更新帖子狀態
    console.log(`[DEBUG] 更新貼文狀態，平台發布狀態：FB=${updatedPlatformStatus.fb}, IG=${updatedPlatformStatus.ig}`);
    console.log(`[DEBUG] 任何平台發布成功：${anyPlatformSuccess}, 當前貼文狀態: ${post.status}`);
    
    // 構建更新的貼文對象
    const updatedPost = { 
      ...post, 
      fbPostId: post.fbPostId, // 確保保留已更新的 Facebook 帖子 ID
      platformStatus: updatedPlatformStatus,
      // 根據發布結果設定狀態
      status: anyPlatformSuccess ? "published" : "publish_failed",
      publishedTime: anyPlatformSuccess ? new Date() : null,
      updatedAt: new Date()
    };
    
    console.log(`[DEBUG] 最終更新後的貼文狀態: ${updatedPost.status}, 發布時間: ${updatedPost.publishedTime}`);
    
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  // Post Analytics Operations
  async getPostAnalytics(postId: string): Promise<PostAnalytics | undefined> {
    return Array.from(this.postAnalytics.values()).find(
      (analytics) => analytics.postId === postId
    );
  }

  async createPostAnalytics(insertAnalytics: InsertPostAnalytics): Promise<PostAnalytics> {
    const id = this.postAnalyticsId++;
    const analytics: PostAnalytics = { 
      ...insertAnalytics, 
      id,
      likeCount: insertAnalytics.likeCount || 0,
      commentCount: insertAnalytics.commentCount || 0,
      shareCount: insertAnalytics.shareCount || 0,
      viewCount: insertAnalytics.viewCount || 0,
      likes: insertAnalytics.likes || 0,
      comments: insertAnalytics.comments || 0,
      shares: insertAnalytics.shares || 0,
      reach: insertAnalytics.reach || 0,
      engagementRate: insertAnalytics.engagementRate || "0",
      clickCount: insertAnalytics.clickCount || 0,
      lastUpdated: new Date()
    };
    this.postAnalytics.set(id, analytics);
    return analytics;
  }

  async updatePostAnalytics(postId: string, updateData: Partial<PostAnalytics>): Promise<PostAnalytics> {
    const analytics = await this.getPostAnalytics(postId);
    if (!analytics) {
      throw new Error(`PostAnalytics for post ${postId} not found`);
    }
    
    const updatedAnalytics = { 
      ...analytics, 
      ...updateData,
      lastUpdated: new Date()
    };
    this.postAnalytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }

  // Page Analytics Operations
  async getPageAnalytics(pageId: string): Promise<PageAnalytics | undefined> {
    return Array.from(this.pageAnalytics.values()).find(
      (analytics) => analytics.pageId === pageId
    );
  }

  async createPageAnalytics(insertAnalytics: InsertPageAnalytics): Promise<PageAnalytics> {
    const id = this.pageAnalyticsId++;
    const analytics: PageAnalytics = { 
      ...insertAnalytics, 
      id,
      totalLikes: insertAnalytics.totalLikes || 0,
      totalComments: insertAnalytics.totalComments || 0,
      totalShares: insertAnalytics.totalShares || 0,
      pageViews: insertAnalytics.pageViews || 0,
      reachCount: insertAnalytics.reachCount || 0,
      engagementRate: insertAnalytics.engagementRate || "0",
      demographicsData: insertAnalytics.demographicsData || "{}",
      lastUpdated: new Date()
    };
    this.pageAnalytics.set(id, analytics);
    return analytics;
  }

  async updatePageAnalytics(pageId: string, updateData: Partial<PageAnalytics>): Promise<PageAnalytics> {
    const analytics = await this.getPageAnalytics(pageId);
    if (!analytics) {
      throw new Error(`PageAnalytics for page ${pageId} not found`);
    }
    
    const updatedAnalytics = { 
      ...analytics, 
      ...updateData,
      lastUpdated: new Date()
    };
    this.pageAnalytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }

  private initSampleMarketingTasks() {
    // Marketing tasks sample data
    const marketingTask1: MarketingTask = {
      id: this.marketingTaskId++,
      title: "社群媒體贈品活動",
      description: "設計並執行一項社群媒體贈品活動，以增加品牌知名度和參與度",
      content: "活動將包括用戶分享我們的貼文並標記朋友的要求。我們將贈送5份產品套裝給隨機選中的參與者。",
      status: "pending",
      category: "social-media",
      priority: "high",
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "行銷經理",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.marketingTasks.set(marketingTask1.id, marketingTask1);
    
    const marketingTask2: MarketingTask = {
      id: this.marketingTaskId++,
      title: "電子郵件行銷活動",
      description: "建立一個電子郵件序列，向訂閱者推廣我們的夏季銷售",
      content: "設計一系列5封電子郵件，逐步介紹我們的新產品線和特別優惠。每週發送一次，為期5週。",
      status: "in-progress",
      category: "email",
      priority: "normal",
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "內容策略師",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };
    this.marketingTasks.set(marketingTask2.id, marketingTask2);
    
    const marketingTask3: MarketingTask = {
      id: this.marketingTaskId++,
      title: "與影響者合作",
      description: "與行業影響者合作推廣我們的產品",
      content: "確定5位相關影響者，與他們聯繫關於產品評論和推廣的事宜。準備產品樣品和簡報材料。",
      status: "pending",
      category: "partnership",
      priority: "normal",
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "社群媒體經理",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.marketingTasks.set(marketingTask3.id, marketingTask3);
    
    const marketingTask4: MarketingTask = {
      id: this.marketingTaskId++,
      title: "內容行事曆開發",
      description: "為下一季度建立詳細的內容行事曆",
      content: "建立一個包括博客文章、社群媒體更新、電子郵件通訊和其他內容資產的詳細時間表。與產品和銷售團隊協調，確保內容與整體業務目標一致。",
      status: "completed",
      category: "content",
      priority: "high",
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      reminderSent: true,
      createdBy: "內容經理",
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    };
    this.marketingTasks.set(marketingTask4.id, marketingTask4);
  }
  
  private initSampleOperationTasks() {
    // Operation tasks sample data
    const operationTask1: OperationTask = {
      id: this.operationTaskId++,
      title: "更新網站安全措施",
      content: "升級網站的安全協議，包括實施HTTPS和更新密碼策略",
      status: "待處理",
      category: "一般",
      priority: "高",
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "IT主管",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.operationTasks.set(operationTask1.id, operationTask1);
    
    const operationTask2: OperationTask = {
      id: this.operationTaskId++,
      title: "辦公設備維護",
      content: "按照維護計劃檢查和維護所有辦公設備",
      status: "進行中",
      category: "設備維護",
      priority: "中",
      startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "辦公室管理員",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    };
    this.operationTasks.set(operationTask2.id, operationTask2);
    
    const operationTask3: OperationTask = {
      id: this.operationTaskId++,
      title: "招聘新的社群媒體專員",
      content: "編寫職位描述，發布職位，審核申請人，並進行面試",
      status: "待處理",
      category: "人員調度",
      priority: "高",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "人力資源經理",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.operationTasks.set(operationTask3.id, operationTask3);
    
    const operationTask4: OperationTask = {
      id: this.operationTaskId++,
      title: "更新供應鏈管理軟件",
      content: "評估，選擇並實施新的供應鏈管理系統",
      status: "已延遲",
      category: "一般",
      priority: "中",
      startTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      reminderSent: true,
      createdBy: "運營經理",
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };
    this.operationTasks.set(operationTask4.id, operationTask4);
    
    const operationTask5: OperationTask = {
      id: this.operationTaskId++,
      title: "辦公用品採購",
      content: "訂購紙張、筆、墨水和其他必要的辦公用品",
      status: "已完成",
      category: "物資管理",
      priority: "低",
      startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      reminderSent: true,
      createdBy: "辦公室管理員",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    };
    this.operationTasks.set(operationTask5.id, operationTask5);
    
    const operationTask6: OperationTask = {
      id: this.operationTaskId++,
      title: "年度預算規劃",
      content: "編制下一財年的運營預算",
      status: "待處理",
      category: "一般",
      priority: "高",
      startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdBy: "財務總監",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.operationTasks.set(operationTask6.id, operationTask6);
  }
  
  private initSampleOnelinkFields() {
    // Onelink fields sample data
    const onelinkField1: OnelinkField = {
      id: this.onelinkFieldId++,
      platform: "facebook",
      campaignCode: "spring_promo_23",
      materialId: "ad_set_001",
      adSet: "interests_garden",
      adName: "spring_collection_ad1",
      audienceTag: "homeowners",
      creativeSize: "1200x628",
      adPlacement: "feed",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onelinkFields.set(onelinkField1.id, onelinkField1);
    
    const onelinkField2: OnelinkField = {
      id: this.onelinkFieldId++,
      platform: "instagram",
      campaignCode: "summer_sale_23",
      materialId: "story_ad_002",
      adSet: "age_25_34",
      adName: "summer_discount_story",
      audienceTag: "gardening_enthusiasts",
      creativeSize: "1080x1920",
      adPlacement: "story",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onelinkFields.set(onelinkField2.id, onelinkField2);
  }
  
  private initSampleVendors() {
    // Vendors sample data
    const vendor1: Vendor = {
      id: this.vendorId++,
      name: "花園用品供應商",
      contactPerson: "王經理",
      phone: "0912345678",
      email: "wang@gardensupp.example.com",
      chatApp: "Line",
      chatId: "wang_garden",
      address: "台北市信義區松仁路100號",
      note: "主要園藝工具和花園用品供應商，通常需要提前兩週下訂單",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vendors.set(vendor1.id, vendor1);
    
    const vendor2: Vendor = {
      id: this.vendorId++,
      name: "綠色植物批發商",
      contactPerson: "林小姐",
      phone: "0987654321",
      email: "lin@greenplant.example.com",
      chatApp: "WeChat",
      chatId: "lin_plant",
      address: "新北市三重區重新路200號",
      note: "各種室內和室外植物的批發商，每週一和週四有新貨",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vendors.set(vendor2.id, vendor2);
  }
  
  private initSampleUserGroups() {
    // 創建管理員群組
    const adminGroup: UserGroup = {
      id: this.userGroupId++,
      name: "管理員",
      description: "系統管理員群組，擁有所有權限",
      permissions: Object.values(Permission) as Permission[],
      createdAt: new Date(),
      updatedAt: null
    };
    this.userGroups.set(adminGroup.id, adminGroup);
    
    // 創建專案經理群組
    const pmGroup: UserGroup = {
      id: this.userGroupId++,
      name: "專案經理",
      description: "專案經理群組，擁有管理貼文、頁面、行銷和營運的權限",
      permissions: [
        Permission.MANAGE_PAGES,
        Permission.CREATE_PAGE,
        Permission.EDIT_PAGE,
        Permission.CREATE_POST,
        Permission.EDIT_POST,
        Permission.DELETE_POST,
        Permission.PUBLISH_POST,
        Permission.MANAGE_MARKETING,
        Permission.CREATE_MARKETING_TASK,
        Permission.EDIT_MARKETING_TASK,
        Permission.DELETE_MARKETING_TASK,
        Permission.MANAGE_OPERATIONS,
        Permission.CREATE_OPERATION_TASK,
        Permission.EDIT_OPERATION_TASK,
        Permission.DELETE_OPERATION_TASK,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA
      ],
      createdAt: new Date(),
      updatedAt: null
    };
    this.userGroups.set(pmGroup.id, pmGroup);
    
    // 創建一般用戶群組
    const userGroup: UserGroup = {
      id: this.userGroupId++,
      name: "一般用戶",
      description: "一般用戶群組，僅擁有基本操作權限",
      permissions: [
        Permission.CREATE_POST,
        Permission.EDIT_POST,
        Permission.VIEW_ANALYTICS
      ],
      createdAt: new Date(),
      updatedAt: null
    };
    this.userGroups.set(userGroup.id, userGroup);
    
    // 將現有用戶加入到對應群組
    const users = Array.from(this.users.values());
    for (const user of users) {
      const membershipId = this.userGroupMembershipId++;
      let groupId = userGroup.id; // 預設為一般用戶群組
      
      if (user.role === UserRole.ADMIN) {
        groupId = adminGroup.id;
      } else if (user.role === UserRole.PM) {
        groupId = pmGroup.id;
      }
      
      const membership: UserGroupMembership = {
        id: membershipId,
        userId: user.id,
        groupId: groupId,
        createdAt: new Date()
      };
      
      this.userGroupMemberships.set(membershipId, membership);
    }
  }
  
  // 營銷模組操作
  async getMarketingTasks(): Promise<MarketingTask[]> {
    return Array.from(this.marketingTasks.values());
  }
  
  async getMarketingTaskById(id: number): Promise<MarketingTask | undefined> {
    return this.marketingTasks.get(id);
  }
  
  async getMarketingTasksByStatus(status: string): Promise<MarketingTask[]> {
    return Array.from(this.marketingTasks.values()).filter(
      (task) => task.status === status
    );
  }
  
  async getMarketingTasksByCategory(category: string): Promise<MarketingTask[]> {
    return Array.from(this.marketingTasks.values()).filter(
      (task) => task.category === category
    );
  }
  
  async createMarketingTask(task: InsertMarketingTask): Promise<MarketingTask> {
    const id = this.marketingTaskId++;
    const newTask: MarketingTask = {
      ...task,
      id,
      status: task.status || "pending",
      content: task.content || null,
      description: task.description || null,
      priority: task.priority || "normal",
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: task.createdBy || null
    };
    this.marketingTasks.set(id, newTask);
    return newTask;
  }
  
  async updateMarketingTask(id: number, task: Partial<MarketingTask>): Promise<MarketingTask> {
    const existingTask = await this.getMarketingTaskById(id);
    if (!existingTask) {
      throw new Error(`Marketing task with id ${id} not found`);
    }
    
    const updatedTask = { 
      ...existingTask, 
      ...task,
      updatedAt: new Date()
    };
    this.marketingTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteMarketingTask(id: number): Promise<boolean> {
    return this.marketingTasks.delete(id);
  }
  
  async getMarketingTasksNeedingReminders(): Promise<MarketingTask[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return Array.from(this.marketingTasks.values()).filter(
      (task) => 
        !task.reminderSent && 
        task.startTime > now && 
        task.startTime < tomorrow
    );
  }
  
  async markMarketingTaskReminderSent(id: number): Promise<MarketingTask> {
    const task = await this.getMarketingTaskById(id);
    if (!task) {
      throw new Error(`Marketing task with id ${id} not found`);
    }
    
    const updatedTask = { 
      ...task, 
      reminderSent: true,
      updatedAt: new Date()
    };
    this.marketingTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // 營運模組操作
  async getOperationTasks(): Promise<OperationTask[]> {
    return Array.from(this.operationTasks.values());
  }
  
  async getOperationTaskById(id: number): Promise<OperationTask | undefined> {
    return this.operationTasks.get(id);
  }
  
  async getOperationTasksByStatus(status: string): Promise<OperationTask[]> {
    return Array.from(this.operationTasks.values()).filter(
      (task) => task.status === status
    );
  }
  
  async getOperationTasksByCategory(category: string): Promise<OperationTask[]> {
    return Array.from(this.operationTasks.values()).filter(
      (task) => task.category === category
    );
  }
  
  async createOperationTask(task: InsertOperationTask): Promise<OperationTask> {
    const id = this.operationTaskId++;
    const newTask: OperationTask = {
      ...task,
      id,
      status: task.status || "待處理",
      content: task.content || null,
      priority: task.priority || "中",
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: task.createdBy || null
    };
    this.operationTasks.set(id, newTask);
    return newTask;
  }
  
  async updateOperationTask(id: number, task: Partial<OperationTask>): Promise<OperationTask> {
    const existingTask = await this.getOperationTaskById(id);
    if (!existingTask) {
      throw new Error(`Operation task with id ${id} not found`);
    }
    
    const updatedTask = { 
      ...existingTask, 
      ...task,
      updatedAt: new Date()
    };
    this.operationTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteOperationTask(id: number): Promise<boolean> {
    return this.operationTasks.delete(id);
  }
  
  async getOperationTasksNeedingReminders(): Promise<OperationTask[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return Array.from(this.operationTasks.values()).filter(
      (task) => 
        !task.reminderSent && 
        task.startTime > now && 
        task.startTime < tomorrow
    );
  }
  
  async markOperationTaskReminderSent(id: number): Promise<OperationTask> {
    const task = await this.getOperationTaskById(id);
    if (!task) {
      throw new Error(`Operation task with id ${id} not found`);
    }
    
    const updatedTask = { 
      ...task, 
      reminderSent: true,
      updatedAt: new Date()
    };
    this.operationTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // Onelink AppsFlyer 操作
  async getOnelinkFields(): Promise<OnelinkField[]> {
    return Array.from(this.onelinkFields.values());
  }
  
  async getOnelinkFieldById(id: number): Promise<OnelinkField | undefined> {
    return this.onelinkFields.get(id);
  }
  
  async createOnelinkField(field: InsertOnelinkField): Promise<OnelinkField> {
    const id = this.onelinkFieldId++;
    const newField: OnelinkField = {
      ...field,
      id,
      adSet: field.adSet || null,
      adName: field.adName || null,
      audienceTag: field.audienceTag || null,
      creativeSize: field.creativeSize || null,
      adPlacement: field.adPlacement || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onelinkFields.set(id, newField);
    return newField;
  }
  
  async updateOnelinkField(id: number, field: Partial<OnelinkField>): Promise<OnelinkField> {
    const existingField = await this.getOnelinkFieldById(id);
    if (!existingField) {
      throw new Error(`Onelink field with id ${id} not found`);
    }
    
    const updatedField = { 
      ...existingField, 
      ...field,
      updatedAt: new Date()
    };
    this.onelinkFields.set(id, updatedField);
    return updatedField;
  }
  
  async deleteOnelinkField(id: number): Promise<boolean> {
    return this.onelinkFields.delete(id);
  }
  
  // 廠商聯絡表操作
  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }
  
  async getVendorById(id: number): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }
  
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = this.vendorId++;
    const newVendor: Vendor = {
      ...vendor,
      id,
      contactPerson: vendor.contactPerson || null,
      phone: vendor.phone || null,
      email: vendor.email || null,
      chatApp: vendor.chatApp || null,
      chatId: vendor.chatId || null,
      address: vendor.address || null,
      note: vendor.note || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vendors.set(id, newVendor);
    return newVendor;
  }
  
  async updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor> {
    const existingVendor = await this.getVendorById(id);
    if (!existingVendor) {
      throw new Error(`Vendor with id ${id} not found`);
    }
    
    const updatedVendor = { 
      ...existingVendor, 
      ...vendor,
      updatedAt: new Date()
    };
    this.vendors.set(id, updatedVendor);
    return updatedVendor;
  }
  
  async deleteVendor(id: number): Promise<boolean> {
    return this.vendors.delete(id);
  }
  
  // 用戶群組操作方法
  async getUserGroups(): Promise<UserGroup[]> {
    return Array.from(this.userGroups.values());
  }
  
  async getUserGroupById(id: number): Promise<UserGroup | undefined> {
    return this.userGroups.get(id);
  }
  
  async createUserGroup(group: InsertUserGroup): Promise<UserGroup> {
    const id = this.userGroupId++;
    const newGroup: UserGroup = {
      id,
      name: group.name,
      description: group.description || null,
      permissions: group.permissions || {},
      createdAt: new Date(),
      updatedAt: null
    };
    this.userGroups.set(id, newGroup);
    return newGroup;
  }
  
  async updateUserGroup(id: number, groupData: Partial<UserGroup>): Promise<UserGroup> {
    const group = await this.getUserGroupById(id);
    if (!group) {
      throw new Error(`用戶群組 ID ${id} 不存在`);
    }
    
    const updatedGroup = {
      ...group,
      ...groupData,
      updatedAt: new Date()
    };
    this.userGroups.set(id, updatedGroup);
    return updatedGroup;
  }
  
  async deleteUserGroup(id: number): Promise<boolean> {
    // 檢查是否有用戶關聯到此群組
    const memberships = Array.from(this.userGroupMemberships.values())
      .filter(membership => membership.groupId === id);
    
    if (memberships.length > 0) {
      throw new Error(`無法刪除群組，有 ${memberships.length} 個用戶屬於此群組`);
    }
    
    return this.userGroups.delete(id);
  }
  
  // 用戶-群組關係操作方法
  async getUserGroupMemberships(userId: number): Promise<UserGroupMembership[]> {
    return Array.from(this.userGroupMemberships.values())
      .filter(membership => membership.userId === userId);
  }
  
  async getUsersInGroup(groupId: number): Promise<User[]> {
    const memberships = Array.from(this.userGroupMemberships.values())
      .filter(membership => membership.groupId === groupId);
    
    const userIds = memberships.map(membership => membership.userId);
    const users: User[] = [];
    
    for (const userId of userIds) {
      const user = await this.getUser(userId);
      if (user) {
        users.push(user);
      }
    }
    
    return users;
  }
  
  async addUserToGroup(userId: number, groupId: number): Promise<UserGroupMembership> {
    // 檢查用戶和群組是否存在
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`用戶 ID ${userId} 不存在`);
    }
    
    const group = await this.getUserGroupById(groupId);
    if (!group) {
      throw new Error(`群組 ID ${groupId} 不存在`);
    }
    
    // 檢查用戶是否已在群組中
    const existingMemberships = await this.getUserGroupMemberships(userId);
    const alreadyInGroup = existingMemberships.some(m => m.groupId === groupId);
    
    if (alreadyInGroup) {
      throw new Error(`用戶 ID ${userId} 已經是群組 ID ${groupId} 的成員`);
    }
    
    // 添加用戶到群組
    const id = this.userGroupMembershipId++;
    const membership: UserGroupMembership = {
      id,
      userId,
      groupId,
      createdAt: new Date()
    };
    
    this.userGroupMemberships.set(id, membership);
    return membership;
  }
  
  async removeUserFromGroup(userId: number, groupId: number): Promise<boolean> {
    const memberships = await this.getUserGroupMemberships(userId);
    const membershipToRemove = memberships.find(m => m.groupId === groupId);
    
    if (!membershipToRemove) {
      throw new Error(`用戶 ID ${userId} 不是群組 ID ${groupId} 的成員`);
    }
    
    return this.userGroupMemberships.delete(membershipToRemove.id);
  }
}

export const storage = new MemStorage();