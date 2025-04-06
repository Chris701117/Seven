import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, QrCode, KeyRound, Shield, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 定義登入表單的結構
const formSchema = z.object({
  username: z.string().min(3, {
    message: '用戶名至少需要3個字符',
  }),
  password: z.string().min(6, {
    message: '密碼至少需要6個字符',
  }),
});

// 定義二步驗證表單的結構
const twoFactorSchema = z.object({
  code: z.string().min(6, {
    message: '驗證碼應為6位數字',
  }).max(6),
});

// 定義設置二步驗證表單的結構
const setupTwoFactorSchema = z.object({
  code: z.string().min(6, {
    message: '驗證碼應為6位數字',
  }).max(6),
});

export default function Login() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [requireTwoFactorSetup, setRequireTwoFactorSetup] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<boolean>(false);
  const { toast } = useToast();

  // 初始化登入表單
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 初始化二步驗證表單
  const twoFactorForm = useForm<z.infer<typeof twoFactorSchema>>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: '',
    },
  });

  // 初始化設置二步驗證表單
  const setupTwoFactorForm = useForm<z.infer<typeof setupTwoFactorSchema>>({
    resolver: zodResolver(setupTwoFactorSchema),
    defaultValues: {
      code: '',
    },
  });

  // 登入表單提交處理
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // 使用新的參數形式調用apiRequest，直接獲取JSON響應
      const data = await apiRequest('POST', '/api/auth/login', values);
      
      // 如果需要設置二步驗證
      if (data.requireTwoFactorSetup) {
        setRequireTwoFactorSetup(true);
        setUserId(data.userId);
        setQrCode(data.qrCode);
        setSecret(data.secret);
        toast({
          title: '需要設置二步驗證',
          description: '首次登入需要設置Google Authenticator，請掃描QR碼',
        });
      }
      // 如果需要二步驗證驗證
      else if (data.requireTwoFactor) {
        setRequireTwoFactor(true);
        setUserId(data.userId);
        toast({
          title: '需要驗證',
          description: '請輸入Google Authenticator中的驗證碼',
        });
      } else {
        // 登入成功
        toast({
          title: '登入成功',
          description: '歡迎回來！',
        });
        
        // 重定向到首頁
        setLocation('/');
      }
    } catch (error) {
      // 登入失敗
      toast({
        variant: 'destructive',
        title: '登入失敗',
        description: '用戶名或密碼不正確',
      });
      console.error('登入錯誤:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // 二步驗證表單提交處理
  async function onSubmitTwoFactor(values: z.infer<typeof twoFactorSchema>) {
    if (!userId) return;
    
    setIsLoading(true);
    setTwoFactorError(false);
    try {
      // 使用apiRequest直接獲取JSON響應
      await apiRequest('POST', '/api/auth/verify-2fa', {
        userId,
        code: values.code
      });
      
      // 驗證成功
      toast({
        title: '驗證成功',
        description: '歡迎回來！',
      });
      
      // 重定向到首頁
      setLocation('/');
    } catch (error) {
      // 驗證失敗
      setTwoFactorError(true);
      toast({
        variant: 'destructive',
        title: '驗證失敗',
        description: '驗證碼不正確或已過期',
      });
      console.error('驗證錯誤:', error);
      
      // 清空驗證碼輸入
      twoFactorForm.reset({ code: '' });
    } finally {
      setIsLoading(false);
    }
  }

  // 設置二步驗證表單提交處理
  async function onSubmitSetupTwoFactor(values: z.infer<typeof setupTwoFactorSchema>) {
    if (!userId) return;
    
    setIsLoading(true);
    setTwoFactorError(false);
    try {
      // 使用首次登入的二步驗證設置 API，直接獲取JSON響應
      await apiRequest('POST', '/api/auth/setup-2fa', {
        userId,
        code: values.code
      });
      
      // 設置和登入成功
      toast({
        title: '設置成功',
        description: '二步驗證已成功設置並驗證！',
        variant: 'default'
      });
      
      // 重定向到首頁
      setLocation('/');
    } catch (error) {
      // 設置失敗
      setTwoFactorError(true);
      toast({
        variant: 'destructive',
        title: '設置失敗',
        description: '驗證碼不正確，請重新嘗試',
      });
      console.error('二步驗證設置錯誤:', error);
      
      // 清空驗證碼輸入
      setupTwoFactorForm.reset({ code: '' });
    } finally {
      setIsLoading(false);
    }
  }

  // 返回登入頁
  const handleGoBack = () => {
    setRequireTwoFactor(false);
    setRequireTwoFactorSetup(false);
    setUserId(null);
    setQrCode(null);
    setSecret(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-normal text-center">
            {requireTwoFactorSetup ? '設置二步驗證' : (requireTwoFactor ? '二步驗證' : '歡迎回來')}
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            {requireTwoFactorSetup ? 
              '請使用Google Authenticator掃描下方QR碼並輸入驗證碼' : 
              (requireTwoFactor ? 
                '請輸入Google Authenticator中的驗證碼' : 
                '請輸入您的帳號密碼登入系統')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requireTwoFactorSetup ? (
            // 設置二步驗證
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-xl font-medium">設置二步驗證</h3>
                <p className="text-sm text-gray-600 mt-1">
                  請使用Google Authenticator掃描下方QR碼並輸入驗證碼
                </p>
              </div>
              
              {/* 簡潔風格提醒 */}
              <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">必須啟用二步驗證</p>
                    <p className="text-amber-700 text-sm mt-1">
                      為保障帳戶安全，本系統要求所有用戶啟用二步驗證。請完成以下步驟。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <p className="font-medium mb-2">第1步：下載 Google Authenticator 應用</p>
                  <div className="flex gap-4">
                    <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline">
                      Android下載
                    </a>
                    <a href="https://apps.apple.com/us/app/google-authenticator/id388497605" target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline">
                      iOS下載
                    </a>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium mb-2">第2步：掃描QR碼</p>
                  {qrCode && (
                    <div className="flex justify-center">
                      <div className="border p-2 bg-white">
                        <img src={qrCode} alt="二步驗證QR碼" className="w-40 h-40" />
                      </div>
                    </div>
                  )}
                </div>
                
                {secret && (
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-500">如無法掃描，請手動輸入以下密鑰：</p>
                    <div className="bg-slate-100 rounded p-2 font-mono text-xs text-slate-800 tracking-wider">
                      {secret}
                    </div>
                  </div>
                )}
                
                <Form {...setupTwoFactorForm}>
                  <form onSubmit={setupTwoFactorForm.handleSubmit(onSubmitSetupTwoFactor)} className="space-y-4">
                    <div>
                      <p className="font-medium mb-2">第3步：輸入驗證碼</p>
                      <FormField
                        control={setupTwoFactorForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="請輸入應用中顯示的6位數驗證碼" 
                                maxLength={6} 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="text-center text-lg py-5"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* 驗證失敗提示 */}
                    {twoFactorError && (
                      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <p className="font-medium text-red-800">設置二步驗證失敗</p>
                        </div>
                        <p className="text-red-700 text-sm mt-1 ml-7">
                          驗證碼不正確，請重新嘗試
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between space-x-2 mt-6">
                      <Button type="button" variant="outline" className="px-8 py-2 border-gray-300" onClick={handleGoBack} disabled={isLoading}>
                        返回
                      </Button>
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-2" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            驗證中...
                          </>
                        ) : '驗證並完成設置'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          ) : !requireTwoFactor ? (
            // 第一步：用戶名和密碼登入
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用戶名</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入用戶名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密碼</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="請輸入密碼" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登入中...
                    </>
                  ) : '登入'}
                </Button>
              </form>
            </Form>
          ) : (
            // 第二步：二步驗證
            <Form {...twoFactorForm}>
              <form onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)} className="space-y-4">
                {/* 外部紅色邊框，完全符合參考圖片 */}
                <div className="border-2 border-red-500 rounded-md p-4 mb-4">
                  <h3 className="text-center font-medium text-xl">二步驗證</h3>
                  <p className="text-center text-sm mt-1">
                    請輸入Google Authenticator中的驗證碼
                  </p>
                </div>
                
                <div className="text-center text-base mb-2">
                  輸入驗證碼
                </div>
                
                <p className="text-center text-muted-foreground text-sm mb-4">
                  請打開Google Authenticator應用並輸入顯示的6位數驗證碼
                </p>
                
                <FormField
                  control={twoFactorForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="請輸入6位數驗證碼" 
                          maxLength={6} 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          className="text-center text-lg py-5 border-gray-300"
                          {...field} 
                        />
                      </FormControl>
                      <div className="flex justify-center mt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* 驗證失敗提示 */}
                {twoFactorError && (
                  <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <p className="font-medium text-red-800">驗證失敗</p>
                    </div>
                    <p className="text-red-700 text-sm mt-1 ml-7">
                      驗證碼不正確，請重新嘗試
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between space-x-2 mt-6">
                  <Button type="button" variant="outline" className="px-8 py-2 border-gray-300" onClick={handleGoBack} disabled={isLoading}>
                    返回
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-2" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        驗證中...
                      </>
                    ) : '驗證'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-muted-foreground">
            本系統為邀請制，如需帳號請聯繫管理員
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}