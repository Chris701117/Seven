import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Page, Post, PageAnalytics } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { 
  Calendar, 
  BarChart, 
  AreaChart, 
  AreaChartIcon, 
  Activity, 
  Users, 
  Eye, 
  BarChart2, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  TrendingUp,
  Clock,
  CreditCard,
  Globe,
  Percent,
  Target,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { facebookApi } from "@/lib/facebookApi";

const COLORS = ['#1877F2', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const RADIAN = Math.PI / 180;

const Analytics = () => {
  const { toast } = useToast();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState("overview");
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);
  
  // Get all pages for the user
  const { data: pages, isLoading: isLoadingPages } = useQuery<Page[]>({
    queryKey: ['/api/pages'],
  });
  
  // Set the first page as active when pages are loaded
  useEffect(() => {
    if (pages && pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].pageId);
    }
  }, [pages, activePageId]);
  
  // Get analytics data
  const { chartData, analytics, isLoading: isLoadingAnalytics } = useAnalyticsData(activePageId, dateRange);
  
  // Get posts for engagement chart
  const { data: posts, isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/pages/${activePageId}/posts?status=published`],
    enabled: !!activePageId,
  });
  
  // Mutation for Facebook data sync
  const syncFacebookData = useMutation({
    mutationFn: async () => {
      return facebookApi.syncPageInsights(activePageId || "");
    },
    onSuccess: () => {
      toast({
        title: "同步成功",
        description: "已從Facebook獲取最新的分析數據",
      });
    },
    onError: (error) => {
      toast({
        title: "同步失敗",
        description: "無法從Facebook獲取數據，請檢查您的連接",
        variant: "destructive",
      });
      console.error("Facebook sync error:", error);
    }
  });
  
  // Generate engagement data for posts
  const engagementData = posts?.map(post => ({
    name: post.content.substring(0, 20) + "...",
    likes: Math.floor(Math.random() * 200) + 50, // 模擬數據，實際應從Facebook API獲取
    comments: Math.floor(Math.random() * 50) + 5,
    shares: Math.floor(Math.random() * 20) + 1,
    ...(post.postId ? {
      id: post.postId,
      isLoaded: false
    } : {})
  })) || [];
  
  // Generate post type distribution data
  const postTypeData = posts ? [
    { name: '純文字', value: posts.filter(p => !p.imageUrl && !p.linkUrl).length },
    { name: '圖片', value: posts.filter(p => p.imageUrl).length },
    { name: '連結', value: posts.filter(p => p.linkUrl).length }
  ] : [];
  
  // Handle page change
  const handlePageChange = (pageId: string) => {
    setActivePageId(pageId);
  };
  
  // Handle export data
  const handleExportData = () => {
    toast({
      title: "匯出開始",
      description: "您的分析數據正在準備下載中。",
    });
    
    // In a real app, this would trigger an actual download
    setTimeout(() => {
      toast({
        title: "匯出完成",
        description: "分析數據已成功匯出。",
      });
    }, 1500);
  };
  
  // Handle Facebook connect
  const handleConnectFacebook = () => {
    setIsConnectingFacebook(true);
    
    // 模擬連接Facebook的過程
    setTimeout(() => {
      setIsConnectingFacebook(false);
      toast({
        title: "Facebook連接成功",
        description: "已成功連接Facebook Graph API，現在可以同步數據。",
      });
    }, 2000);
  };
  
  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // Best time to post data
  const bestTimeData = [
    { day: '週一', '09:00': 35, '12:00': 42, '15:00': 38, '18:00': 65, '21:00': 48 },
    { day: '週二', '09:00': 42, '12:00': 38, '15:00': 45, '18:00': 58, '21:00': 40 },
    { day: '週三', '09:00': 38, '12:00': 45, '15:00': 52, '18:00': 62, '21:00': 42 },
    { day: '週四', '09:00': 40, '12:00': 48, '15:00': 55, '18:00': 70, '21:00': 45 },
    { day: '週五', '09:00': 45, '12:00': 52, '15:00': 60, '18:00': 68, '21:00': 50 },
    { day: '週六', '09:00': 48, '12:00': 58, '15:00': 65, '18:00': 75, '21:00': 55 },
    { day: '週日', '09:00': 52, '12:00': 60, '15:00': 68, '18:00': 82, '21:00': 60 },
  ];
  
  // Audience data for radar chart
  const audienceData = [
    { subject: '18-24歲', A: 90, fullMark: 150 },
    { subject: '25-34歲', A: 120, fullMark: 150 },
    { subject: '35-44歲', A: 86, fullMark: 150 },
    { subject: '45-54歲', A: 65, fullMark: 150 },
    { subject: '55-64歲', A: 45, fullMark: 150 },
    { subject: '65+歲', A: 30, fullMark: 150 },
  ];
  
  // Location data for top cities
  const locationData = [
    { name: '台北', value: 45 },
    { name: '高雄', value: 20 },
    { name: '台中', value: 15 },
    { name: '新北', value: 10 },
    { name: '其他', value: 10 },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">數據分析</h2>
        <div className="flex items-center space-x-4">
          {pages && pages.length > 0 && (
            <Select 
              value={activePageId || ""} 
              onValueChange={handlePageChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="選擇粉絲專頁" />
              </SelectTrigger>
              <SelectContent>
                {pages.map(page => (
                  <SelectItem key={page.pageId} value={page.pageId}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select 
            value={dateRange} 
            onValueChange={(value) => setDateRange(value as "day" | "week" | "month")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="選擇時間範圍" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">最近24小時</SelectItem>
              <SelectItem value="week">最近7天</SelectItem>
              <SelectItem value="month">最近30天</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncFacebookData.mutate()}
            disabled={syncFacebookData.isPending}
            className="flex items-center text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            {syncFacebookData.isPending ? (
              <>
                <AreaChart className="mr-2 h-4 w-4 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <AreaChart className="mr-2 h-4 w-4" />
                同步數據
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Connection status banner - only show if needed */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-2 mr-3">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-800">連接Facebook Graph API獲取更多數據</h4>
              <p className="text-sm text-blue-600">通過連接Facebook API可以獲取完整的受眾分析和深入的貼文效能數據</p>
            </div>
          </div>
          <Button 
            onClick={handleConnectFacebook}
            disabled={isConnectingFacebook}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnectingFacebook ? (
              <>
                <AreaChart className="mr-2 h-4 w-4 animate-spin" />
                連接中...
              </>
            ) : (
              <>
                <AreaChart className="mr-2 h-4 w-4" />
                連接Facebook
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">
              <AreaChartIcon className="h-4 w-4 mr-2" />
              總覽
            </TabsTrigger>
            <TabsTrigger value="engagement">
              <Activity className="h-4 w-4 mr-2" />
              互動數據
            </TabsTrigger>
            <TabsTrigger value="audience">
              <Users className="h-4 w-4 mr-2" />
              受眾分析
            </TabsTrigger>
            <TabsTrigger value="content">
              <BarChart2 className="h-4 w-4 mr-2" />
              內容表現
            </TabsTrigger>
          </TabsList>
          <button 
            className="text-primary hover:underline text-sm flex items-center"
            onClick={handleExportData}
          >
            匯出數據
          </button>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoadingAnalytics ? (
              <>
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full" />
                ))}
              </>
            ) : analytics ? (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full p-2 bg-blue-100">
                        <ThumbsUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">總讚數</div>
                        <div className="text-2xl font-bold">{(analytics.totalLikes ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>較上週 +12.5%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full p-2 bg-blue-100">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">留言數</div>
                        <div className="text-2xl font-bold">{(analytics.totalComments ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>較上週 +8.3%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full p-2 bg-blue-100">
                        <Share2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">分享數</div>
                        <div className="text-2xl font-bold">{(analytics.totalShares ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>較上週 +15.2%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full p-2 bg-blue-100">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">頁面瀏覽量</div>
                        <div className="text-2xl font-bold">{(analytics.pageViews ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>較上週 +10.7%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="col-span-4 text-center py-10">
                <div className="text-gray-500">沒有可用的分析數據</div>
              </div>
            )}
          </div>
          
          {/* Additional top metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full p-2 bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">粉絲增長率</div>
                    <div className="text-2xl font-bold">+4.8%</div>
                    <div className="text-xs text-gray-500 mt-1">過去30天</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full p-2 bg-blue-100">
                    <Percent className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">互動率</div>
                    <div className="text-2xl font-bold">3.6%</div>
                    <div className="text-xs text-gray-500 mt-1">較行業平均高0.8%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full p-2 bg-blue-100">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">最佳發布時間</div>
                    <div className="text-2xl font-bold">週日18:00</div>
                    <div className="text-xs text-gray-500 mt-1">基於過去30天數據</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Performance Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>效能趨勢</CardTitle>
              <CardDescription>
                追蹤所選時間段內的互動指標變化
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <Skeleton className="h-64 w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="likes" name="讚" stroke="#1877F2" activeDot={{ r: 8 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="comments" name="留言" stroke="#42B72A" strokeWidth={2} />
                    <Line type="monotone" dataKey="shares" name="分享" stroke="#F7B928" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10">
                  <div className="text-gray-500">所選時間段內沒有可用數據</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>貼文互動數據</CardTitle>
              <CardDescription>
                最近貼文的互動指標
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <Skeleton className="h-64 w-full" />
              ) : engagementData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart
                    data={engagementData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="likes" name="讚" fill="#1877F2" />
                    <Bar dataKey="comments" name="留言" fill="#42B72A" />
                    <Bar dataKey="shares" name="分享" fill="#F7B928" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10">
                  <div className="text-gray-500">沒有可用的貼文數據</div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>互動率分析</CardTitle>
                <CardDescription>
                  互動率佔粉絲比例
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">3.8%</div>
                      <div className="text-sm text-gray-500 mt-1">讚的互動率</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">1.2%</div>
                      <div className="text-sm text-gray-500 mt-1">留言互動率</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600">0.5%</div>
                      <div className="text-sm text-gray-500 mt-1">分享互動率</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 border-t pt-4">
                    <div className="flex items-center">
                      <Target className="h-4 w-4 text-blue-600 mr-2" />
                      優於行業平均水平
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                      較上月增長 +0.7%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>表現最佳的貼文</CardTitle>
                <CardDescription>
                  互動率最高的貼文
                </CardDescription>
              </CardHeader>
              <CardContent>
                {posts && posts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-2 mb-2">
                        <img 
                          src="https://via.placeholder.com/40"
                          alt="頁面圖標" 
                          className="w-8 h-8 rounded-full" 
                        />
                        <div>
                          <div className="font-medium text-gray-900">測試頁面</div>
                          <div className="text-xs text-gray-500">發布於 3天前</div>
                        </div>
                      </div>
                      <p className="text-gray-800 text-sm">{posts[0].content.substring(0, 100)}...</p>
                      {posts[0].imageUrl && (
                        <img 
                          src={posts[0].imageUrl} 
                          alt="貼文圖片" 
                          className="mt-2 h-36 w-full object-cover rounded-md" 
                        />
                      )}
                      <div className="flex justify-between mt-3 text-sm">
                        <div className="flex space-x-4">
                          <div className="flex items-center">
                            <div className="bg-blue-500 text-white rounded-full p-0.5 h-4 w-4 flex items-center justify-center">
                              <ThumbsUp className="h-2 w-2" />
                            </div>
                            <span className="ml-1">243</span>
                          </div>
                          <div className="flex items-center">
                            <MessageSquare className="text-gray-500 h-4 w-4 mr-1" />
                            <span>36</span>
                          </div>
                          <div className="flex items-center">
                            <Share2 className="text-gray-500 h-4 w-4 mr-1" />
                            <span>12</span>
                          </div>
                        </div>
                        <div className="text-blue-600 font-medium">
                          互動率: 8.2%
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-gray-500">沒有可用的貼文數據</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>互動特性分析</CardTitle>
              <CardDescription>
                不同互動類型的表現
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col space-y-4">
                  <div className="text-center pb-4">
                    <div className="text-lg font-semibold">互動指標總覽</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">平均每貼文讚數</div>
                      <div className="font-bold text-blue-600">145</div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">平均每貼文留言</div>
                      <div className="font-bold text-green-600">22</div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">平均每貼文分享</div>
                      <div className="font-bold text-yellow-600">8</div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="font-medium">平均每貼文總互動</div>
                      <div className="font-bold text-purple-600">175</div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart outerRadius={90} data={[
                      { subject: '讚數', A: 85, fullMark: 100 },
                      { subject: '留言數', A: 65, fullMark: 100 },
                      { subject: '分享數', A: 70, fullMark: 100 },
                      { subject: '到達率', A: 92, fullMark: 100 },
                      { subject: '點擊率', A: 58, fullMark: 100 },
                      { subject: '停留時間', A: 75, fullMark: 100 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="互動表現" dataKey="A" stroke="#1877F2" fill="#1877F2" fillOpacity={0.6} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>受眾年齡分布</CardTitle>
                <CardDescription>
                  粉絲年齡段分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart outerRadius={90} data={audienceData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} />
                    <Radar name="用戶數量" dataKey="A" stroke="#1877F2" fill="#1877F2" fillOpacity={0.6} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>主要地區分布</CardTitle>
                <CardDescription>
                  粉絲地理位置分布
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={locationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {locationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>用戶活躍度</CardTitle>
                <CardDescription>
                  粉絲互動頻率分析
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">35%</div>
                    <div className="text-sm text-gray-500 mt-1">高度活躍</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">45%</div>
                    <div className="text-sm text-gray-500 mt-1">適度活躍</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">20%</div>
                    <div className="text-sm text-gray-500 mt-1">低度活躍</div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">按時段活躍度</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart
                      data={[
                        {time: '00:00', active: 15},
                        {time: '03:00', active: 8},
                        {time: '06:00', active: 12},
                        {time: '09:00', active: 42},
                        {time: '12:00', active: 65},
                        {time: '15:00', active: 58},
                        {time: '18:00', active: 85},
                        {time: '21:00', active: 70},
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="active" name="活躍用戶" stroke="#1877F2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>粉絲增長趨勢</CardTitle>
                <CardDescription>
                  過去30天粉絲增長情況
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={Array.from({length: 30}, (_, i) => ({
                      day: `${i+1}日`,
                      fans: 5000 + Math.floor(Math.random() * 200) + (i * 12)
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="fans" name="粉絲數量" stroke="#1877F2" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>內容類型分布</CardTitle>
                <CardDescription>
                  貼文類型分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPosts ? (
                  <Skeleton className="h-64 w-full" />
                ) : postTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={postTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {postTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-gray-500">沒有可用的內容數據</div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>表現最佳的內容類型</CardTitle>
                <CardDescription>
                  互動率最高的內容類型
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPosts ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart
                      data={[
                        { name: '圖片貼文', engagement: 4.2 },
                        { name: '影片貼文', engagement: 5.8 },
                        { name: '連結貼文', engagement: 2.8 },
                        { name: '純文字貼文', engagement: 1.5 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: '平均互動率 %', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="engagement" name="互動率 %" fill="#1877F2" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>最佳發布時間</CardTitle>
              <CardDescription>
                按日期和時間的互動表現
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RechartsBarChart
                  data={bestTimeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="09:00" name="早上9點" fill="#1877F2" />
                  <Bar dataKey="12:00" name="中午12點" fill="#42B72A" />
                  <Bar dataKey="15:00" name="下午3點" fill="#F7B928" />
                  <Bar dataKey="18:00" name="晚上6點" fill="#A134F6" />
                  <Bar dataKey="21:00" name="晚上9點" fill="#FF5E5B" />
                </RechartsBarChart>
              </ResponsiveContainer>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <div className="rounded-full p-1 bg-blue-100 mr-3">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800">發布建議</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      根據數據分析，您的貼文在「週日18:00-21:00」和「週六15:00-18:00」獲得最高互動率。
                      建議在這些時段安排重要的內容發布。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>熱門主題</CardTitle>
                <CardDescription>
                  獲得最高互動的內容主題
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-2 h-12 bg-blue-600 rounded-full mr-3"></div>
                      <div>
                        <div className="font-medium">產品更新</div>
                        <div className="text-sm text-gray-500">平均互動率 4.8%</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">1</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-2 h-12 bg-green-600 rounded-full mr-3"></div>
                      <div>
                        <div className="font-medium">使用者故事</div>
                        <div className="text-sm text-gray-500">平均互動率 4.2%</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">2</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-2 h-12 bg-yellow-600 rounded-full mr-3"></div>
                      <div>
                        <div className="font-medium">促銷活動</div>
                        <div className="text-sm text-gray-500">平均互動率 3.9%</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">3</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>關鍵字表現</CardTitle>
                <CardDescription>
                  貼文中使用的高效關鍵字
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    全新上市 <span className="text-xs ml-1">+3.2%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    限時優惠 <span className="text-xs ml-1">+2.8%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    免費體驗 <span className="text-xs ml-1">+2.5%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    最後機會 <span className="text-xs ml-1">+2.3%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    如何 <span className="text-xs ml-1">+2.1%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    獨家 <span className="text-xs ml-1">+1.9%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    秘訣 <span className="text-xs ml-1">+1.8%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    特別 <span className="text-xs ml-1">+1.7%</span>
                  </div>
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    驚喜 <span className="text-xs ml-1">+1.6%</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">關鍵字使用建議</div>
                  <p className="text-sm text-gray-600">
                    在貼文中加入「限時優惠」、「免費體驗」等關鍵字可增加互動率。包含行動呼籲的貼文表現較佳。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;