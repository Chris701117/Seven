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

export default function Register() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 初始化表單
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      displayName: '',
      email: '',
    },
  });

  // 表單提交處理
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // 使用正確的參數形式調用apiRequest
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        data: values
      });
      
      // 註冊成功
      toast({
        title: '註冊成功',
        description: '您的帳號已經創建',
      });
      
      // 重定向到首頁
      setLocation('/');
    } catch (error) {
      // 註冊失敗
      toast({
        variant: 'destructive',
        title: '註冊失敗',
        description: '該用戶名可能已經被使用',
      });
      console.error('註冊錯誤:', error);
    } finally {
      setIsLoading(false);
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
            創建新帳號
          </CardTitle>
          <CardDescription className="text-center">
            請填寫以下資料完成註冊
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