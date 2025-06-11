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
  CardTitle,
} from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, XCircle } from 'lucide-react';

// 定義登入表單的結構
const formSchema = z.object({
  username: z.string().min(3, { message: '用戶名至少需要3個字符' }),
  password: z.string().min(6, { message: '密碼至少需要6個字符' }),
});

// 定義二步驗證表單的結構
const twoFactorSchema = z.object({
  code: z
    .string()
    .min(6, { message: '驗證碼應為6位數字' })
    .max(6),
});

// 定義設置二步驗證表單的結構
const setupTwoFactorSchema = twoFactorSchema;

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [requireTwoFactorSetup, setRequireTwoFactorSetup] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState(false);

  // 登入表單
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  });

  // 二步驗證表單
  const twoFactorForm = useForm<z.infer<typeof twoFactorSchema>>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: '' },
  });

  // 設置二步驗證表單
  const setupTwoFactorForm = useForm<z.infer<typeof setupTwoFactorSchema>>({
    resolver: zodResolver(setupTwoFactorSchema),
    defaultValues: { code: '' },
  });

  // 登入提交
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const data = await apiRequest('POST', '/api/login', values);

      // 二步驗證設定流程
      if (data.requireTwoFactorSetup) {
        setRequireTwoFactorSetup(true);
        setUserId(data.userId);
        setQrCode(data.qrCode);
        setSecret(data.secret);
        toast({ title: '需要設置二步驗證', description: '請掃描 QR 碼並輸入一次性碼' });
      }
      // 二步驗證驗證流程
      else if (data.requireTwoFactor) {
        setRequireTwoFactor(true);
        setUserId(data.userId);
        toast({ title: '需要二步驗證', description: '請輸入 Google Authenticator 驗證碼' });
      }
      // 正常登入成功
      else {
        toast({ title: '登入成功', description: '歡迎回來！' });
        // 更新 /api/auth/me 快取
        queryClient.setQueryData(['/api/auth/me'], {
          username: data.username,
          userId: data.userId,
        });
        // 跳轉到後台 Dashboard
        setLocation('/dashboard');
      }
    } catch (err) {
      toast({ variant: 'destructive', title: '登入失敗', description: '帳號或密碼錯誤' });
      console.error('登入錯誤:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // 二步驗證提交
  async function onSubmitTwoFactor(values: z.infer<typeof twoFactorSchema>) {
    if (!userId) return;
    setIsLoading(true);
    setTwoFactorError(false);
    try {
      const data = await apiRequest('POST', '/api/auth/verify-2fa', {
        userId,
        code: values.code,
      });
      toast({ title: '驗證成功', description: '歡迎回來！' });
      queryClient.setQueryData(['/api/auth/me'], { username: data.username, userId: data.userId });
      setLocation('/dashboard');
    } catch (err) {
      setTwoFactorError(true);
      toast({ variant: 'destructive', title: '驗證失敗', description: '驗證碼不正確' });
      twoFactorForm.reset({ code: '' });
      console.error('二步驗證錯誤:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // 設置二步驗證提交
  async function onSubmitSetupTwoFactor(values: z.infer<typeof setupTwoFactorSchema>) {
    if (!userId) return;
    setIsLoading(true);
    setTwoFactorError(false);
    try {
      const data = await apiRequest('POST', '/api/auth/setup-2fa', {
        userId,
        code: values.code,
      });
      toast({ title: '設置成功', description: '二步驗證已啟用' });
      queryClient.setQueryData(['/api/auth/me'], { username: data.username, userId: data.userId });
      setLocation('/dashboard');
    } catch (err) {
      setTwoFactorError(true);
      toast({ variant: 'destructive', title: '設置失敗', description: '驗證碼不正確' });
      setupTwoFactorForm.reset({ code: '' });
      console.error('設置二步驗證錯誤:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // 回到登入
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
            {requireTwoFactorSetup
              ? '設置二步驗證'
              : requireTwoFactor
              ? '二步驗證'
              : '歡迎回來'}
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            {requireTwoFactorSetup
              ? '首次登入請掃描並輸入驗證碼'
              : requireTwoFactor
              ? '請輸入 Google Authenticator 驗證碼'
              : '請輸入帳號密碼登入'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requireTwoFactorSetup ? (
            // Setup 2FA
            <Form {...setupTwoFactorForm}>
              <form
                onSubmit={setupTwoFactorForm.handleSubmit(onSubmitSetupTwoFactor)}
                className="space-y-4"
              >
                <FormField
                  control={setupTwoFactorForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>驗證碼</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="輸入6位數驗證碼"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setupTwoFactorForm.handleSubmit(onSubmitSetupTwoFactor)();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {twoFactorError && (
                  <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="ml-2 text-red-800">設置失敗，請重試</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleGoBack}>返回</Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? '驗證中…' : '驗證並啟用'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : requireTwoFactor ? (
            // Verify 2FA
            <Form {...twoFactorForm}>
              <form
                onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)}
                className="space-y-4"
              >
                <FormField
                  control={twoFactorForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>驗證碼</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="輸入6位數驗證碼"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              twoFactorForm.handleSubmit(onSubmitTwoFactor)();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {twoFactorError && (
                  <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="ml-2 text-red-800">驗證失敗，請重試</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleGoBack}>返回</Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? '驗證中…' : '驗證'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            // Normal login
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用戶名</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="請輸入用戶名"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') form.handleSubmit(onSubmit)();
                          }}
                        />
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
                        <Input
                          {...field}
                          type="password"
                          placeholder="請輸入密碼"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') form.handleSubmit(onSubmit)();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : '登入'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          本系統為邀請制，如需帳號請聯繫管理員
        </CardFooter>
      </Card>
    </div>
);
}
