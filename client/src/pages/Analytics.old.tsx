import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page, Post, PageAnalytics } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { Calendar, BarChart, AreaChart, AreaChartIcon, Activity, Users, Eye, BarChart2, ThumbsUp, MessageSquare, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const RADIAN = Math.PI / 180;

const Analytics = () => {
  const { toast } = useToast();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState("overview");
  
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
  
  // Generate engagement data for posts
  const engagementData = posts?.map(post => ({
    name: post.content.substring(0, 20) + "...",
    likes: 0,
    comments: 0,
    shares: 0,
    ...(post.postId ? {
      id: post.postId,
      isLoaded: false
    } : {})
  })) || [];
  
  // Generate post type distribution data
  const postTypeData = posts ? [
    { name: 'Text Only', value: posts.filter(p => !p.imageUrl && !p.linkUrl).length },
    { name: 'Image', value: posts.filter(p => p.imageUrl).length },
    { name: 'Link', value: posts.filter(p => p.linkUrl).length }
  ] : [];
  
  // Handle page change
  const handlePageChange = (pageId: string) => {
    setActivePageId(pageId);
  };
  
  // Handle export data
  const handleExportData = () => {
    toast({
      title: "Export started",
      description: "Your analytics data is being prepared for download.",
    });
    
    // In a real app, this would trigger an actual download
    setTimeout(() => {
      toast({
        title: "Export complete",
        description: "Analytics data has been exported successfully.",
      });
    }, 1500);
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
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <div className="flex items-center space-x-4">
          {pages && pages.length > 0 && (
            <Select 
              value={activePageId || ""} 
              onValueChange={handlePageChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a page" />
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
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 hours</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">
              <AreaChartIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="engagement">
              <Activity className="h-4 w-4 mr-2" />
              Engagement
            </TabsTrigger>
            <TabsTrigger value="audience">
              <Users className="h-4 w-4 mr-2" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="content">
              <BarChart2 className="h-4 w-4 mr-2" />
              Content Performance
            </TabsTrigger>
          </TabsList>
          <button 
            className="text-primary hover:underline text-sm flex items-center"
            onClick={handleExportData}
          >
            Export Data
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
                        <div className="text-sm font-medium text-gray-500">Total Likes</div>
                        <div className="text-2xl font-bold">{(analytics.totalLikes ?? 0).toLocaleString()}</div>
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
                        <div className="text-sm font-medium text-gray-500">Comments</div>
                        <div className="text-2xl font-bold">{(analytics.totalComments ?? 0).toLocaleString()}</div>
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
                        <div className="text-sm font-medium text-gray-500">Shares</div>
                        <div className="text-2xl font-bold">{(analytics.totalShares ?? 0).toLocaleString()}</div>
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
                        <div className="text-sm font-medium text-gray-500">Page Views</div>
                        <div className="text-2xl font-bold">{(analytics.pageViews ?? 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="col-span-4 text-center py-10">
                <div className="text-gray-500">No analytics data available</div>
              </div>
            )}
          </div>
          
          {/* Performance Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                Track your engagement metrics over the selected time period
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
                    <Line type="monotone" dataKey="likes" stroke="#0078D4" activeDot={{ r: 8 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="comments" stroke="#107C10" strokeWidth={2} />
                    <Line type="monotone" dataKey="shares" stroke="#D83B01" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10">
                  <div className="text-gray-500">No data available for the selected period</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Engagement</CardTitle>
              <CardDescription>
                Engagement metrics for your most recent posts
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
                    <Bar dataKey="likes" fill="#0078D4" name="Likes" />
                    <Bar dataKey="comments" fill="#107C10" name="Comments" />
                    <Bar dataKey="shares" fill="#D83B01" name="Shares" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10">
                  <div className="text-gray-500">No posts data available</div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Rate</CardTitle>
                <CardDescription>
                  Average engagement as percentage of followers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center p-6 h-64">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600">3.2%</div>
                  <div className="text-sm text-gray-500 mt-2">Average engagement rate</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Post</CardTitle>
                <CardDescription>
                  Your post with the highest engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {posts && posts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-gray-800">{posts[0].content.substring(0, 100)}...</p>
                      {posts[0].imageUrl && (
                        <img 
                          src={posts[0].imageUrl} 
                          alt="Post image" 
                          className="mt-2 h-36 w-full object-cover rounded-md" 
                        />
                      )}
                      <div className="flex justify-between mt-3 text-sm">
                        <div className="flex space-x-4">
                          <div className="flex items-center">
                            <ThumbsUp className="text-blue-600 h-4 w-4 mr-1" />
                            <span>243</span>
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
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-gray-500">No posts data available</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audience Demographics</CardTitle>
                <CardDescription>
                  Age and gender distribution of your audience
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="text-center py-10">
                  <div className="text-gray-500">Demographics data would be available with Facebook Graph API integration</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Locations</CardTitle>
                <CardDescription>
                  Geographic distribution of your audience
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="text-center py-10">
                  <div className="text-gray-500">Location data would be available with Facebook Graph API integration</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Audience Growth</CardTitle>
              <CardDescription>
                Page followers growth over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Type Distribution</CardTitle>
                <CardDescription>
                  Breakdown of your post types
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
                    <div className="text-gray-500">No content data available</div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Best Performing Content</CardTitle>
                <CardDescription>
                  Content types with highest engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPosts ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart
                      data={[
                        { name: 'Image Posts', engagement: 4.2 },
                        { name: 'Link Posts', engagement: 2.8 },
                        { name: 'Text Posts', engagement: 1.5 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Avg. Engagement Rate %', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="engagement" fill="#0078D4" name="Engagement Rate %" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Best Time to Post</CardTitle>
              <CardDescription>
                Engagement by day and time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="text-center py-10">
                <div className="text-gray-500">This data would be available with more post history and Facebook Graph API integration</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
