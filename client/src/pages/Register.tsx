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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// 定義註冊表單的結構
const formSchema = z.object({
  username: z.string().min(3, {
    message: '用戶名至少需要3個字符',
  }),
  password: z.string().min(6, {
    message: '密碼至少需要6個字符',
  }),
  displayName: z.string().min(2, {
    message: '顯示名稱至少需要2個字符',
  }),
  email: z.string().email({
    message: '請輸入有效的電子郵件地址',
  }),
});

// 驗證碼表單結構
const verifyCodeSchema = z.object({
  code: z.string().length(6, {
    message: '驗證碼必須是6位數字',
  }),
});

export default function Register() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const { toast } = useToast();

  // 初始化註冊表單
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      displayName: '',
      email: '',
    },
  });

  // 初始化驗證碼表單
  const verifyForm = useForm<z.infer<typeof verifyCodeSchema>>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  // 表單提交處理
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          role: 'USER', // 設置預設角色
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '註冊失敗');
      }
      
      // 獲取註冊響應
      const data = await response.json();
      console.log('註冊響應:', data);
      
      if (data.requireTwoFactor) {
        // 顯示二步驗證設置界面
        setQrCode(data.qrCode);
        setUserId(data.userId);
        setSecret(data.secret);
        setShowTwoFactorSetup(true);
        
        toast({
          title: '註冊成功',
          description: '請設置二步驗證以完成帳號註冊',
        });
      } else {
        // 無需二步驗證，直接登入成功
        toast({
          title: '註冊成功',
          description: '您的帳號已經創建',
        });
        
        // 重定向到首頁
        setLocation('/');
      }
    } catch (error) {
      // 註冊失敗
      toast({
        variant: 'destructive',
        title: '註冊失敗',
        description: error instanceof Error ? error.message : '該用戶名可能已經被使用',
      });
      console.error('註冊錯誤:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  // 驗證二步驗證碼
  async function onVerifyCode(values: z.infer<typeof verifyCodeSchema>) {
    if (!userId) return;
    
    setIsSubmittingCode(true);
    try {
      const response = await fetch('/api/auth/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: values.code,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '驗證失敗');
      }
      
      const data = await response.json();
      console.log('驗證響應:', data);
      
      toast({
        title: '設置成功',
        description: '二步驗證已成功設置，請登入',
      });
      
      // 重定向到登入頁
      setLocation('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '驗證失敗',
        description: error instanceof Error ? error.message : '驗證碼無效或已過期',
      });
      console.error('驗證錯誤:', error);
    } finally {
      setIsSubmittingCode(false);
    }
  }

  // 返回登入頁
  const handleBackToLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {showTwoFactorSetup ? '設置二步驗證' : '創建新帳號'}
          </CardTitle>
          <CardDescription className="text-center">
            {showTwoFactorSetup 
              ? '請使用 Google Authenticator 應用掃描二維碼並輸入驗證碼完成設置' 
              : '請填寫以下資料完成註冊'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showTwoFactorSetup ? (
            // 註冊表單
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
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>顯示名稱</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入顯示名稱" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>電子郵件</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="請輸入電子郵件" {...field} />
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
                  {isLoading ? '註冊中...' : '註冊'}
                </Button>
              </form>
            </Form>
          ) : (
            // 二步驗證設置界面
            <div className="space-y-6">
              <Alert className="bg-blue-50">
                <AlertDescription>
                  為了保護您的帳號安全，需要設置二步驗證才能完成註冊。請使用 Google Authenticator 或其他兼容的 TOTP 應用掃描下方的二維碼。
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-center">
                {qrCode && (
                  <img 
                    src={qrCode} 
                    alt="二步驗證 QR 碼" 
                    className="border rounded-lg p-2 max-w-[200px]"
                  />
                )}
              </div>
              
              {secret && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">如果您無法掃描二維碼，請手動輸入以下密鑰：</p>
                  <code className="bg-gray-100 p-1 rounded text-sm font-mono">{secret}</code>
                </div>
              )}
              
              <Separator />
              
              <Form {...verifyForm}>
                <form onSubmit={verifyForm.handleSubmit(onVerifyCode)} className="space-y-4">
                  <FormField
                    control={verifyForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>驗證碼</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="請輸入 6 位數驗證碼" 
                            maxLength={6}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isSubmittingCode}>
                    {isSubmittingCode ? '驗證中...' : '驗證並完成設置'}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm">
            已有帳號？
            <Button variant="link" className="px-2 py-0" onClick={handleBackToLogin}>
              返回登入
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}