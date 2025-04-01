import { useState, useEffect } from "react";
import { useToast } from "./use-toast";
import { facebookApi } from "@/lib/facebookApi";
import { apiRequest } from "@/lib/queryClient";

interface UseFacebookAuthOptions {
  appId: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

export const useFacebookAuth = (options: UseFacebookAuthOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Check if FB SDK is loaded and initialize it if not
  useEffect(() => {
    const loadFacebookSDK = () => {
      // Don't load SDK if it's already loaded
      if (window.FB) return;
      
      // Load the Facebook SDK asynchronously
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs?.parentNode?.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
      
      // Initialize the Facebook SDK
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: options.appId || process.env.VITE_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v17.0'
        });
        
        // Check login status
        window.FB.getLoginStatus((response: { authResponse: any }) => {
          if (response.authResponse) {
            setIsAuthenticated(true);
          }
        });
      };
    };
    
    loadFacebookSDK();
  }, [options.appId]);
  
  // Login with Facebook
  const login = () => {
    setIsLoading(true);
    setError(null);
    
    if (!window.FB) {
      setError("Facebook SDK not loaded");
      setIsLoading(false);
      return;
    }
    
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const { accessToken, userID } = response.authResponse;
          
          // Save the access token to our backend
          facebookApi.saveAccessToken(accessToken, userID)
            .then((result) => {
              setIsAuthenticated(true);
              if (options.onSuccess) {
                options.onSuccess(result);
              }
              toast({
                title: "Successfully connected to Facebook",
                description: "You can now manage your Facebook pages.",
              });
            })
            .catch((err) => {
              setError("Failed to save access token");
              if (options.onError) {
                options.onError(err);
              }
              toast({
                title: "Error connecting to Facebook",
                description: "There was a problem connecting to Facebook. Please try again.",
                variant: "destructive",
              });
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          setError("User cancelled login or did not fully authorize");
          setIsLoading(false);
          if (options.onError) {
            options.onError(new Error("User cancelled login"));
          }
        }
      },
      { scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata' }
    );
  };
  
  // Logout
  const logout = async () => {
    setIsLoading(true);
    
    try {
      // Logout from our backend
      await apiRequest("POST", "/api/auth/logout");
      
      // Logout from Facebook
      if (window.FB) {
        window.FB.logout();
      }
      
      setIsAuthenticated(false);
      toast({
        title: "Logged out successfully",
        description: "You have been logged out from Facebook.",
      });
    } catch (err) {
      setError("Failed to logout");
      toast({
        title: "Error logging out",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    login,
    logout,
    isLoading,
    isAuthenticated,
    error
  };
};

// Add typings to Window object
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}
