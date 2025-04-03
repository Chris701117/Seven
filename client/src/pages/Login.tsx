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

// 定義登入表單的結構
const formSchema = z.object({
  username: z.string().min(3, {
    message: '用戶名至少需要3個字符',
  }),
  password: z.string().min(6, {
    message: '密碼至少需要6個字符',
  }),
});

export default function Login() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 初始化表單
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 表單提交處理
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // 使用正確的參數形式調用apiRequest
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        data: values
      });
      
      // 登入成功
      toast({
        title: '登入成功',
        description: '歡迎回來！',
      });
      
      // 重定向到首頁
      setLocation('/');
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

  // 邀請制系統不再提供註冊功能

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            歡迎回來
          </CardTitle>
          <CardDescription className="text-center">
            請輸入您的帳號密碼登入系統
          </CardDescription>
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
                {isLoading ? '登入中...' : '登入'}
              </Button>
            </form>
          </Form>
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