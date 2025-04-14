import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserGroup, User, Permission } from "@shared/schema";
import { Plus, Pencil, Trash2, Users, Shield, Check, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 定義權限類別 (嚴格按照指定的分類和項目)
const permissionCategories = {
  POST_MANAGEMENT: {
    title: "貼文管理",
    permissions: [
      { id: Permission.VIEW_POSTS, name: "查看貼文管理" },
      { id: Permission.CREATE_POST, name: "新增貼文" },
      { id: Permission.EDIT_POST, name: "編輯貼文" },
      { id: Permission.DELETE_POST, name: "刪除貼文" },
      { id: Permission.PUBLISH_POST, name: "發布貼文" },
    ]
  },
  CONTENT_CALENDAR: {
    title: "內容日曆",
    permissions: [
      { id: Permission.VIEW_PAGES, name: "查看內容日曆" },
      { id: Permission.CREATE_POST, name: "新增貼文" },
      { id: Permission.EDIT_POST, name: "編輯貼文" },
      { id: Permission.PUBLISH_POST, name: "發布貼文" },
    ]
  },
  ANALYTICS: {
    title: "數據分析",
    permissions: [
      { id: Permission.VIEW_ANALYTICS, name: "查看數據分析" },
      { id: Permission.MANAGE_PAGES, name: "連接Facebook" },
      { id: Permission.EXPORT_DATA, name: "匯出數據" },
      { id: Permission.VIEW_ANALYTICS, name: "同步數據" }, // 目前使用VIEW_ANALYTICS權限代替
    ]
  },
  MARKETING_MANAGEMENT: {
    title: "行銷管理",
    permissions: [
      { id: Permission.VIEW_MARKETING_TASKS, name: "查看行銷管理" },
      { id: Permission.CREATE_MARKETING_TASK, name: "新增行銷任務" },
      { id: Permission.EDIT_MARKETING_TASK, name: "編輯行銷任務" },
      { id: Permission.DELETE_MARKETING_TASK, name: "刪除行銷任務" },
    ]
  },
  OPERATION_MANAGEMENT: {
    title: "營運管理",
    permissions: [
      { id: Permission.VIEW_OPERATION_TASKS, name: "查看營運管理" },
      { id: Permission.CREATE_OPERATION_TASK, name: "新增營運任務" },
      { id: Permission.EDIT_OPERATION_TASK, name: "編輯營運任務" },
      { id: Permission.DELETE_OPERATION_TASK, name: "刪除營運任務" },
    ]
  },
  ONELINK_MANAGEMENT: {
    title: "Onelink管理",
    permissions: [
      { id: Permission.VIEW_ONELINK, name: "查看Onelink管理" },
      { id: Permission.MANAGE_ONELINK, name: "生成單個Onelink URL" },
      { id: Permission.MANAGE_ONELINK, name: "批量生成URL" },
      { id: Permission.CREATE_PAGE, name: "新增Onelink參數設定" }, // 目前使用CREATE_PAGE權限代替
      { id: Permission.EDIT_PAGE, name: "編輯Onelink參數設定" }, // 目前使用EDIT_PAGE權限代替
      { id: Permission.DELETE_PAGE, name: "刪除Onelink參數設定" }, // 目前使用DELETE_PAGE權限代替
    ]
  },
  RECYCLE_BIN: {
    title: "還原區",
    permissions: [
      { id: Permission.VIEW_POSTS, name: "查看還原區" },
      { id: Permission.EDIT_POST, name: "還原貼文" },
      { id: Permission.DELETE_POST, name: "永久刪除" },
    ]
  },
  SETTINGS: {
    title: "設定",
    permissions: [
      // 帳戶：此權限每個帳號都有，無須另外提供設定
      { id: Permission.MANAGE_SETTINGS, name: "連接" },
      { id: Permission.VIEW_PAGES, name: "粉絲專頁" },
      { id: Permission.VIEW_USERS, name: "用戶管理" },
      { id: Permission.VIEW_USER_GROUPS, name: "用戶群組" },
      // 通知：此權限每個帳號都有，無須另外提供設定
    ]
  }
};

// 用戶群組管理組件
const UserGroupManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 當前選中的群組
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // 對話框狀態
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  
  // 表單狀態
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // 獲取用戶群組列表
  const { data: groups, isLoading: isLoadingGroups } = useQuery<UserGroup[]>({
    queryKey: ['/api/user-groups'],
    onError: (error) => {
      toast({
        title: "獲取群組失敗",
        description: "無法獲取用戶群組列表，請稍後再試",
        variant: "destructive",
      });
    }
  });
  
  // 獲取當前選中的群組詳情
  const { data: selectedGroup, isLoading: isLoadingGroupDetails } = useQuery<UserGroup & { users: User[] }>({
    queryKey: ['/api/user-groups', selectedGroupId],
    enabled: selectedGroupId !== null,
    onError: (error) => {
      toast({
        title: "獲取群組詳情失敗",
        description: "無法獲取用戶群組詳情，請稍後再試",
        variant: "destructive",
      });
    }
  });
  
  // 獲取所有用戶列表（用於分配用戶到群組）
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    onError: (error) => {
      toast({
        title: "獲取用戶失敗",
        description: "無法獲取用戶列表，請稍後再試",
        variant: "destructive",
      });
    }
  });
  
  // 創建新群組的mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; permissions: Permission[] }) => {
      // 將description為空字符串轉換為null
      const processedData = {
        name: data.name,
        description: data.description || null,
        permissions: data.permissions
      };
      
      console.log('創建新群組處理後的數據:', processedData);
      
      const response = await fetch('/api/user-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "群組已創建",
        description: `用戶群組 "${data.name}" 已成功創建`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-groups'] });
      resetFormState();
      setNewGroupDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "創建失敗",
        description: error instanceof Error ? error.message : "創建用戶群組時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 更新群組的mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: { id: number; permissions: Permission[] }) => {
      console.log('正在更新群組:', data);
      // 只更新權限，不修改名稱和描述
      const processedData = {
        permissions: data.permissions
      };
      
      console.log('處理後的數據:', processedData);
      
      try {
        const response = await fetch(`/api/user-groups/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(processedData),
          credentials: 'include'
        });
        
        const responseText = await response.text();
        console.log('伺服器響應:', responseText);
        
        if (!response.ok) {
          console.error('更新群組失敗:', responseText);
          throw new Error(responseText || `伺服器錯誤: ${response.status}`);
        }
        
        try {
          return responseText ? JSON.parse(responseText) : null;
        } catch (jsonError) {
          console.error('解析伺服器響應JSON錯誤:', jsonError);
          // 返回一個最小的有效對象，以便onSuccess處理程序可以繼續
          return { 
            id: data.id,
            name: "未知群組",
            permissions: data.permissions
          };
        }
      } catch (error) {
        console.error('更新群組請求錯誤:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "群組已更新",
        description: `用戶群組已成功更新權限`,
      });
      
      // 強制刷新所有相關查詢
      queryClient.invalidateQueries({ queryKey: ['/api/user-groups'] });
      
      // 強制刷新當前群組詳情
      if (selectedGroupId) {
        console.log('強制刷新群組詳情:', selectedGroupId);
        queryClient.invalidateQueries({ queryKey: ['/api/user-groups', selectedGroupId] });
        
        // 如果需要，強制刷新特定群組詳情
        queryClient.refetchQueries({ queryKey: ['/api/user-groups', selectedGroupId] });
      }
      
      resetFormState();
      setEditGroupDialogOpen(false);
      
      // 強制更新本地緩存的權限數據
      if (selectedGroup) {
        queryClient.setQueryData(['/api/user-groups', selectedGroupId], {
          ...selectedGroup,
          permissions: data.permissions
        });
      }
    },
    onError: (error) => {
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "更新用戶群組時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 刪除群組的mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/user-groups/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "群組已刪除",
        description: "用戶群組已成功刪除",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-groups'] });
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
    },
    onError: (error) => {
      toast({
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "刪除用戶群組時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 添加用戶到群組的mutation
  const addUserToGroupMutation = useMutation({
    mutationFn: async (data: { groupId: number; userId: number }) => {
      const response = await fetch(`/api/user-groups/${data.groupId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: data.userId }),
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
        title: "用戶已添加",
        description: "用戶已成功添加到群組",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-groups', selectedGroupId] });
      setAssignUserDialogOpen(false);
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast({
        title: "添加失敗",
        description: error instanceof Error ? error.message : "添加用戶到群組時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 從群組移除用戶的mutation
  const removeUserFromGroupMutation = useMutation({
    mutationFn: async (data: { groupId: number; userId: number }) => {
      const response = await fetch(`/api/user-groups/${data.groupId}/users/${data.userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "用戶已移除",
        description: "用戶已成功從群組中移除",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-groups', selectedGroupId] });
    },
    onError: (error) => {
      toast({
        title: "移除失敗",
        description: error instanceof Error ? error.message : "從群組移除用戶時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 初始化編輯表單數據
  useEffect(() => {
    if (selectedGroup && editGroupDialogOpen) {
      setGroupName(selectedGroup.name);
      setGroupDescription(selectedGroup.description || "");
      setSelectedPermissions(selectedGroup.permissions as Permission[] || []);
    }
  }, [selectedGroup, editGroupDialogOpen]);
  
  // 重置表單狀態
  const resetFormState = () => {
    setGroupName("");
    setGroupDescription("");
    setSelectedPermissions([]);
    setSelectedUserId(null);
  };
  
  // 處理創建新群組
  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: "驗證錯誤",
        description: "群組名稱不能為空",
        variant: "destructive",
      });
      return;
    }
    
    console.log('創建群組：', {
      name: groupName,
      description: groupDescription || null,
      permissions: selectedPermissions
    });
    
    createGroupMutation.mutate({
      name: groupName,
      description: groupDescription || null,
      permissions: selectedPermissions
    });
  };
  
  // 處理更新群組 - 僅更新權限
  const handleUpdateGroup = () => {
    if (!selectedGroupId) return;
    
    console.log('更新群組權限：', {
      id: selectedGroupId,
      permissions: selectedPermissions
    });
    
    // 只更新權限，不修改名稱和描述
    updateGroupMutation.mutate({
      id: selectedGroupId,
      permissions: selectedPermissions
    });
  };
  
  // 處理刪除群組
  const handleDeleteGroup = () => {
    if (!selectedGroupId) return;
    deleteGroupMutation.mutate(selectedGroupId);
  };
  
  // 處理添加用戶到群組
  const handleAddUserToGroup = () => {
    if (!selectedGroupId || !selectedUserId) return;
    
    addUserToGroupMutation.mutate({
      groupId: selectedGroupId,
      userId: selectedUserId
    });
  };
  
  // 處理從群組移除用戶
  const handleRemoveUserFromGroup = (userId: number) => {
    if (!selectedGroupId) return;
    
    removeUserFromGroupMutation.mutate({
      groupId: selectedGroupId,
      userId
    });
  };
  
  // 切換單個權限選擇
  const togglePermission = (permission: Permission) => {
    setSelectedPermissions(current => 
      current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission]
    );
  };
  
  // 切換一個類別的所有權限
  const toggleCategoryPermissions = (categoryPermissions: { id: Permission }[]) => {
    // 獲取類別中的所有權限
    const categoryPermissionIds = categoryPermissions.map(p => p.id);
    
    // 檢查該類別的權限是否都已經被選中
    const isAllSelected = categoryPermissionIds.every(id => selectedPermissions.includes(id));
    
    if (isAllSelected) {
      // 如果全部選中，則取消所有選中
      setSelectedPermissions(current => 
        current.filter(p => !categoryPermissionIds.includes(p))
      );
    } else {
      // 如果未全部選中，則全部選中
      setSelectedPermissions(current => {
        const newPermissions = [...current];
        categoryPermissionIds.forEach(id => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      });
    }
  };
  
  // 獲取可分配的用戶列表（不包括已在群組中的用戶）
  const getAssignableUsers = () => {
    if (!users || !selectedGroup?.users) return [];
    
    const currentUserIds = selectedGroup.users.map(user => user.id);
    return users.filter(user => !currentUserIds.includes(user.id));
  };
  
  const assignableUsers = getAssignableUsers();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">用戶群組管理</h2>
          <p className="text-gray-500">管理用戶群組及其權限</p>
        </div>
        
        <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
          <DialogTrigger asChild>
            <Button className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              創建新群組
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>創建新用戶群組</DialogTitle>
              <DialogDescription>
                創建新的用戶群組並分配權限
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">群組名稱 *</Label>
                    <Input 
                      id="group-name" 
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="輸入群組名稱"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="group-description">群組描述</Label>
                    <Input 
                      id="group-description" 
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder="輸入群組描述（可選）"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>選擇權限</Label>
                  <div className="h-[300px] overflow-y-auto border rounded-md p-4 space-y-6">
                    {Object.entries(permissionCategories).map(([category, { title, permissions }]) => {
                      // 檢查該類別的權限是否全部選中
                      const allPermissionIds = permissions.map(p => p.id);
                      const isAllSelected = allPermissionIds.every(id => selectedPermissions.includes(id));
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{title}</h4>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-7 px-2 text-xs flex items-center"
                              onClick={() => toggleCategoryPermissions(permissions)}
                            >
                              {isAllSelected ? (
                                <>
                                  <X className="h-3 w-3 mr-1" />
                                  取消全選
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  全選
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="ml-4 space-y-2">
                            {permissions.map(perm => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`perm-${perm.id}`}
                                  checked={selectedPermissions.includes(perm.id)}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                />
                                <Label 
                                  htmlFor={`perm-${perm.id}`}
                                  className="cursor-pointer"
                                >
                                  {perm.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetFormState();
                  setNewGroupDialogOpen(false);
                }}
              >
                取消
              </Button>
              <Button 
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? "創建中..." : "創建群組"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 群組列表 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>群組列表</CardTitle>
            <CardDescription>
              選擇一個群組查看詳情
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoadingGroups ? (
                <div className="text-center py-4">加載中...</div>
              ) : !groups || groups.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-12 w-12 mx-auto opacity-20 mb-2" />
                  <p>暫無用戶群組</p>
                </div>
              ) : (
                groups.map(group => (
                  <div 
                    key={group.id} 
                    className={`p-3 rounded-md cursor-pointer transition-colors ${selectedGroupId === group.id ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-gray-100'}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="font-medium">{group.name}</div>
                    {group.description && <div className="text-sm text-gray-500 truncate">{group.description}</div>}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* 群組詳情 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{selectedGroup?.name || "群組詳情"}</CardTitle>
                <CardDescription>
                  {selectedGroup?.description || "選擇一個群組查看詳情"}
                </CardDescription>
              </div>
              
              {selectedGroup && (
                <div className="flex items-center space-x-2">
                  <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        編輯
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>編輯用戶群組</DialogTitle>
                        <DialogDescription>
                          修改用戶群組信息和權限設置
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-group-name">群組名稱</Label>
                              <Input 
                                id="edit-group-name" 
                                value={groupName}
                                readOnly
                                disabled
                                className="bg-gray-100"
                              />
                              <p className="text-xs text-gray-500 italic">群組名稱不可修改</p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="edit-group-description">群組描述</Label>
                              <Input 
                                id="edit-group-description" 
                                value={groupDescription}
                                readOnly
                                disabled
                                className="bg-gray-100"
                              />
                              <p className="text-xs text-gray-500 italic">群組描述不可修改</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <Label>選擇權限</Label>
                            <div className="h-[300px] overflow-y-auto border rounded-md p-4 space-y-6">
                              {Object.entries(permissionCategories).map(([category, { title, permissions }]) => {
                                // 檢查該類別的權限是否全部選中
                                const allPermissionIds = permissions.map(p => p.id);
                                const isAllSelected = allPermissionIds.every(id => selectedPermissions.includes(id));
                                
                                return (
                                  <div key={category} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold">{title}</h4>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-7 px-2 text-xs flex items-center"
                                        onClick={() => toggleCategoryPermissions(permissions)}
                                      >
                                        {isAllSelected ? (
                                          <>
                                            <X className="h-3 w-3 mr-1" />
                                            取消全選
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-3 w-3 mr-1" />
                                            全選
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <div className="ml-4 space-y-2">
                                      {permissions.map(perm => (
                                        <div key={perm.id} className="flex items-center space-x-2">
                                          <Checkbox 
                                            id={`edit-perm-${perm.id}`}
                                            checked={selectedPermissions.includes(perm.id)}
                                            onCheckedChange={() => togglePermission(perm.id)}
                                          />
                                          <Label 
                                            htmlFor={`edit-perm-${perm.id}`}
                                            className="cursor-pointer"
                                          >
                                            {perm.name}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            resetFormState();
                            setEditGroupDialogOpen(false);
                          }}
                        >
                          取消
                        </Button>
                        <Button 
                          onClick={handleUpdateGroup}
                          disabled={updateGroupMutation.isPending}
                        >
                          {updateGroupMutation.isPending ? "更新中..." : "更新群組"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        刪除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>確認刪除群組</AlertDialogTitle>
                        <AlertDialogDescription>
                          您確定要刪除 "{selectedGroup.name}" 群組嗎？此操作不可撤銷，且會移除所有用戶與此群組的關聯。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteGroup}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteGroupMutation.isPending ? "刪除中..." : "確認刪除"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedGroupId ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-16 w-16 mx-auto opacity-20 mb-4" />
                <p className="text-lg">請從左側選擇一個用戶群組</p>
                <p className="text-sm">查看和管理群組權限與成員</p>
              </div>
            ) : isLoadingGroupDetails ? (
              <div className="text-center py-8">加載中...</div>
            ) : !selectedGroup ? (
              <div className="text-center py-8 text-red-500">無法獲取群組詳情</div>
            ) : (
              <Tabs defaultValue="permissions" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="permissions" className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    權限設置
                  </TabsTrigger>
                  <TabsTrigger value="members" className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    群組成員 ({selectedGroup.users?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="permissions" className="space-y-6">
                  <div className="space-y-6">
                    {Object.entries(permissionCategories).map(([category, { title, permissions }]) => {
                      const categoryPermissions = permissions.filter(p => 
                        (selectedGroup.permissions as Permission[])?.includes(p.id)
                      );
                      
                      if (categoryPermissions.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <h4 className="font-semibold text-lg">{title}</h4>
                          <div className="flex flex-wrap gap-2">
                            {categoryPermissions.map(perm => (
                              <Badge key={perm.id} variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                {perm.name}
                              </Badge>
                            ))}
                          </div>
                          <Separator className="my-2" />
                        </div>
                      );
                    })}
                    
                    {!(selectedGroup.permissions as Permission[])?.length && (
                      <div className="text-center py-6 text-gray-500">
                        <Shield className="h-12 w-12 mx-auto opacity-20 mb-2" />
                        <p>此群組沒有設置任何權限</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => setEditGroupDialogOpen(true)}
                        >
                          設置權限
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="members" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-lg">群組成員</h4>
                    
                    <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>添加用戶到群組</DialogTitle>
                          <DialogDescription>
                            選擇要添加到 "{selectedGroup.name}" 群組的用戶
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="select-user">選擇用戶</Label>
                            {isLoadingUsers ? (
                              <div className="text-center py-2">加載用戶列表中...</div>
                            ) : assignableUsers.length === 0 ? (
                              <div className="text-center py-2 text-gray-500">
                                <p>沒有可添加的用戶</p>
                                <p className="text-xs">所有用戶已在此群組中</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-4">
                                {assignableUsers.map(user => (
                                  <div 
                                    key={user.id} 
                                    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${selectedUserId === user.id ? 'bg-primary/10' : 'hover:bg-gray-100'}`}
                                    onClick={() => setSelectedUserId(user.id)}
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium">{user.displayName || user.username}</div>
                                      <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                    {selectedUserId === user.id && (
                                      <Check className="h-5 w-5 text-primary" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedUserId(null);
                              setAssignUserDialogOpen(false);
                            }}
                          >
                            取消
                          </Button>
                          <Button 
                            onClick={handleAddUserToGroup}
                            disabled={!selectedUserId || addUserToGroupMutation.isPending || assignableUsers.length === 0}
                          >
                            {addUserToGroupMutation.isPending ? "添加中..." : "添加到群組"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {!selectedGroup.users || selectedGroup.users.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="h-12 w-12 mx-auto opacity-20 mb-2" />
                      <p>此群組暫無成員</p>

                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用戶名</TableHead>
                          <TableHead>顯示名稱</TableHead>
                          <TableHead>電子郵箱</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroup.users.map(user => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.displayName || "-"}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>確認移除用戶</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      您確定要將用戶 "{user.displayName || user.username}" 從 "{selectedGroup.name}" 群組中移除嗎？
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRemoveUserFromGroup(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {removeUserFromGroupMutation.isPending ? "移除中..." : "確認移除"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserGroupManagement;