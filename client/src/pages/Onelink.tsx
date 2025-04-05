import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { OnelinkField } from '@shared/schema';
import { Plus, Copy, RefreshCcw, Trash, Edit, Search, DownloadCloud, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

export default function OnelinkPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<OnelinkField | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://example.onelink.me/abc');
  const [selectedOnelinkId, setSelectedOnelinkId] = useState<number | null>(null);
  const [customParams, setCustomParams] = useState<Record<string, string>>({});
  const [customParamKey, setCustomParamKey] = useState('');
  const [customParamValue, setCustomParamValue] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState<Array<{url: string, params: Record<string, string>}>>([]);
  
  // 記錄所有已產出的 URL（單個和批量）
  const [generatedUrls, setGeneratedUrls] = useState<Array<{
    id: string;
    url: string;
    timestamp: Date;
    type: 'single' | 'batch';
    params?: Record<string, string>;
  }>>([]);
  
  // 批量生成相關
  const [batchCount, setBatchCount] = useState(5);
  const [batchStartNumber, setBatchStartNumber] = useState(1);
  
  // 篩選相關
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sortField, setSortField] = useState<'platform' | 'campaignCode' | 'materialId' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 表單數據
  const [formData, setFormData] = useState({
    platform: '',
    campaignCode: '',
    materialId: '',
    groupId: '',
    customName: ''
  });
  
  // 預設平台選項
  const defaultPlatforms = [
    'Facebook',
    'IG',
    'TIKTOK',
    'X',
    'GOOGLE',
    'KOL',
    'AGENT'
  ];

  // 獲取所有 Onelink 字段
  const { 
    data: onelinkFields = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<OnelinkField[]>({
    queryKey: ['/api/onelink-fields'],
  });

  // 創建 Onelink 字段
  const createMutation = useMutation({
    mutationFn: (data: Omit<OnelinkField, 'id' | 'createdAt' | 'updatedAt'>) => {
      return apiRequest('/api/onelink-fields', {
        method: 'POST',
        data: data
      });
    },
    onSuccess: () => {
      toast({
        title: '建立成功',
        description: 'Onelink 參數設定已成功儲存。',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onelink-fields'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: '建立失敗',
        description: '無法建立 Onelink 參數設定，請稍後再試。',
        variant: 'destructive',
      });
      console.error('Create error:', error);
    },
  });

  // 更新 Onelink 字段
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<OnelinkField> }) => {
      return apiRequest(`/api/onelink-fields/${id}`, {
        method: 'PATCH',
        data: data
      });
    },
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: 'Onelink 參數設定已成功更新。',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onelink-fields'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: '更新失敗',
        description: '無法更新 Onelink 參數設定，請稍後再試。',
        variant: 'destructive',
      });
      console.error('Update error:', error);
    },
  });

  // 删除 Onelink 字段
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/onelink-fields/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: '刪除成功',
        description: 'Onelink 參數設定已成功刪除。',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onelink-fields'] });
    },
    onError: (error) => {
      toast({
        title: '刪除失敗',
        description: '無法刪除 Onelink 參數設定，請稍後再試。',
        variant: 'destructive',
      });
      console.error('Delete error:', error);
    },
  });

  // 生成 Onelink URL
  const generateMutation = useMutation({
    mutationFn: (data: { id: number, baseUrl: string, customParams?: Record<string, string> }) => {
      return apiRequest('/api/generate-onelink', {
        method: 'POST',
        data: data
      });
    },
    onSuccess: (data) => {
      setGeneratedUrl(data.url);
      
      // 添加到已產出 URL 列表
      const newUrlEntry = {
        id: `single-${Date.now()}`,
        url: data.url,
        timestamp: new Date(),
        type: 'single' as const,
        params: {...customParams}
      };
      setGeneratedUrls(prev => [newUrlEntry, ...prev]);
      
      toast({
        title: 'URL 生成成功',
        description: '已成功生成 Onelink URL',
      });
    },
    onError: (error) => {
      toast({
        title: '生成失敗',
        description: '無法生成 Onelink URL，請稍後再試。',
        variant: 'destructive',
      });
      console.error('Generate error:', error);
    },
  });

  // 處理表單提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingField) {
      updateMutation.mutate({
        id: editingField.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // 處理表單輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 處理選擇框變更
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 處理編輯按鈕點擊
  const handleEdit = (field: OnelinkField) => {
    setEditingField(field);
    setFormData({
      platform: field.platform,
      campaignCode: field.campaignCode,
      materialId: field.materialId,
      groupId: field.groupId || '',
      customName: field.customName || ''
    });
    setIsModalOpen(true);
  };

  // 重置表單
  const resetForm = () => {
    setFormData({
      platform: '',
      campaignCode: '',
      materialId: '',
      groupId: '',
      customName: ''
    });
    setEditingField(null);
  };

  // 處理模態框關閉
  const handleModalClose = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // 處理刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: '數據已更新',
      description: 'Onelink 參數列表已刷新。',
    });
  };

  // 添加自定義參數
  const addCustomParam = () => {
    if (customParamKey && customParamValue) {
      setCustomParams(prev => ({
        ...prev,
        [customParamKey]: customParamValue
      }));
      setCustomParamKey('');
      setCustomParamValue('');
    }
  };

  // 刪除自定義參數
  const removeCustomParam = (key: string) => {
    const { [key]: _, ...rest } = customParams;
    setCustomParams(rest);
  };

  // 生成 URL
  const handleGenerateUrl = () => {
    if (selectedOnelinkId && baseUrl) {
      generateMutation.mutate({
        id: selectedOnelinkId,
        baseUrl,
        customParams: Object.keys(customParams).length > 0 ? customParams : undefined
      });
    } else {
      toast({
        title: '生成失敗',
        description: '請選擇 Onelink 參數設定並輸入基本 URL。',
        variant: 'destructive',
      });
    }
  };

  // 複製 URL 到剪貼板
  const copyToClipboard = (url = generatedUrl) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast({
        title: '已複製到剪貼板',
        description: '已成功複製 URL 到剪貼板。',
      });
    }
  };
  
  // 批量生成 URL
  const handleBatchGenerate = async () => {
    if (!selectedOnelinkId || !baseUrl) {
      toast({
        title: '生成失敗',
        description: '請選擇 Onelink 參數設定並輸入基本 URL。',
        variant: 'destructive',
      });
      return;
    }
    
    const urls: Array<{url: string, params: Record<string, string>}> = [];
    let allCustomParams = { ...customParams };
    
    try {
      for (let i = 0; i < batchCount; i++) {
        const currentNumber = batchStartNumber + i;
        
        // 直接將序號添加到 af_sub4 參數中
        allCustomParams = {
          ...customParams,
          af_sub4: currentNumber.toString()
        };
        
        // 呼叫 API 生成 URL
        const response = await apiRequest('/api/generate-onelink', {
          method: 'POST',
          data: {
            id: selectedOnelinkId,
            baseUrl,
            customParams: allCustomParams
          }
        });
        
        urls.push(response);
        
        // 添加到已產出 URL 列表
        const newUrlEntry = {
          id: `batch-${Date.now()}-${i}`,
          url: response.url,
          timestamp: new Date(),
          type: 'batch' as const,
          params: {...allCustomParams}
        };
        setGeneratedUrls(prev => [newUrlEntry, ...prev]);
      }
      
      setBatchUrls(urls);
      setIsBatchModalOpen(true);
      
      toast({
        title: '批量生成成功',
        description: `已成功生成 ${batchCount} 個 Onelink URL`,
      });
    } catch (error) {
      toast({
        title: '批量生成失敗',
        description: '生成過程中發生錯誤，請稍後再試。',
        variant: 'destructive',
      });
      console.error('Batch generate error:', error);
    }
  };
  
  // 複製所有批量生成的 URL
  const copyAllBatchUrls = () => {
    if (batchUrls.length > 0) {
      const allUrls = batchUrls.map(item => item.url).join('\n');
      navigator.clipboard.writeText(allUrls);
      toast({
        title: '已複製到剪貼板',
        description: `已成功複製 ${batchUrls.length} 個 URL 到剪貼板。`,
      });
    }
  };
  
  // 匯出批量生成的 URL 為 CSV
  const exportBatchUrlsAsCsv = () => {
    if (batchUrls.length > 0) {
      // 創建 CSV 內容
      let csvContent = 'Serial,URL\n';
      batchUrls.forEach((item, index) => {
        const serialNum = batchStartNumber + index;
        csvContent += `${serialNum},"${item.url}"\n`;
      });
      
      // 創建 Blob 和下載連結
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `onelink_batch_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // 篩選和排序 Onelink 字段
  const filteredAndSortedOnelinkFields = (() => {
    // 先篩選
    let filtered = [...onelinkFields];
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(field => 
        field.platform.toLowerCase().includes(lowerSearchTerm) ||
        field.campaignCode.toLowerCase().includes(lowerSearchTerm) ||
        field.materialId.toLowerCase().includes(lowerSearchTerm) ||
        (field.groupId && field.groupId.toLowerCase().includes(lowerSearchTerm)) ||
        (field.customName && field.customName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    if (platformFilter) {
      filtered = filtered.filter(field => field.platform === platformFilter);
    }
    
    // 再排序
    return filtered.sort((a, b) => {
      const getValue = (field: OnelinkField, key: typeof sortField) => {
        if (key === 'createdAt') {
          return new Date(field[key]).getTime();
        }
        return field[key]?.toLowerCase() || '';
      };
      
      const valueA = getValue(a, sortField);
      const valueB = getValue(b, sortField);
      
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  })();
  
  // 處理排序切換
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 獲取所有平台選項
  const platformOptions = (() => {
    const platforms = new Set<string>();
    onelinkFields.forEach(field => {
      platforms.add(field.platform);
    });
    return Array.from(platforms);
  })();

  return (
    <div className="space-y-4 p-4 sm:p-6 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onelink 管理</h1>
          <p className="text-muted-foreground">
            管理和生成 AppsFlyer Onelink URL 用於行銷活動追蹤。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={`${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={handleRefresh}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full" onValueChange={(value) => setActiveTab(value as 'generate' | 'manage')}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="generate">生成 Onelink</TabsTrigger>
          <TabsTrigger value="manage">管理參數設定</TabsTrigger>
        </TabsList>

        {/* 生成 Onelink URL 的標籤內容 */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>生成 Onelink URL</CardTitle>
              <CardDescription>
                選擇一個預設的參數設定，設置基本 URL 並添加自定義參數。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="onelink-select">選擇參數設定</Label>
                  <Select value={selectedOnelinkId?.toString() || ''} onValueChange={(value) => setSelectedOnelinkId(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇 Onelink 參數設定" />
                    </SelectTrigger>
                    <SelectContent>
                      {onelinkFields.map((field) => (
                        <SelectItem key={field.id} value={field.id.toString()}>
                          {field.platform} - {field.campaignCode} ({field.materialId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="base-url">基本 URL</Label>
                  <Input
                    id="base-url"
                    placeholder="輸入 Onelink 基本 URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    例如：https://example.onelink.me/abc
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>自定義參數</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="參數名稱"
                      value={customParamKey}
                      onChange={(e) => setCustomParamKey(e.target.value)}
                    />
                    <Input
                      placeholder="參數值"
                      value={customParamValue}
                      onChange={(e) => setCustomParamValue(e.target.value)}
                    />
                    <Button type="button" onClick={addCustomParam}>
                      添加
                    </Button>
                  </div>
                </div>

                {Object.keys(customParams).length > 0 && (
                  <div className="border rounded-md p-3 space-y-2">
                    <h3 className="font-medium">已添加的自定義參數：</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(customParams).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="flex items-center space-x-1">
                          <span>{key}={value}</span>
                          <button 
                            onClick={() => removeCustomParam(key)}
                            className="ml-1 rounded-full bg-muted h-4 w-4 inline-flex items-center justify-center hover:bg-muted-foreground hover:text-muted"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={handleGenerateUrl} disabled={!selectedOnelinkId || !baseUrl}>
                    生成單個 Onelink URL
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBatchModalOpen(true)} 
                    disabled={!selectedOnelinkId || !baseUrl}
                  >
                    <DownloadCloud className="h-4 w-4 mr-1" />
                    批量生成 URL
                  </Button>
                </div>

                {generatedUrl && (
                  <div className="border rounded-md p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">生成的 URL：</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedUrl)}>
                        <Copy className="h-4 w-4 mr-1" />
                        複製
                      </Button>
                    </div>
                    <div className="bg-muted p-2 rounded-md overflow-x-auto">
                      <code className="text-sm break-all">{generatedUrl}</code>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 已產出 URL 列表 */}
          {generatedUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>已產出 URL 列表</CardTitle>
                <CardDescription>
                  所有已產出的 Onelink URL，總共 {generatedUrls.length} 個
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>時間</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="w-[50px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedUrls.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">{item.timestamp.toLocaleString('zh-TW')}</TableCell>
                        <TableCell>{item.type === 'single' ? '單個' : '批量'}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">
                            <code className="text-xs font-mono">{item.url}</code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(item.url)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 管理參數設定的標籤內容 */}
        <TabsContent value="manage" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜尋 Onelink 參數設定..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs pl-8"
                  />
                </div>
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="所有平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有平台</SelectItem>
                  {platformOptions.map(platform => (
                    <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新增 Onelink 參數設定
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Onelink 參數設定列表</CardTitle>
              <CardDescription>
                管理所有已儲存的 AppsFlyer Onelink 參數設定，總共 {filteredAndSortedOnelinkFields.length} 組。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">載入 Onelink 參數設定中...</p>
                  </div>
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">無法載入 Onelink 參數設定</p>
                  <Button variant="outline" onClick={() => refetch()}>重試</Button>
                </div>
              ) : onelinkFields.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-gray-500 mb-4">暫無 Onelink 參數設定</p>
                  <Button onClick={() => setIsModalOpen(true)}>新增 Onelink 參數設定</Button>
                </div>
              ) : filteredAndSortedOnelinkFields.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-gray-500 mb-4">沒有符合篩選條件的 Onelink 參數設定</p>
                  <Button variant="outline" onClick={() => {
                    setSearchTerm('');
                    setPlatformFilter('');
                  }}>清除篩選條件</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('platform')}>
                        <div className="flex items-center">
                          平台　Media Source (pid)
                          {sortField === 'platform' && (
                            <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('campaignCode')}>
                        <div className="flex items-center">
                          活動代碼　Campaign (c)
                          {sortField === 'campaignCode' && (
                            <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('materialId')}>
                        <div className="flex items-center">
                          素材編號　af_sub1
                          {sortField === 'materialId' && (
                            <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>廣告組　af_adset</TableHead>
                      <TableHead>廣告名稱　af_ad</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedOnelinkFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.platform}</TableCell>
                        <TableCell>{field.campaignCode}</TableCell>
                        <TableCell>{field.materialId}</TableCell>
                        <TableCell>{field.groupId || '-'}</TableCell>
                        <TableCell>{field.customName || '-'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(field)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if (confirm('確定要刪除此 Onelink 參數設定嗎？')) {
                              deleteMutation.mutate(field.id);
                            }
                          }}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新增/編輯模態框 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingField ? '編輯' : '新增'} Onelink 參數設定</DialogTitle>
            <DialogDescription>
              {editingField ? '修改現有的' : '建立新的'} AppsFlyer Onelink 參數設定。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="platform">平台　Media Source (pid) *</Label>
                  <Select 
                    value={formData.platform} 
                    onValueChange={(value) => handleSelectChange('platform', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇平台" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultPlatforms.map(platform => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                      ))}
                      <SelectItem value="custom">自定義平台</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.platform === 'custom' && (
                    <Input
                      id="customPlatform"
                      name="platform"
                      placeholder="輸入自定義平台名稱"
                      value={formData.platform === 'custom' ? '' : formData.platform}
                      onChange={(e) => {
                        // 當輸入自定義平台名稱時，直接更新 formData
                        if (e.target.value !== 'custom') {
                          setFormData(prev => ({ ...prev, platform: e.target.value }));
                        }
                      }}
                      className="mt-2"
                      required
                    />
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="campaignCode">活動代碼　Campaign (c) *</Label>
                  <Input
                    id="campaignCode"
                    name="campaignCode"
                    placeholder="例如：FB_SUM2023"
                    value={formData.campaignCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="materialId">素材編號　af_sub1 *</Label>
                  <Input
                    id="materialId"
                    name="materialId"
                    placeholder="例如：FB001"
                    value={formData.materialId}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="groupId">廣告組　af_adset</Label>
                  <Input
                    id="groupId"
                    name="groupId"
                    placeholder="例如：0415_group"
                    value={formData.groupId}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="customName">廣告名稱　af_ad</Label>
                  <Input
                    id="customName"
                    name="customName"
                    placeholder="例如：臉書促銷活動"
                    value={formData.customName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleModalClose}>
                取消
              </Button>
              <Button type="submit">{editingField ? '更新' : '儲存'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 批量生成模態框 */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量生成 Onelink URL</DialogTitle>
            <DialogDescription>
              設置批量參數，自動生成多個 Onelink URL
            </DialogDescription>
          </DialogHeader>
          
          {/* 批量設置部分 */}
          {batchUrls.length === 0 ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch-count">生成數量</Label>
                  <Input
                    id="batch-count"
                    type="number"
                    min="1"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value) || 5)}
                  />
                </div>
                <div>
                  <Label htmlFor="batch-start">起始序號</Label>
                  <Input
                    id="batch-start"
                    type="number"
                    min="1"
                    value={batchStartNumber}
                    onChange={(e) => setBatchStartNumber(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              
              <DialogFooter className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBatchModalOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleBatchGenerate} disabled={!selectedOnelinkId || !baseUrl}>
                  開始批量生成
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-muted-foreground">已生成 {batchUrls.length} 個 Onelink URL</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyAllBatchUrls}>
                    <Copy className="h-4 w-4 mr-1" />
                    複製所有 URL
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportBatchUrlsAsCsv}>
                    <DownloadCloud className="h-4 w-4 mr-1" />
                    匯出 CSV
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">序號</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchUrls.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{batchStartNumber + index}</TableCell>
                        <TableCell className="max-w-lg truncate">
                          <code className="text-xs">{item.url}</code>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(item.url)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <DialogFooter className="pt-4">
                <Button onClick={() => {
                  setBatchUrls([]);
                  setIsBatchModalOpen(false);
                }}>
                  完成
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}