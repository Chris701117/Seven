import { 
  users, type User, type InsertUser,
  pages, type Page, type InsertPage,
  posts, type Post, type InsertPost,
  postAnalytics, type PostAnalytics, type InsertPostAnalytics,
  pageAnalytics, type PageAnalytics, type InsertPageAnalytics,
  marketingTasks, type MarketingTask, type InsertMarketingTask,
  operationTasks, type OperationTask, type InsertOperationTask,
  onelinkFields, type OnelinkField, type InsertOnelinkField,
  vendors, type Vendor, type InsertVendor,
  type PlatformContent, type PlatformStatus
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAccessToken(id: number, accessToken: string, fbUserId: string): Promise<User>;

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
  deletePost(id: number): Promise<boolean>;
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
  
  private userId: number;
  private pageId: number;
  private postId: number;
  private postAnalyticsId: number;
  private pageAnalyticsId: number;
  private marketingTaskId: number;
  private operationTaskId: number;
  private onelinkFieldId: number;
  private vendorId: number;

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
    
    this.userId = 1;
    this.pageId = 1;
    this.postId = 1;
    this.postAnalyticsId = 1;
    this.pageAnalyticsId = 1;
    this.marketingTaskId = 1;
    this.operationTaskId = 1;
    this.onelinkFieldId = 1;
    this.vendorId = 1;
    
    // Add sample data
    this.initSampleData();
    this.initSampleMarketingTasks();
    this.initSampleOperationTasks();
    this.initSampleOnelinkFields();
    this.initSampleVendors();
  }

  private initSampleData() {
    // Create a sample user
    const user: User = {
      id: this.userId++,
      username: "demouser",
      password: "password123",
      displayName: "示範用戶",
      email: "demo@example.com",
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id, 
      displayName: insertUser.displayName || null,
      email: insertUser.email || null,
      accessToken: null, 
      fbUserId: null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserAccessToken(id: number, accessToken: string, fbUserId: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser = { ...user, accessToken, fbUserId };
    this.users.set(id, updatedUser);
    return updatedUser;
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
      .filter((post) => post.pageId === pageId)
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
    
    const updatedPost = { ...post, ...updateData, updatedAt: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }

  async getPostsByStatus(pageId: string, status: string): Promise<Post[]> {
    return (await this.getPosts(pageId)).filter(post => post.status === status);
  }

  async getScheduledPosts(pageId: string): Promise<Post[]> {
    return (await this.getPosts(pageId)).filter(
      post => post.status === "scheduled" && post.scheduledTime !== null
    );
  }
  
  // Get posts that need reminders
  async getPostsNeedingReminders(): Promise<Post[]> {
    const now = new Date();
    return Array.from(this.posts.values()).filter(
      post => post.status === "scheduled" && 
              post.reminderTime !== null && 
              !post.reminderSent &&
              post.reminderTime <= now
    );
  }
  
  // Mark a post as having had its reminder sent
  async markReminderSent(id: number): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    const updatedPost = { ...post, reminderSent: true, updatedAt: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }
  
  // Mark a post as completed (actually published)
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
  
  // Get posts that are due to be published
  async getPostsDueForPublishing(): Promise<Post[]> {
    const now = new Date();
    return Array.from(this.posts.values()).filter(
      post => post.status === "scheduled" && 
              post.scheduledTime !== null && 
              !post.isCompleted &&
              post.scheduledTime <= now
    );
  }
  
  // 一鍵發布功能（發布到所有平台）
  async publishToAllPlatforms(id: number): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    
    // 更新各平台狀態
    const updatedPlatformStatus: PlatformStatus = post.platformStatus 
      ? { ...post.platformStatus as PlatformStatus }
      : { fb: false, ig: false, tiktok: false, threads: false, x: false };
      
    updatedPlatformStatus.fb = true;
    updatedPlatformStatus.ig = true;
    updatedPlatformStatus.tiktok = true;
    updatedPlatformStatus.threads = true;
    updatedPlatformStatus.x = true;
    
    const updatedPost = { 
      ...post, 
      status: "published", 
      platformStatus: updatedPlatformStatus,
      isCompleted: true, 
      completedTime: new Date(),
      publishedTime: new Date(),
      updatedAt: new Date() 
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  // Post Analytics operations
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
      engagementRate: insertAnalytics.engagementRate || null,
      clickCount: insertAnalytics.clickCount || 0,
      lastUpdated: new Date()
    };
    this.postAnalytics.set(id, analytics);
    return analytics;
  }

  async updatePostAnalytics(postId: string, updateData: Partial<PostAnalytics>): Promise<PostAnalytics> {
    const analytics = await this.getPostAnalytics(postId);
    if (!analytics) {
      throw new Error(`Analytics for post ${postId} not found`);
    }
    
    const updatedAnalytics = {
      ...analytics,
      ...updateData,
      lastUpdated: new Date()
    };
    this.postAnalytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }

  // Page Analytics operations
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
      engagementRate: insertAnalytics.engagementRate || null,
      demographicsData: insertAnalytics.demographicsData || null,
      lastUpdated: new Date()
    };
    this.pageAnalytics.set(id, analytics);
    return analytics;
  }

  async updatePageAnalytics(pageId: string, updateData: Partial<PageAnalytics>): Promise<PageAnalytics> {
    const analytics = await this.getPageAnalytics(pageId);
    if (!analytics) {
      throw new Error(`Analytics for page ${pageId} not found`);
    }
    
    const updatedAnalytics = {
      ...analytics,
      ...updateData,
      lastUpdated: new Date()
    };
    this.pageAnalytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }

  // 行銷模組操作
  async getMarketingTasks(): Promise<MarketingTask[]> {
    return Array.from(this.marketingTasks.values()).sort((a, b) => {
      if (a.status === "已完成" && b.status !== "已完成") return 1;
      if (a.status !== "已完成" && b.status === "已完成") return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }

  async getMarketingTaskById(id: number): Promise<MarketingTask | undefined> {
    return this.marketingTasks.get(id);
  }

  async getMarketingTasksByStatus(status: string): Promise<MarketingTask[]> {
    return Array.from(this.marketingTasks.values()).filter(
      task => task.status === status
    );
  }

  async getMarketingTasksByCategory(category: string): Promise<MarketingTask[]> {
    return Array.from(this.marketingTasks.values()).filter(
      task => task.category === category
    );
  }

  async createMarketingTask(task: InsertMarketingTask): Promise<MarketingTask> {
    const id = this.marketingTaskId++;
    const newTask: MarketingTask = {
      ...task,
      id,
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date()
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
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return Array.from(this.marketingTasks.values()).filter(
      task => task.status !== "已完成" && 
              !task.reminderSent &&
              new Date(task.startTime) <= tomorrow
    );
  }

  async markMarketingTaskReminderSent(id: number): Promise<MarketingTask> {
    const task = await this.getMarketingTaskById(id);
    if (!task) {
      throw new Error(`Marketing task with id ${id} not found`);
    }
    
    const updatedTask = { ...task, reminderSent: true, updatedAt: new Date() };
    this.marketingTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // 營運模組操作
  async getOperationTasks(): Promise<OperationTask[]> {
    return Array.from(this.operationTasks.values()).sort((a, b) => {
      if (a.status === "已完成" && b.status !== "已完成") return 1;
      if (a.status !== "已完成" && b.status === "已完成") return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }

  async getOperationTaskById(id: number): Promise<OperationTask | undefined> {
    return this.operationTasks.get(id);
  }

  async getOperationTasksByStatus(status: string): Promise<OperationTask[]> {
    return Array.from(this.operationTasks.values()).filter(
      task => task.status === status
    );
  }

  async getOperationTasksByCategory(category: string): Promise<OperationTask[]> {
    return Array.from(this.operationTasks.values()).filter(
      task => task.category === category
    );
  }

  async createOperationTask(task: InsertOperationTask): Promise<OperationTask> {
    const id = this.operationTaskId++;
    const newTask: OperationTask = {
      ...task,
      id,
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date()
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
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return Array.from(this.operationTasks.values()).filter(
      task => task.status !== "已完成" && 
              !task.reminderSent &&
              new Date(task.startTime) <= tomorrow
    );
  }

  async markOperationTaskReminderSent(id: number): Promise<OperationTask> {
    const task = await this.getOperationTaskById(id);
    if (!task) {
      throw new Error(`Operation task with id ${id} not found`);
    }
    
    const updatedTask = { ...task, reminderSent: true, updatedAt: new Date() };
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

  private initSampleMarketingTasks() {
    // 建立範例行銷任務
    const marketingTask1: MarketingTask = {
      id: this.marketingTaskId++,
      title: "夏季促銷活動",
      status: "進行中",
      content: "策劃夏季促銷活動，包括社交媒體宣傳和電子郵件營銷",
      category: "促銷活動",
      startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: "行銷部門"
    };
    this.marketingTasks.set(marketingTask1.id, marketingTask1);

    const marketingTask2: MarketingTask = {
      id: this.marketingTaskId++,
      title: "內容創作計畫",
      status: "已完成",
      content: "為下個月準備部落格和社交媒體的內容計畫",
      category: "內容策略",
      startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reminderSent: true,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: "內容團隊"
    };
    this.marketingTasks.set(marketingTask2.id, marketingTask2);

    const marketingTask3: MarketingTask = {
      id: this.marketingTaskId++,
      title: "新產品發布會",
      status: "準備中",
      content: "為新產品發布會準備營銷材料和媒體宣傳",
      category: "產品發布",
      startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdBy: "產品經理"
    };
    this.marketingTasks.set(marketingTask3.id, marketingTask3);
  }

  private initSampleOperationTasks() {
    // 建立範例營運任務
    const operationTask1: OperationTask = {
      id: this.operationTaskId++,
      title: "系統更新維護",
      status: "排程中",
      content: "計畫進行服務器和系統的定期維護",
      category: "系統維護",
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      reminderSent: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdBy: "IT部門"
    };
    this.operationTasks.set(operationTask1.id, operationTask1);

    const operationTask2: OperationTask = {
      id: this.operationTaskId++,
      title: "客戶服務培訓",
      status: "進行中",
      content: "為客服團隊組織季度培訓和產品更新講解",
      category: "培訓",
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      reminderSent: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: "客服主管"
    };
    this.operationTasks.set(operationTask2.id, operationTask2);

    const operationTask3: OperationTask = {
      id: this.operationTaskId++,
      title: "庫存管理審查",
      status: "已完成",
      content: "進行月度庫存審查並更新物流系統",
      category: "庫存管理",
      startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      reminderSent: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdBy: "物流主管"
    };
    this.operationTasks.set(operationTask3.id, operationTask3);
  }

  private initSampleOnelinkFields() {
    // 建立範例 Onelink 欄位設定
    const onelinkField1: OnelinkField = {
      id: this.onelinkFieldId++,
      platform: "Facebook",
      campaignCode: "FB_SUM2023",
      materialId: "FB001",
      adSet: "Summer_Conversion",
      adName: "Summer_Sale_Carousel",
      audienceTag: "Interest_Garden",
      creativeSize: "1200x628",
      adPlacement: "Feed",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };
    this.onelinkFields.set(onelinkField1.id, onelinkField1);

    const onelinkField2: OnelinkField = {
      id: this.onelinkFieldId++,
      platform: "Instagram",
      campaignCode: "IG_SUM2023",
      materialId: "IG001",
      adSet: "Summer_Awareness",
      adName: "Summer_Collection_Story",
      audienceTag: "Lookalike_Customers",
      creativeSize: "1080x1920",
      adPlacement: "Stories",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    };
    this.onelinkFields.set(onelinkField2.id, onelinkField2);
  }

  private initSampleVendors() {
    // 建立範例廠商聯絡資料
    const vendor1: Vendor = {
      id: this.vendorId++,
      name: "綠色園藝用品有限公司",
      contactPerson: "張小明",
      phone: "02-2345-6789",
      email: "contact@greengardeningtools.com",
      chatApp: "Line",
      chatId: "@greengardening",
      address: "台北市信義區花園路123號",
      note: "主要供應花園工具和戶外家具",
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    };
    this.vendors.set(vendor1.id, vendor1);

    const vendor2: Vendor = {
      id: this.vendorId++,
      name: "瑞富植栽集團",
      contactPerson: "李大華",
      phone: "02-8765-4321",
      email: "sales@richplants.com",
      chatApp: "WhatsApp",
      chatId: "+886912345678",
      address: "新北市三重區植物街45號",
      note: "室內植物和種子專業供應商",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    };
    this.vendors.set(vendor2.id, vendor2);
  }
}

export const storage = new MemStorage();
