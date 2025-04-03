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
  type PlatformContent, type PlatformStatus
} from "@shared/schema";

// 引入會話和內存存儲相關庫
import session from "express-session";
import createMemoryStore from "memorystore";
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
  updateUserAccessToken(id: number, accessToken: string, fbUserId: string): Promise<User>;
  
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
    
    // 初始化會話存儲
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 每24小時清理過期會話
    });
    
    // Add sample data
    this.initSampleData();
    this.initSampleMarketingTasks();
    this.initSampleOperationTasks();
    this.initSampleOnelinkFields();
    this.initSampleVendors();
  }

  private initSampleData() {
    // Create a sample user with new fields
    const user: User = {
      id: this.userId++,
      username: "demouser",
      password: "password123",
      displayName: "示範用戶",
      email: "demo@example.com",
      role: UserRole.ADMIN,
      isEmailVerified: true, 
      emailVerificationCode: null,
      emailVerificationExpires: null,
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: null,
      invitedBy: null,
      accessToken: "sample_fb_access_token",
      fbUserId: "10123456789"
    };
    this.users.set(user.id, user);

    // Create a sample page
    const page: Page = {
      id: this.pageId++,
      pageId: "page_123456", // 更改為客戶端期望的格式
      pageName: "Home & Garden Tips",
      accessToken: "sample_page_access_token",
      userId: user.id,
      picture: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      pageImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id, 
      displayName: insertUser.displayName || null,
      isEmailVerified: false,
      emailVerificationCode: null,
      emailVerificationExpires: null,
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: null,
      invitedBy: insertUser.invitedBy || null,
      accessToken: null, 
      fbUserId: null 
    };
    this.users.set(id, user);
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
    
    const updatedUser = { 
      ...user, 
      accessToken, 
      fbUserId,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // 邀請相關
  async createInvitation(invitation: InsertInvitation): Promise<typeof invitations.$inferSelect> {
    const id = this.invitationId++;
    const invitationRecord = {
      id,
      ...invitation,
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
      pageImage: insertPage.pageImage || null
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
    return Array.from(this.posts.values())
      .filter((post) => post.pageId === pageId && !post.isDeleted) // 排除已刪除的貼文
      .sort((a, b) => {
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
    
    const updatedPost = { 
      ...post, 
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    };
    this.posts.set(id, updatedPost);
    return true;
  }

  async restorePost(id: number): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    if (!post.isDeleted) {
      throw new Error(`Post with id ${id} is not deleted`);
    }
    
    const updatedPost = { 
      ...post, 
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date()
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async getDeletedPosts(pageId: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter((post) => post.pageId === pageId && post.isDeleted)
      .sort((a, b) => {
        // 按刪除時間排序，最近刪除的放在前面
        return (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0);
      });
  }

  async permanentlyDeletePost(id: number): Promise<boolean> {
    const post = await this.getPostById(id);
    if (!post) {
      return false;
    }
    
    return this.posts.delete(id);
  }

  async getPostsByStatus(pageId: string, status: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter((post) => post.pageId === pageId && post.status === status && !post.isDeleted)
      .sort((a, b) => {
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
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    // 在實際情況中，這裡會調用社交媒體API進行發布
    // 這裡我們只是模擬發布成功
    const updatedPlatformStatus: PlatformStatus = { 
      fb: true, 
      ig: true, 
      tiktok: true, 
      threads: true, 
      x: true 
    };
    
    const updatedPost = { 
      ...post, 
      platformStatus: updatedPlatformStatus,
      status: "published",
      publishedTime: new Date(),
      updatedAt: new Date()
    };
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
}

export const storage = new MemStorage();