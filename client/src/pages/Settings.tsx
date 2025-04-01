import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFacebookAuth } from "@/hooks/useFacebookAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Facebook, FileText, Bell, Key, User, LogOut, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  
  // Facebook authentication hook
  const { login, logout, isLoading, isAuthenticated } = useFacebookAuth({
    appId: process.env.VITE_FACEBOOK_APP_ID || "fb_app_id_placeholder",
    onSuccess: () => {
      toast({
        title: "Facebook connected",
        description: "Your Facebook account has been successfully connected.",
      });
    }
  });
  
  // Get user data
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  // Get pages
  const { data: pages } = useQuery({
    queryKey: ['/api/pages'],
  });
  
  // Handle notification settings
  const handleNotificationToggle = (setting: string) => {
    toast({
      title: "Settings updated",
      description: `${setting} notifications have been updated.`,
    });
  };
  
  // Handle save account settings
  const handleSaveAccountSettings = () => {
    toast({
      title: "Account updated",
      description: "Your account settings have been saved successfully.",
    });
  };
  
  // Handle account deletion
  const handleDeleteAccount = () => {
    toast({
      title: "Account deleted",
      description: "Your account has been deleted successfully.",
      variant: "destructive",
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-3">
          <TabsTrigger value="account" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center">
            <Facebook className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Connections</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  defaultValue={user?.username || ""} 
                  disabled={!user}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue="user@example.com" 
                  disabled={!user}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAccountSettings} disabled={!user}>
                Save Changes
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Update Password</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible account actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">
                Once you delete your account, all of your data will be permanently removed.
                This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facebook Connection</CardTitle>
              <CardDescription>
                Connect your Facebook account to manage your pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border border-green-100 bg-green-50 rounded-md">
                    <Facebook className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">Connected to Facebook</p>
                      <p className="text-sm text-gray-500">Your account is linked to Facebook.</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Facebook
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border border-gray-200 bg-gray-50 rounded-md">
                    <Facebook className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-medium">Not connected to Facebook</p>
                      <p className="text-sm text-gray-500">Connect to manage your Facebook pages.</p>
                    </div>
                  </div>
                  <Button onClick={login} disabled={isLoading} className="w-full sm:w-auto">
                    <Facebook className="h-4 w-4 mr-2" />
                    {isLoading ? "Connecting..." : "Connect Facebook"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Connected Pages</CardTitle>
              <CardDescription>
                Manage your connected Facebook pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pages && pages.length > 0 ? (
                <div className="space-y-4">
                  {pages.map((page) => (
                    <div key={page.pageId} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={page.picture || "https://via.placeholder.com/40"} 
                          alt={page.name} 
                          className="h-10 w-10 rounded-full" 
                        />
                        <div>
                          <p className="font-medium">{page.name}</p>
                          <p className="text-xs text-gray-500">Page ID: {page.pageId}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="mt-4">
                    <Facebook className="h-4 w-4 mr-2" />
                    Add Another Page
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Facebook className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No pages connected</h3>
                  <p className="text-gray-500 mb-4">Connect your Facebook account to manage your pages.</p>
                  <Button disabled={!isAuthenticated}>
                    Add Facebook Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="post-published">Post Published</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications when your scheduled posts are published
                    </p>
                  </div>
                  <Switch 
                    id="post-published" 
                    defaultChecked={true}
                    onCheckedChange={() => handleNotificationToggle("Post published")}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="engagement-alerts">Engagement Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Get notified when your posts receive high engagement
                    </p>
                  </div>
                  <Switch 
                    id="engagement-alerts" 
                    defaultChecked={true}
                    onCheckedChange={() => handleNotificationToggle("Engagement alerts")}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="comments">Comments</Label>
                    <p className="text-sm text-gray-500">
                      Notify when new comments are added to your posts
                    </p>
                  </div>
                  <Switch 
                    id="comments" 
                    defaultChecked={false}
                    onCheckedChange={() => handleNotificationToggle("Comments")}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics-reports">Analytics Reports</Label>
                    <p className="text-sm text-gray-500">
                      Receive weekly performance reports for your pages
                    </p>
                  </div>
                  <Switch 
                    id="analytics-reports" 
                    defaultChecked={true}
                    onCheckedChange={() => handleNotificationToggle("Analytics reports")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <Input 
                  id="email-address" 
                  type="email" 
                  defaultValue="user@example.com" 
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="marketing-emails" />
                <Label htmlFor="marketing-emails">
                  Receive marketing emails and product updates
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
