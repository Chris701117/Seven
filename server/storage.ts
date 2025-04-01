import { 
  users, type User, type InsertUser,
  pages, type Page, type InsertPage,
  posts, type Post, type InsertPost,
  postAnalytics, type PostAnalytics, type InsertPostAnalytics,
  pageAnalytics, type PageAnalytics, type InsertPageAnalytics
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

  // Post Analytics operations
  getPostAnalytics(postId: string): Promise<PostAnalytics | undefined>;
  createPostAnalytics(analytics: InsertPostAnalytics): Promise<PostAnalytics>;
  updatePostAnalytics(postId: string, analytics: Partial<PostAnalytics>): Promise<PostAnalytics>;

  // Page Analytics operations
  getPageAnalytics(pageId: string): Promise<PageAnalytics | undefined>;
  createPageAnalytics(analytics: InsertPageAnalytics): Promise<PageAnalytics>;
  updatePageAnalytics(pageId: string, analytics: Partial<PageAnalytics>): Promise<PageAnalytics>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pages: Map<number, Page>;
  private posts: Map<number, Post>;
  private postAnalytics: Map<number, PostAnalytics>;
  private pageAnalytics: Map<number, PageAnalytics>;
  
  private userId: number;
  private pageId: number;
  private postId: number;
  private postAnalyticsId: number;
  private pageAnalyticsId: number;

  constructor() {
    this.users = new Map();
    this.pages = new Map();
    this.posts = new Map();
    this.postAnalytics = new Map();
    this.pageAnalytics = new Map();
    
    this.userId = 1;
    this.pageId = 1;
    this.postId = 1;
    this.postAnalyticsId = 1;
    this.pageAnalyticsId = 1;
    
    // Add sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Create a sample user
    const user: User = {
      id: this.userId++,
      username: "demouser",
      password: "password123",
      accessToken: "sample_fb_access_token",
      fbUserId: "10123456789"
    };
    this.users.set(user.id, user);

    // Create a sample page
    const page: Page = {
      id: this.pageId++,
      pageId: "12345678901234567",
      name: "Home & Garden Tips",
      accessToken: "sample_page_access_token",
      userId: user.id,
      picture: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
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
      lastUpdated: new Date()
    };
    this.pageAnalytics.set(pageAnalyticsData.id, pageAnalyticsData);

    // Create sample posts
    const publishedPost1: Post = {
      id: this.postId++,
      postId: "post123456789",
      pageId: page.pageId,
      content: "Spring is finally here! Check out our latest collection of garden furniture to spruce up your outdoor space. Perfect for those warm evenings ahead! 🌿☀️ #SpringGardening #OutdoorLiving",
      status: "published",
      scheduledTime: null,
      imageUrl: "https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28",
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      reminderSent: false,
      reminderTime: null,
      isCompleted: true,
      completedTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      publishedTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
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
      scheduledTime: null,
      imageUrl: null,
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      reminderSent: false,
      reminderTime: null,
      isCompleted: true,
      completedTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      publishedTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
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
      scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      imageUrl: null,
      videoUrl: null,
      linkUrl: "https://www.homeandgardentips.com/water-saving-tips",
      linkTitle: "5 Water-Saving Garden Tips for Summer",
      linkDescription: "Learn how to save water and money with these eco-friendly garden tips.",
      linkImageUrl: "https://images.unsplash.com/photo-1591382386627-349b692688ff",
      reminderSent: false,
      reminderTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // One day before scheduled time
      isCompleted: false,
      completedTime: null,
      createdAt: new Date(),
      publishedTime: null,
      updatedAt: new Date()
    };
    this.posts.set(scheduledPost.id, scheduledPost);

    // Add a draft post
    const draftPost: Post = {
      id: this.postId++,
      postId: null,
      pageId: page.pageId,
      content: "Working on our new product launch post. Indoor plants that purify your air and look amazing too!",
      status: "draft",
      scheduledTime: null,
      imageUrl: null,
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      reminderSent: false,
      reminderTime: null,
      isCompleted: false,
      completedTime: null,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      publishedTime: null,
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
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
    const user: User = { ...insertUser, id, accessToken: null, fbUserId: null };
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
      picture: insertPage.picture || null 
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
      imageUrl: insertPost.imageUrl || null,
      videoUrl: insertPost.videoUrl || null,
      linkUrl: insertPost.linkUrl || null,
      linkTitle: insertPost.linkTitle || null,
      linkDescription: insertPost.linkDescription || null,
      linkImageUrl: insertPost.linkImageUrl || null,
      reminderSent: false,
      reminderTime: insertPost.scheduledTime ? new Date(insertPost.scheduledTime.getTime() - 24 * 60 * 60 * 1000) : null, // Set reminder 1 day before
      isCompleted: false,
      completedTime: null,
      createdAt: new Date(),
      publishedTime: null,
      updatedAt: new Date()
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
}

export const storage = new MemStorage();
