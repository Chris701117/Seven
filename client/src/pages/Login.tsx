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
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, XCircle } from 'lucide-react';

// 登入表單 schema
const formSchema = z.object({
  username: z.string().min(3, { message: '用戶名至少需要3個字符' }),
  password: z.string().min(6, { message: '密碼至少需要6個字符' }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  });

  // 登入提交
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const data = await apiRequest('POST', '/api/login', values);
      if (data.success) {
        toast({ title: '登入成功', description: '歡迎回來！' });
        // 更新 /api/auth/me 快取
        queryClient.setQueryData(['/api/auth/me'], { username: data.username, userId: data.userId });
        // 導向後台主頁
        setLocation('/dashboard');
      } else {
        throw new Error(data.message || '登入失敗');
      }
    } catch (err) {
      toast({ variant: 'destructive', title: '登入失敗', description: '帳號或密碼不正確' });
      console.error('登入錯誤:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-normal text-center">歡迎回來</CardTitle>
          <CardDescription className="text-center text-gray-500">請輸入帳號密碼登入</CardDescription>
        </CardHeader>
        <CardContent>
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
                          if (e.key === 'Enter') {
                            form.handleSubmit(onSubmit)();
                          }
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
                        type="password"
                        {...field}
                        placeholder="請輸入密碼"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            form.handleSubmit(onSubmit)();
                          }
                        }}
                      />
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
                ) : (
                  '登入'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          本系統為邀請制，如需帳號請聯繫管理員
        </CardFooter>
      </Card>
    </div>
  );
}
