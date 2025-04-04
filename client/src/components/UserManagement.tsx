import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@shared/schema";
import { Plus, Pencil, Trash2, UserPlus, UserIcon } from "lucide-react";

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 狀態變數
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUsername, setEditingUsername] = useState("");
  
  // 表單狀態
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // 獲取所有用戶
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users']
  });
  
  // 獲取用戶群組
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['/api/user-groups']
  });
  
  // 創建用戶的mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      email: string;
      displayName?: string;
      role: string;
      groupId?: number | null;
    }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "用戶已創建",
        description: "新用戶已成功創建",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      resetForm();
      setCreateUserDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "創建失敗",
        description: error instanceof Error ? error.message : "創建用戶時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 用戶編輯的mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      groupId: number | null;
    }) => {
      const response = await fetch(`/api/users/${data.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId: data.groupId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "用戶已更新",
        description: "用戶群組已成功更新",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditUserDialogOpen(false);
      setEditingUserId(null);
      setSelectedGroupId(null);
    },
    onError: (error) => {
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "更新用戶時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 打開編輯用戶對話框
  const openEditUserDialog = (user: any) => {
    setEditingUserId(user.id);
    setEditingUsername(user.displayName || user.username);
    setSelectedGroupId(user.groupId);
    setEditUserDialogOpen(true);
  };

  // 處理用戶編輯提交
  const handleUpdateUser = () => {
    if (editingUserId === null) return;
    
    updateUserMutation.mutate({
      userId: editingUserId,
      groupId: selectedGroupId
    });
  };
  
  // 刪除用戶的mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "用戶已刪除",
        description: "用戶已成功從系統中刪除",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "刪除用戶時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 重置表單
  const resetForm = () => {
    setUsername("");
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedGroupId(null);
  };
  
  // 驗證表單
  const validateForm = () => {
    if (!username || !email || !password) {
      toast({
        title: "表單不完整",
        description: "請填寫所有必填字段",
        variant: "destructive",
      });
      return false;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "密碼不匹配",
        description: "兩次輸入的密碼不一致",
        variant: "destructive",
      });
      return false;
    }
    
    if (password.length < 6) {
      toast({
        title: "密碼太短",
        description: "密碼至少需要6個字符",
        variant: "destructive",
      });
      return false;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "郵箱格式錯誤",
        description: "請輸入有效的電子郵箱地址",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };
  
  // 處理創建用戶
  const handleCreateUser = () => {
    if (!validateForm()) return;
    
    console.log('新增用戶資料:', {
      username,
      password,
      email,
      displayName,
      role: UserRole.USER, // 指定為一般用戶，所有用戶權限通過群組管理
      groupId: selectedGroupId
    });
    
    // 處理表單數據，確保類型正確
    const userData = {
      username,
      password,
      email,
      role: UserRole.USER, // 默認為一般用戶，所有用戶權限通過群組管理
      isActive: true
    };
    
    // 只有當displayName有值時才添加
    if (displayName.trim()) {
      Object.assign(userData, { displayName });
    }
    
    // 只有當選擇了群組時才添加groupId
    if (selectedGroupId !== null) {
      Object.assign(userData, { groupId: selectedGroupId });
    }
    
    console.log('最終處理後的用戶數據:', userData);
    
    createUserMutation.mutate(userData);
  };
  
  // 根據角色獲取中文顯示名稱
  const getRoleDisplayName = (role: string) => {
    switch(role) {
      case UserRole.ADMIN: return "管理員";
      case UserRole.PM: return "專案經理";
      case UserRole.USER: return "一般用戶";
      default: return role;
    }
  };
  
  // 根據角色獲取徽章變種
  const getRoleBadgeVariant = (role: string) => {
    switch(role) {
      case UserRole.ADMIN: return "default";
      case UserRole.PM: return "secondary";
      case UserRole.USER: return "outline";
      default: return "outline";
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">用戶管理</h2>
          <p className="text-gray-500">管理系統中的所有用戶</p>
        </div>
        
        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              創建新用戶
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>創建新用戶</DialogTitle>
              <DialogDescription>
                填寫以下信息創建新用戶帳號
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">用戶名 *</Label>
                <Input 
                  id="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="輸入用戶名"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">顯示名稱</Label>
                <Input 
                  id="displayName" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="輸入顯示名稱（可選）"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">電子郵箱 *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="輸入電子郵箱"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">密碼 *</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入密碼"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">確認密碼 *</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次輸入密碼"
                />
              </div>
              

              
              <div className="space-y-2">
                <Label htmlFor="group">用戶群組</Label>
                <Select 
                  value={selectedGroupId?.toString() || "none"} 
                  onValueChange={(value) => setSelectedGroupId(value === "none" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇用戶群組（可選）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">無群組</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setCreateUserDialogOpen(false);
                }}
              >
                取消
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "創建中..." : "創建用戶"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>用戶列表</CardTitle>
          <CardDescription>
            系統中的所有用戶帳號
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="text-center py-4">加載中...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserIcon className="h-16 w-16 mx-auto opacity-20 mb-4" />
              <p className="text-lg">暫無用戶</p>
              <p className="text-sm">點擊"創建新用戶"按鈕添加系統用戶</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用戶名</TableHead>
                    <TableHead>顯示名稱</TableHead>
                    <TableHead>電子郵箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>群組</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.displayName || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.groupId ? (
                          <Badge variant="outline">
                            {groups?.find(g => g.id === user.groupId)?.name || `群組 ${user.groupId}`}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditUserDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>確認刪除用戶</AlertDialogTitle>
                                <AlertDialogDescription>
                                  您確定要刪除用戶 "{user.displayName || user.username}" 嗎？此操作不可撤銷。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  {deleteUserMutation.isPending ? "刪除中..." : "確認刪除"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 編輯用戶對話框 */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯用戶群組</DialogTitle>
            <DialogDescription>
              調整「{editingUsername}」所屬的用戶群組
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editGroup">用戶群組</Label>
              <Select 
                value={selectedGroupId?.toString() || "none"} 
                onValueChange={(value) => setSelectedGroupId(value === "none" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇用戶群組" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無群組</SelectItem>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditUserDialogOpen(false);
                setEditingUserId(null);
                setSelectedGroupId(null);
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "更新中..." : "更新用戶"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;