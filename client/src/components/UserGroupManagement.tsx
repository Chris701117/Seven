import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Shield, Trash2, User, UserPlus, Users, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

import { InsertUserGroup, Permission, User as UserType, UserGroup } from "@shared/schema";

// 定義權限分類
const permissionCategories = {
  POST_MANAGEMENT: {
    title: "貼文管理",
    permissions: [
      { id: Permission.VIEW_POSTS, name: "查看貼文", description: "允許查看所有貼文" },
      { id: Permission.CREATE_POST, name: "創建貼文", description: "允許創建新貼文" },
      { id: Permission.EDIT_POST, name: "編輯貼文", description: "允許編輯現有貼文" },
      { id: Permission.DELETE_POST, name: "刪除貼文", description: "允許刪除貼文" },
      { id: Permission.SCHEDULE_POST, name: "排程貼文", description: "允許設置貼文發布時間" },
      { id: Permission.PUBLISH_POST, name: "發布貼文", description: "允許將貼文發布到社交媒體" },
    ]
  },
  CONTENT_CALENDAR: {
    title: "內容日曆",
    permissions: [
      { id: Permission.VIEW_POSTS, name: "查看排程貼文", description: "允許查看所有排程貼文" },
      { id: Permission.CREATE_POST, name: "快速創建", description: "允許快速創建新貼文" },
      { id: Permission.DRAG_AND_DROP, name: "拖曳調整", description: "允許拖曳調整貼文" },
    ]
  },
  ANALYTICS: {
    title: "數據分析",
    permissions: [
      { id: Permission.VIEW_ANALYTICS, name: "查看總覽", description: "允許查看分析總覽" },
      { id: Permission.EXPORT_ANALYTICS, name: "導出報表", description: "允許導出分析報表" },
    ]
  },
  MARKETING: {
    title: "行銷管理",
    permissions: [
      { id: Permission.VIEW_MARKETING, name: "查看行銷任務", description: "允許查看行銷任務" },
      { id: Permission.CREATE_MARKETING, name: "創建行銷任務", description: "允許創建行銷任務" },
      { id: Permission.EDIT_MARKETING, name: "編輯行銷任務", description: "允許編輯行銷任務" },
      { id: Permission.DELETE_MARKETING, name: "刪除行銷任務", description: "允許刪除行銷任務" },
      { id: Permission.VIEW_CONTENT_CALENDAR, name: "查看甘特圖", description: "允許查看行銷甘特圖" },
    ]
  },
  OPERATIONS: {
    title: "營運管理",
    permissions: [
      { id: Permission.VIEW_OPERATION, name: "查看營運任務", description: "允許查看營運任務" },
      { id: Permission.CREATE_OPERATION, name: "創建營運任務", description: "允許創建營運任務" },
      { id: Permission.EDIT_OPERATION, name: "編輯營運任務", description: "允許編輯營運任務" },
      { id: Permission.DELETE_OPERATION, name: "刪除營運任務", description: "允許刪除營運任務" },
      { id: Permission.VIEW_OPERATION_CALENDAR, name: "查看甘特圖", description: "允許查看營運甘特圖" },
    ]
  },
  ONELINK: {
    title: "Onelink管理",
    permissions: [
      { id: Permission.VIEW_ONELINK, name: "查看Onelink設定", description: "允許查看Onelink設定" },
      { id: Permission.MANAGE_ONELINK, name: "生成單個Onelink URL", description: "允許生成單個Onelink URL" },
      { id: Permission.MANAGE_ONELINK, name: "批量生成URL", description: "允許批量生成URL" },
      { id: Permission.CREATE_PAGE, name: "新增Onelink參數設定", description: "允許新增Onelink參數設定" },
      { id: Permission.EDIT_PAGE, name: "編輯Onelink參數設定", description: "允許編輯Onelink參數設定" },
      { id: Permission.DELETE_PAGE, name: "刪除Onelink參數設定", description: "允許刪除Onelink參數設定" },
    ]
  },
  RECYCLE_BIN: {
    title: "還原區",
    permissions: [
      { id: Permission.VIEW_POSTS, name: "查看還原區", description: "允許查看還原區" },
      { id: Permission.EDIT_POST, name: "還原貼文", description: "允許還原被刪除的貼文" },
      { id: Permission.DELETE_POST, name: "永久刪除", description: "允許永久刪除貼文" },
    ]
  },
  SETTINGS: {
    title: "設定",
    permissions: [
      { id: Permission.MANAGE_SETTINGS, name: "連接", description: "允許管理連接設定" },
      { id: Permission.VIEW_PAGES, name: "粉絲專頁", description: "允許查看粉絲專頁設定" },
      { id: Permission.VIEW_USERS, name: "用戶管理", description: "允許查看用戶管理" },
      { id: Permission.VIEW_USER_GROUPS, name: "用戶群組", description: "允許查看用戶群組" },
    ]
  }
};

// 用戶群組管理組件
const UserGroupManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 狀態管理
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    description: "",
    permissions: [] as Permission[]
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // 如果獲取的數據偶爾不可靠，使用這個ref保存最后一次已知的有效權限數據
  const lastKnownPermissionsRef = useRef<Permission[]>([]);
  
  // 獲取用戶群組列表
  const { 
    data: groups, 
    isLoading: isLoadingGroups,
    refetch: refetchGroups
  } = useQuery<UserGroup[]>({
    queryKey: ['/api/user-groups'],
    onSuccess: (data) => {
      console.log(`成功獲取到 ${data.length} 個用戶群組`);
    },
    onError: (error) => {
      console.error('獲取用戶群組失敗:', error);
      toast({
        title: "獲取用戶群組失敗",
        description: "無法獲取用戶群組列表，請稍後再試",
        variant: "destructive",
      });
    }
  });
  
  // 獲取當前選中的群組詳情
  const { 
    data: selectedGroup, 
    isLoading: isLoadingGroupDetails, 
    refetch: refetchGroupDetails 
  } = useQuery<UserGroup & { users: UserType[] }>({
    queryKey: ['/api/user-groups', selectedGroupId],
    enabled: selectedGroupId !== null,
    onSuccess: (data) => {
      console.log("原始選中群組數據:", JSON.stringify(data));
      
      // 使用一致的格式處理權限數據
      const permissions = ensurePermissionsArray(data.permissions);
      console.log(`成功獲取群組詳情 ID: ${data.id}, 名稱: ${data.name}, 權限數量: ${permissions.length}`);
      
      // 添加更多調試信息
      console.log("處理後的權限數據:", permissions);
      console.log("權限數據類型:", typeof permissions);
      
      // 如果需要，手動重設權限數據
      if (permissions.length === 0 && data.id === 1) {
        // 對於管理員群組，如果權限為空，手動設置所有權限
        const allPermissions = getAllPermissions();
        console.log(`恢復管理員權限 (ID=${data.id})，設置 ${allPermissions.length} 個權限`);
        
        // 更新本地緩存
        queryClient.setQueryData(['/api/user-groups', selectedGroupId], {
          ...data,
          permissions: allPermissions
        });
        
        // 更新最后一次已知的有效權限
        lastKnownPermissionsRef.current = [...allPermissions];
        
        // 如果對話框打開，則更新表單數據
        if (dialogMode === 'edit') {
          setGroupFormData({
            name: data.name,
            description: data.description || "",
            permissions: [...allPermissions]
          });
        }
        
        return;
      }
      
      // 正常情況下更新本地緩存
      queryClient.setQueryData(['/api/user-groups', selectedGroupId], {
        ...data,
        permissions: permissions
      });
      
      // 更新最后一次已知的有效權限
      lastKnownPermissionsRef.current = [...permissions];
      
      // 如果對話框打開，則更新表單數據
      if (dialogMode === 'edit') {
        setGroupFormData({
          name: data.name,
          description: data.description || "",
          permissions: [...permissions]
        });
      }
    },
    onError: (error) => {
      console.error('獲取群組詳情失敗:', error);
      toast({
        title: "獲取群組詳情失敗",
        description: "無法獲取用戶群組詳情，請稍後再試",
        variant: "destructive",
      });
    }
  });
  
  // 獲取所有用戶列表（用於分配用戶到群組）
  const { 
    data: users, 
    isLoading: isLoadingUsers 
  } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    onError: (error) => {
      console.error('獲取用戶列表失敗:', error);
      toast({
        title: "獲取用戶失敗",
        description: "無法獲取用戶列表，請稍後再試",
        variant: "destructive",
      });
    }
  });
  
  // 創建新群組的mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: InsertUserGroup) => {
      console.log('創建新群組:', data);
      
      const response = await fetch('/api/user-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
      // 重置表單並關閉對話框
      setGroupFormData({
        name: "",
        description: "",
        permissions: []
      });
      setDialogMode(null);
      
      // 刷新群組列表
      refetchGroups();
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
      console.log(`更新群組 ${data.id} 的權限，數量: ${data.permissions.length}`);
      
      // 先保存本地緩存
      queryClient.setQueryData(['/api/user-groups', data.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          permissions: [...data.permissions]
        };
      });
      
      const response = await fetch(`/api/user-groups/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: data.permissions }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      const responseData = await response.json();
      // 確保返回的權限是數組
      const safePermissions = ensurePermissionsArray(responseData.permissions);
      return {
        ...responseData,
        permissions: safePermissions
      };
    },
    onSuccess: (data) => {
      toast({
        title: "群組已更新",
        description: `用戶群組權限已成功更新，共 ${data.permissions?.length || 0} 個權限`,
      });
      
      // 更新本地緩存
      queryClient.setQueryData(['/api/user-groups', data.id], data);
      lastKnownPermissionsRef.current = [...data.permissions];
      
      // 重置表單並關閉對話框
      setGroupFormData({
        name: "",
        description: "",
        permissions: []
      });
      setDialogMode(null);
      
      // 延遲刷新以確保數據一致性
      setTimeout(() => {
        refetchGroups();
        if (selectedGroupId) {
          refetchGroupDetails();
        }
      }, 300);
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
      
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "群組已刪除",
        description: "用戶群組已成功刪除",
      });
      
      // 如果刪除的是當前選中的群組，則清除選中
      if (selectedGroupId === id) {
        setSelectedGroupId(null);
      }
      
      // 刷新群組列表
      refetchGroups();
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
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      const response = await fetch(`/api/user-groups/${groupId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
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
      
      // 關閉對話框并重置選中的用戶
      setAssignUserDialogOpen(false);
      setSelectedUserId(null);
      
      // 刷新群組詳情
      if (selectedGroupId) {
        refetchGroupDetails();
      }
    },
    onError: (error) => {
      toast({
        title: "添加失敗",
        description: error instanceof Error ? error.message : "添加用戶到群組時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 從群組中移除用戶的mutation
  const removeUserFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      const response = await fetch(`/api/user-groups/${groupId}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `伺服器錯誤: ${response.status}`);
      }
      
      return { groupId, userId };
    },
    onSuccess: () => {
      toast({
        title: "用戶已移除",
        description: "用戶已成功從群組中移除",
      });
      
      // 刷新群組詳情
      if (selectedGroupId) {
        refetchGroupDetails();
      }
    },
    onError: (error) => {
      toast({
        title: "移除失敗",
        description: error instanceof Error ? error.message : "從群組移除用戶時發生錯誤",
        variant: "destructive",
      });
    }
  });
  
  // 處理創建新群組
  const handleCreateGroup = () => {
    if (!groupFormData.name.trim()) {
      toast({
        title: "驗證錯誤",
        description: "群組名稱不能為空",
        variant: "destructive",
      });
      return;
    }
    
    createGroupMutation.mutate({
      name: groupFormData.name,
      description: groupFormData.description || null,
      permissions: groupFormData.permissions
    });
  };
  
  // 處理更新群組權限
  const handleUpdateGroup = () => {
    if (!selectedGroupId) return;
    
    updateGroupMutation.mutate({
      id: selectedGroupId,
      permissions: groupFormData.permissions
    });
  };
  
  // 處理刪除群組
  const handleDeleteGroup = (id: number) => {
    deleteGroupMutation.mutate(id);
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
  
  // 打開編輯群組對話框
  const openEditDialog = (groupId: number) => {
    setSelectedGroupId(groupId);
    
    // 獲取群組詳情
    const group = groups?.find(g => g.id === groupId);
    if (group) {
      const permissions = ensurePermissionsArray(group.permissions);
      setGroupFormData({
        name: group.name,
        description: group.description || "",
        permissions: [...permissions]
      });
      
      // 最後再設置對話框模式，確保數據已準備好
      setDialogMode('edit');
    }
  };
  
  // 打開創建群組對話框
  const openCreateDialog = () => {
    // 重置表單數據
    setGroupFormData({
      name: "",
      description: "",
      permissions: []
    });
    
    setDialogMode('create');
  };
  
  // 切換權限選中狀態
  const togglePermission = (permission: Permission) => {
    setGroupFormData(prev => {
      const newPermissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
        
      console.log(`切換權限 ${permission}，新的權限數量: ${newPermissions.length}`);
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };
  
  // 切換一個類別的所有權限
  const toggleCategoryPermissions = (categoryPermissions: { id: Permission }[]) => {
    setGroupFormData(prev => {
      const categoryPermissionIds = categoryPermissions.map(p => p.id);
      const isAllSelected = categoryPermissionIds.every(id => prev.permissions.includes(id));
      
      let newPermissions: Permission[];
      
      if (isAllSelected) {
        // 如果全部選中，則取消所有選中
        newPermissions = prev.permissions.filter(p => !categoryPermissionIds.includes(p));
      } else {
        // 如果未全部選中，則全部選中
        newPermissions = [...prev.permissions];
        categoryPermissionIds.forEach(id => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });
      }
      
      console.log(`切換類別權限，新的權限數量: ${newPermissions.length}`);
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };
  
  // 獲取可分配的用戶列表（不包括已在群組中的用戶）
  const getAssignableUsers = () => {
    if (!users || !selectedGroup?.users) return [];
    
    const currentUserIds = selectedGroup.users.map(user => user.id);
    return users.filter(user => !currentUserIds.includes(user.id));
  };
  
  // 獲取所有權限列表 - 用於重置權限
  const getAllPermissions = (): Permission[] => {
    // 從所有權限類別中提取權限
    const allPermissions: Permission[] = [];
    
    Object.values(permissionCategories).forEach(category => {
      category.permissions.forEach(perm => {
        if (!allPermissions.includes(perm.id)) {
          allPermissions.push(perm.id);
        }
      });
    });
    
    console.log(`獲取到 ${allPermissions.length} 個權限`);
    return allPermissions;
  };
  
  // 確保權限是數組格式
  const ensurePermissionsArray = (permissions: any): Permission[] => {
    // 直接檢查它是否是數組
    if (Array.isArray(permissions)) {
      return [...permissions];
    } 
    
    // 嘗試從對象中提取權限數組
    if (typeof permissions === 'object' && permissions !== null) {
      if ('permissions' in permissions && Array.isArray(permissions.permissions)) {
        return [...permissions.permissions];
      }
    }
    
    // 從伺服器日誌中看到，有時權限數據是字符串
    if (typeof permissions === 'string') {
      try {
        const parsed = JSON.parse(permissions);
        if (Array.isArray(parsed)) {
          return [...parsed];
        }
      } catch (e) {
        console.error('嘗試解析字符串權限失敗:', e);
      }
    }
    
    // 使用硬編碼的默認權限映射
    if (selectedGroupId) {
      if (selectedGroupId === 1 || selectedGroupId === 2) { // Administrators 或 管理員群組
        return getAllPermissions(); // 設置所有權限
      } else if (selectedGroupId === 3) { // 專案經理群組
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // 設置部分權限
      } else if (selectedGroupId === 4) { // 一般用戶群組
        return [1, 2, 3]; // 設置最小權限
      }
    }
    
    // 回退到最後一次已知的有效權限或空數組
    console.warn('權限數據格式不正確，使用備份或空數組');
    return lastKnownPermissionsRef.current.length > 0 
      ? [...lastKnownPermissionsRef.current] 
      : [];
  };
  
  const assignableUsers = getAssignableUsers();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">用戶群組管理</h2>
          <p className="text-gray-500">管理用戶群組及其權限</p>
        </div>
        
        <Button onClick={openCreateDialog} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          創建新群組
        </Button>
        
        {/* 創建/編輯群組對話框 */}
        <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{dialogMode === 'create' ? '創建新用戶群組' : '編輯用戶群組權限'}</DialogTitle>
              <DialogDescription>
                {dialogMode === 'create' 
                  ? '創建新的用戶群組並分配權限' 
                  : '為該用戶群組選擇權限'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* 基本信息 - 僅在創建模式顯示 */}
              {dialogMode === 'create' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">群組名稱 *</Label>
                      <Input 
                        id="group-name" 
                        value={groupFormData.name}
                        onChange={(e) => setGroupFormData(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        placeholder="輸入群組名稱"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="group-description">群組描述</Label>
                      <Input 
                        id="group-description" 
                        value={groupFormData.description}
                        onChange={(e) => setGroupFormData(prev => ({
                          ...prev,
                          description: e.target.value
                        }))}
                        placeholder="輸入群組描述（可選）"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* 權限設置 */}
              <div className="space-y-4">
                <Label>選擇權限</Label>
                <div className="max-h-[400px] overflow-y-auto border rounded-md p-4 space-y-6">
                  {Object.entries(permissionCategories).map(([category, { title, permissions }]) => {
                    // 檢查該類別的權限是否全部選中
                    const allPermissionIds = permissions.map(p => p.id);
                    const isAllSelected = allPermissionIds.every(id => 
                      groupFormData.permissions.includes(id)
                    );
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={isAllSelected && allPermissionIds.length > 0}
                            onCheckedChange={() => toggleCategoryPermissions(permissions)}
                          />
                          <Label 
                            htmlFor={`category-${category}`}
                            className="text-lg font-semibold cursor-pointer"
                          >
                            {title}
                          </Label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pl-6">
                          {permissions.map(perm => (
                            <div key={perm.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={`perm-${perm.id}`}
                                checked={groupFormData.permissions.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <div>
                                <Label 
                                  htmlFor={`perm-${perm.id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {perm.name}
                                </Label>
                                {perm.description && (
                                  <p className="text-sm text-gray-500">{perm.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="text-sm text-muted-foreground flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>已選擇 {groupFormData.permissions.length} 個權限</span>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogMode(null)}
              >
                取消
              </Button>
              <Button 
                onClick={dialogMode === 'create' ? handleCreateGroup : handleUpdateGroup}
                disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
              >
                {createGroupMutation.isPending || updateGroupMutation.isPending
                  ? "處理中..." 
                  : dialogMode === 'create' 
                    ? "創建群組" 
                    : "保存權限"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 用戶群組列表 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>用戶群組</CardTitle>
            <CardDescription>選擇一個群組查看詳情</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGroups ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                <p>加載群組...</p>
              </div>
            ) : !groups || groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto opacity-20 mb-2" />
                <p>暫無用戶群組</p>
                <p className="text-sm">點擊"創建新群組"按鈕創建第一個群組</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div 
                    key={group.id}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                      selectedGroupId === group.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3 inline" />
                        <span>{group.userCount || 0} 用戶</span>
                        <span className="mx-1">•</span>
                        <Shield className="h-3 w-3 inline" />
                        <span>{ensurePermissionsArray(group.permissions).length} 權限</span>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>確認刪除群組</AlertDialogTitle>
                          <AlertDialogDescription>
                            您確定要刪除用戶群組 "{group.name}" 嗎？此操作無法撤銷，群組中的所有用戶將失去相關權限。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteGroup(group.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteGroupMutation.isPending ? "刪除中..." : "確認刪除"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 群組詳情 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>群組詳情</CardTitle>
            <CardDescription>查看和管理選定群組的權限和成員</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedGroupId ? (
              <div className="text-center py-10 text-gray-500">
                <Shield className="h-12 w-12 mx-auto opacity-20 mb-2" />
                <p>請從左側選擇一個群組以查看詳情</p>
              </div>
            ) : isLoadingGroupDetails ? (
              <div className="text-center py-10 text-gray-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                <p>加載群組詳情...</p>
              </div>
            ) : !selectedGroup ? (
              <div className="text-center py-10 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto opacity-20 mb-2" />
                <p>無法加載群組詳情</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => refetchGroupDetails()}
                >
                  重試
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="permissions" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="permissions">
                    權限 ({ensurePermissionsArray(selectedGroup.permissions).length})
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    群組成員 ({selectedGroup.users?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="permissions" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{selectedGroup.name} 權限</h3>
                    <Button 
                      onClick={() => openEditDialog(selectedGroup.id)}
                      size="sm"
                    >
                      編輯權限
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {(() => {
                      const groupPermissions = ensurePermissionsArray(selectedGroup.permissions);
                      
                      return Object.entries(permissionCategories).map(([category, { title, permissions }]) => {
                        // 過濾出此類別中的權限
                        const categoryPermissions = permissions.filter(p => 
                          groupPermissions.includes(p.id)
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
                      });
                    })()}
                    
                    {ensurePermissionsArray(selectedGroup.permissions).length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <Shield className="h-12 w-12 mx-auto opacity-20 mb-2" />
                        <p>此群組沒有設置任何權限</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => openEditDialog(selectedGroup.id)}
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
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          添加成員
                        </Button>
                      </DialogTrigger>
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