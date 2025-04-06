import { useState } from 'react';
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
import { Loader2, XCircle } from 'lucide-react';

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
      const data = await apiRequest('POST', '/api/auth/login', values);
      
      // 如果需要設置二步驗證
      if (data.requireTwoFactorSetup) {
        setRequireTwoFactorSetup(true);
        setUserId(data.userId);
        setQrCode(data.qrCode);
        setSecret(data.secret);
        toast({
          title: '需要設置二步驗證',
          description: '首次登入需要設置Google Authenticator',
        });
      }
      // 如果需要二步驗證
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
              '透過Google Authenticator增強您的帳號安全性' : 
              (requireTwoFactor ? 
                '請輸入Google Authenticator中的驗證碼' : 
                '請輸入您的帳號密碼登入系統')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requireTwoFactorSetup ? (
            <div className="space-y-4 max-w-md mx-auto">
              {/* 標題 - 紅框區域 */}
              <div className="border border-red-500 rounded-md p-3 mb-4">
                <h2 className="text-xl font-semibold text-center">設置二步驗證</h2>
                <p className="text-gray-500 text-sm text-center mt-1">
                  透過使用Google Authenticator掃描下方QR碼來增強您的帳號安全性
                </p>
              </div>

              {/* 黃色警告提示區塊 */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-amber-800">
                      必須啟用二步驗證，為確保您帳號安全，未啟用的使用者將無法使用本系統。
                    </p>
                  </div>
                </div>
              </div>

              {/* 第1步 - 紅框區域 */}
              <div className="border border-red-500 rounded-md p-3 mb-4">
                <p className="font-medium text-gray-800 text-center mb-2">第1步：下載 Google Authenticator 應用</p>
                <div className="flex justify-center space-x-6">
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" 
                    target="_blank" 
                    rel="noopener" 
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Android下載
                  </a>
                  <a 
                    href="https://apps.apple.com/us/app/google-authenticator/id388497605" 
                    target="_blank" 
                    rel="noopener" 
                    className="text-blue-500 hover:underline text-sm"
                  >
                    iOS下載
                  </a>
                </div>
              </div>

              {/* 第2步 - 紅框區域 */}
              <div className="border border-red-500 rounded-md p-3 mb-4">
                <p className="font-medium text-gray-800 text-center mb-3">第2步：掃描QR碼</p>
                {qrCode && (
                  <div className="flex justify-center">
                    <div className="border border-gray-200 p-1">
                      <img src={qrCode} alt="二步驗證QR碼" className="w-48 h-48" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* 密鑰顯示 - 紅框區域 */}
              {secret && (
                <div className="border border-red-500 rounded-md p-3 mb-4">
                  <p className="text-gray-500 text-sm text-center mb-1">如無法掃描，請手動輸入以下密鑰：</p>
                  <div className="bg-gray-100 p-2 text-center font-mono text-sm">
                    {secret}
                  </div>
                </div>
              )}

              {/* 第3步 - 紅框區域 */}
              <div className="border border-red-500 rounded-md p-3 mb-4">
                <p className="font-medium text-gray-800 text-center mb-2">第3步：輸入驗證碼</p>
                <Form {...setupTwoFactorForm}>
                  <form onSubmit={setupTwoFactorForm.handleSubmit(onSubmitSetupTwoFactor)}>
                    <FormField
                      control={setupTwoFactorForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="213755" 
                              maxLength={6} 
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="text-center h-12 text-lg py-3 max-w-xs mx-auto border-gray-300"
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
                      <div className="p-4 mt-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <p className="font-medium text-red-800">設置二步驗證失敗</p>
                        </div>
                        <p className="text-red-700 text-sm mt-1 ml-7">
                          驗證碼不正確，請重新嘗試
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between space-x-2 mt-4">
                      <Button type="button" variant="outline" className="h-12 px-8 border-gray-300 rounded-md" onClick={handleGoBack} disabled={isLoading}>
                        返回
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 rounded-md" 
                        disabled={isLoading}
                      >
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
            <div className="text-center">
              {/* 嚴格按照圖片實現 - 第一行標題 */}
              <div className="mb-4">
                <h2 className="text-xl font-normal">二步驗證</h2>
                <p className="text-gray-500 mt-1">
                  請輸入Google Authenticator中的驗證碼
                </p>
              </div>
              
              {/* 嚴格按照圖片實現 - 第二行標題 */}
              <div className="mb-4">
                <h2 className="text-xl font-normal">二步驗證</h2>
                <p className="text-gray-500 mt-1">
                  請輸入Google Authenticator中的驗證碼
                </p>
              </div>
              
              {/* 嚴格按照圖片實現 - 第三行標題（其實仍在紅框區域外部） */}
              <div className="mb-4">
                <h2 className="text-xl font-normal">二步驗證</h2>
                <p className="text-gray-500 mt-1">
                  請輸入Google Authenticator中的驗證碼
                </p>
              </div>
              
              {/* 紅框區域 - 完全按照參考圖片 */}
              <div className="border border-red-500 rounded-md p-4 mb-4">
                {/* 第一行標題 */}
                <div className="mb-4">
                  <h2 className="text-xl font-normal">二步驗證</h2>
                  <p className="text-gray-500 mt-1">
                    請輸入Google Authenticator中的驗證碼
                  </p>
                </div>
                
                {/* 第二行標題 */}
                <div className="mb-4">
                  <h2 className="text-xl font-normal">二步驗證</h2>
                  <p className="text-gray-500 mt-1">
                    請輸入Google Authenticator中的驗證碼
                  </p>
                </div>
                
                {/* 提示文字 */}
                <div className="mb-6">
                  <p className="text-gray-500 text-center">
                    請打開Google Authenticator應用並輸入顯示的6位數驗證碼
                  </p>
                </div>
                
                {/* 下載按鈕 */}
                <div className="flex justify-center space-x-6">
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" 
                    target="_blank" 
                    rel="noopener" 
                    className="text-blue-500 hover:underline"
                  >
                    Android下載
                  </a>
                  <a 
                    href="https://apps.apple.com/us/app/google-authenticator/id388497605" 
                    target="_blank" 
                    rel="noopener" 
                    className="text-blue-500 hover:underline"
                  >
                    iOS下載
                  </a>
                </div>
              </div>
              
              {/* 需要驗證文字 - 嚴格按照圖片位置 */}
              <div className="text-right text-gray-600 mb-2">
                需要驗證
              </div>
              
              {/* 輸入框 - 精確符合參考圖片 */}
              <Form {...twoFactorForm}>
                <form onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)}>
                  <div className="space-y-4">
                    {/* 6位數輸入框 */}
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <FormField
                        control={twoFactorForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <Input 
                                placeholder="請輸入6位數驗證碼" 
                                maxLength={6} 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="one-time-code"
                                className="text-center text-lg py-3 border-0 shadow-none focus-visible:ring-0"
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* 錯誤訊息 */}
                    <div className="min-h-6">
                      {twoFactorForm.formState.errors.code && (
                        <p className="text-sm text-red-500 text-center">
                          {twoFactorForm.formState.errors.code.message}
                        </p>
                      )}
                    </div>
                    
                    {/* 驗證失敗提示 */}
                    {twoFactorError && (
                      <div className="p-4 my-2 bg-red-50 border-l-4 border-red-500 rounded-md">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <p className="font-medium text-red-800">驗證失敗</p>
                        </div>
                        <p className="text-red-700 text-sm mt-1 ml-7">
                          驗證碼不正確，請重新嘗試
                        </p>
                      </div>
                    )}
                    
                    {/* 按鈕區 - 精確符合參考圖片 */}
                    <div className="flex justify-between space-x-2 mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-1/4 py-2 border-gray-300 rounded-md" 
                        onClick={handleGoBack} 
                        disabled={isLoading}
                      >
                        返回
                      </Button>
                      <Button 
                        type="submit" 
                        className="w-3/4 bg-blue-600 hover:bg-blue-700 py-2 rounded-md" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            驗證中...
                          </>
                        ) : '驗證'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
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
