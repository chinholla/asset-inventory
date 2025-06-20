
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  AssetWithUser, 
  User, 
  CreateAssetInput, 
  UpdateAssetInput,
  UpdateAssetStatusInput,
  AssetHistoryWithDetails,
  DashboardStats,
  AssetStatus,
  AssetCategory,
  LoginInput
} from '../../server/src/schema';

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data state
  const [assets, setAssets] = useState<AssetWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryWithDetails[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AssetCategory | 'all'>('all');
  
  // Form state for asset creation/editing
  const [assetFormData, setAssetFormData] = useState<CreateAssetInput>({
    name: '',
    category: 'laptop',
    serial_number: '',
    model: null,
    brand: null,
    purchase_date: null,
    purchase_price: null,
    status: 'unallocated',
    allocated_to_user_id: null,
    notes: null
  });

  // Status update form
  const [statusUpdateData, setStatusUpdateData] = useState<{
    new_status: AssetStatus;
    allocated_to_user_id: number | null;
    notes: string | null;
  }>({
    new_status: 'unallocated',
    allocated_to_user_id: null,
    notes: null
  });

  // Edit form
  const [editFormData, setEditFormData] = useState<UpdateAssetInput>({
    id: 0,
    name: '',
    category: 'laptop',
    serial_number: '',
    model: null,
    brand: null,
    purchase_date: null,
    purchase_price: null,
    status: 'unallocated',
    allocated_to_user_id: null,
    notes: null
  });

  // Load data functions
  const loadAssets = useCallback(async () => {
    try {
      const result = await trpc.getAssets.query();
      setAssets(result);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadAssetHistory = useCallback(async () => {
    try {
      const result = await trpc.getAssetHistory.query({});
      setAssetHistory(result);
    } catch (error) {
      console.error('Failed to load asset history:', error);
    }
  }, []);

  const loadDashboardStats = useCallback(async () => {
    try {
      const result = await trpc.getDashboardStats.query();
      setDashboardStats(result);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }, []);

  // Load all data on mount
  useEffect(() => {
    loadAssets();
    loadUsers();
    loadAssetHistory();
    loadDashboardStats();
  }, [loadAssets, loadUsers, loadAssetHistory, loadDashboardStats]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const loginData: LoginInput = { email: loginEmail };
      const user = await trpc.login.mutate(loginData);
      setCurrentUser(user);
      setLoginEmail('');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your email.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Asset creation handler
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setIsLoading(true);
    try {
      const response = await trpc.createAsset.mutate(assetFormData);
      setAssets((prev: AssetWithUser[]) => [...prev, response]);
      setAssetFormData({
        name: '',
        category: 'laptop',
        serial_number: '',
        model: null,
        brand: null,
        purchase_date: null,
        purchase_price: null,
        status: 'unallocated',
        allocated_to_user_id: null,
        notes: null
      });
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to create asset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Asset status update handler
  const handleUpdateAssetStatus = async (assetId: number) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateAssetStatusInput = {
        asset_id: assetId,
        new_status: statusUpdateData.new_status,
        allocated_to_user_id: statusUpdateData.allocated_to_user_id,
        notes: statusUpdateData.notes,
        changed_by_user_id: currentUser.id
      };
      
      await trpc.updateAssetStatus.mutate(updateData);
      await loadAssets();
      await loadAssetHistory();
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to update asset status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Asset edit handler
  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setIsLoading(true);
    try {
      await trpc.updateAsset.mutate(editFormData);
      await loadAssets();
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to update asset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Asset deletion handler
  const handleDeleteAsset = async (assetId: number) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setIsLoading(true);
    try {
      await trpc.deleteAsset.mutate({ id: assetId });
      setAssets((prev: AssetWithUser[]) => prev.filter((asset: AssetWithUser) => asset.id !== assetId));
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to delete asset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter assets based on user role and filters
  const filteredAssets = assets.filter((asset: AssetWithUser) => {
    // For regular users, only show assets allocated to them
    if (currentUser && currentUser.role === 'user' && asset.allocated_to_user_id !== currentUser.id) {
      return false;
    }
    
    // Apply status filter
    if (filterStatus !== 'all' && asset.status !== filterStatus) {
      return false;
    }
    
    // Apply category filter
    if (filterCategory !== 'all' && asset.category !== filterCategory) {
      return false;
    }
    
    return true;
  });

  const getStatusBadgeColor = (status: AssetStatus) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'allocated': return 'bg-blue-500';
      case 'under-repair': return 'bg-yellow-500';
      case 'retired': return 'bg-red-500';
      case 'unallocated': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case 'laptop': return '💻';
      case 'keyboard': return '⌨️';
      case 'monitor': return '🖥️';
      case 'mouse': return '🖱️';
      case 'tablet': return '📱';
      case 'phone': return '📞';
      default: return '📦';
    }
  };

  // Login form if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              📦 Asset Manager
            </CardTitle>
            <CardDescription>
              Sign in to manage your assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              📦 Asset Manager
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-600">Welcome, </span>
                <span className="font-medium">{currentUser.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {currentUser.role}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setCurrentUser(null)}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="assets">📦 Assets</TabsTrigger>
            <TabsTrigger value="activity">📝 Activity</TabsTrigger>
            {currentUser.role === 'admin' && (
              <TabsTrigger value="admin">⚙️ Admin</TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Stats Cards */}
              {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Total Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.total_assets}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{dashboardStats.available_assets}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Allocated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{dashboardStats.allocated_assets}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Under Repair
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{dashboardStats.under_repair_assets}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Retired
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{dashboardStats.retired_assets}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Assets by Category */}
              {dashboardStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Assets by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      {dashboardStats.assets_by_category.map((item) => (
                        <div key={item.category} className="text-center">
                          <div className="text-2xl mb-1">{getCategoryIcon(item.category)}</div>
                          <div className="font-semibold">{item.count}</div>
                          <div className="text-xs text-gray-600 capitalize">{item.category}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assetHistory.slice(0, 5).map((activity: AssetHistoryWithDetails) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-lg">{getCategoryIcon(activity.asset.category)}</div>
                          <div>
                            <div className="font-medium">{activity.asset.name}</div>
                            <div className="text-sm text-gray-600">
                              Status changed from <Badge variant="outline" className="mx-1">{activity.previous_status || 'none'}</Badge> to <Badge className={getStatusBadgeColor(activity.new_status)}>{activity.new_status}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.created_at.toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div>
                      <Label>Filter by Status</Label>
                      <Select value={filterStatus} onValueChange={(value: AssetStatus | 'all') => setFilterStatus(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="unallocated">Unallocated</SelectItem>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="allocated">Allocated</SelectItem>
                          <SelectItem value="under-repair">Under Repair</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Filter by Category</Label>
                      <Select value={filterCategory} onValueChange={(value: AssetCategory | 'all') => setFilterCategory(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                          <SelectItem value="keyboard">Keyboard</SelectItem>
                          <SelectItem value="monitor">Monitor</SelectItem>
                          <SelectItem value="mouse">Mouse</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assets Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssets.map((asset: AssetWithUser) => (
                      <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getCategoryIcon(asset.category)}</span>
                              <div>
                                <CardTitle className="text-lg">{asset.name}</CardTitle>
                                <CardDescription>#{asset.serial_number}</CardDescription>
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(asset.status)}>
                              {asset.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {asset.brand && (
                              <div className="text-sm">
                                <span className="text-gray-600">Brand: </span>
                                <span className="font-medium">{asset.brand}</span>
                              </div>
                            )}
                            {asset.model && (
                              <div className="text-sm">
                                <span className="text-gray-600">Model: </span>
                                <span className="font-medium">{asset.model}</span>
                              </div>
                            )}
                            {asset.allocated_user && (
                              <div className="text-sm">
                                <span className="text-gray-600">Assigned to: </span>
                                <span className="font-medium">{asset.allocated_user.name}</span>
                              </div>
                            )}
                            {asset.purchase_price && (
                              <div className="text-sm">
                                <span className="text-gray-600">Value: </span>
                                <span className="font-medium">${asset.purchase_price.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          
                          {currentUser.role === 'admin' && (
                            <div className="flex gap-2 mt-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setStatusUpdateData({
                                        new_status: asset.status,
                                        allocated_to_user_id: asset.allocated_to_user_id,
                                        notes: null
                                      });
                                    }}
                                  >
                                    Update Status
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Update Asset Status</DialogTitle>
                                    <DialogDescription>
                                      Update the status of {asset.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>New Status</Label>
                                      <Select 
                                        value={statusUpdateData.new_status} 
                                        onValueChange={(value: AssetStatus) => 
                                          setStatusUpdateData((prev) => ({ ...prev, new_status: value }))
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unallocated">Unallocated</SelectItem>
                                          <SelectItem value="available">Available</SelectItem>
                                          <SelectItem value="allocated">Allocated</SelectItem>
                                          <SelectItem value="under-repair">Under Repair</SelectItem>
                                          <SelectItem value="retired">Retired</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {statusUpdateData.new_status === 'allocated' && (
                                      <div>
                                        <Label>Assign to User</Label>
                                        <Select 
                                          value={statusUpdateData.allocated_to_user_id?.toString() || ''} 
                                          onValueChange={(value: string) => 
                                            setStatusUpdateData((prev) => ({ 
                                              ...prev, 
                                              allocated_to_user_id: value ? parseInt(value) : null 
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select user" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {users.map((user: User) => (
                                              <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name} ({user.email})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    
                                    <div>
                                      <Label>Notes (optional)</Label>
                                      <Textarea
                                        placeholder="Add notes about this status change..."
                                        value={statusUpdateData.notes || ''}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                          setStatusUpdateData((prev) => ({ ...prev, notes: e.target.value || null }))
                                        }
                                      />
                                    </div>
                                    
                                    <Button 
                                      onClick={() => handleUpdateAssetStatus(asset.id)}
                                      disabled={isLoading}
                                      className="w-full"
                                    >
                                      {isLoading ? 'Updating...' : 'Update Status'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditFormData({
                                        id: asset.id,
                                        name: asset.name,
                                        category: asset.category,
                                        serial_number: asset.serial_number,
                                        model: asset.model,
                                        brand: asset.brand,
                                        purchase_date: asset.purchase_date,
                                        purchase_price: asset.purchase_price,
                                        status: asset.status,
                                        allocated_to_user_id: asset.allocated_to_user_id,
                                        notes: asset.notes
                                      });
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Edit Asset</DialogTitle>
                                  </DialogHeader>
                                  <form onSubmit={handleEditAsset} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Asset Name</Label>
                                        <Input
                                          value={editFormData.name || ''}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setEditFormData((prev: UpdateAssetInput) => ({ ...prev, name: e.target.value }))
                                          }
                                          required
                                        />
                                      </div>
                                      <div>
                                        <Label>Serial Number</Label>
                                        <Input
                                          value={editFormData.serial_number || ''}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setEditFormData((prev: UpdateAssetInput) => ({ ...prev, serial_number: e.target.value }))
                                          }
                                          required
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Category</Label>
                                        <Select 
                                          value={editFormData.category || 'laptop'} 
                                          onValueChange={(value: AssetCategory) => 
                                            setEditFormData((prev: UpdateAssetInput) => ({ ...prev, category: value }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="laptop">Laptop</SelectItem>
                                            <SelectItem value="keyboard">Keyboard</SelectItem>
                                            <SelectItem value="monitor">Monitor</SelectItem>
                                            <SelectItem value="mouse">Mouse</SelectItem>
                                            <SelectItem value="tablet">Tablet</SelectItem>
                                            <SelectItem value="phone">Phone</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label>Brand</Label>
                                        <Input
                                          value={editFormData.brand || ''}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setEditFormData((prev: UpdateAssetInput) => ({ ...prev, brand: e.target.value || null }))
                                          }
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Model</Label>
                                        <Input
                                          value={editFormData.model || ''}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setEditFormData((prev: UpdateAssetInput) => ({ ...prev, model: e.target.value || null }))
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label>Purchase Price</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={editFormData.purchase_price || ''}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setEditFormData((prev: UpdateAssetInput) => ({ 
                                              ...prev, 
                                              purchase_price: e.target.value ? parseFloat(e.target.value) : null 
                                            }))
                                          }
                                        />
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label>Notes</Label>
                                      <Textarea
                                        value={editFormData.notes || ''}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                          setEditFormData((prev: UpdateAssetInput) => ({ ...prev, notes: e.target.value || null }))
                                        }
                                      />
                                    </div>
                                    
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                      {isLoading ? 'Updating...' : 'Update Asset'}
                                    </Button>
                                  </form>
                                </DialogContent>
                              </Dialog>
                              
                              <AlertDialog>
                                
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{asset.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteAsset(asset.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {filteredAssets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No assets found matching your filters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Asset History & Recent Activity</CardTitle>
                <CardDescription>
                  Track all asset status changes and assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Previous Status</TableHead>
                      <TableHead>New Status</TableHead>
                      <TableHead>Previous User</TableHead>
                      <TableHead>New User</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetHistory.map((record: AssetHistoryWithDetails) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getCategoryIcon(record.asset.category)}</span>
                            <div>
                              <div className="font-medium">{record.asset.name}</div>
                              <div className="text-xs text-gray-500">#{record.asset.serial_number}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.previous_status ? (
                            <Badge variant="outline">{record.previous_status}</Badge>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(record.new_status)}>
                            {record.new_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.previous_user ? record.previous_user.name : <span className="text-gray-400">None</span>}
                        </TableCell>
                        <TableCell>
                          {record.new_user ? record.new_user.name : <span className="text-gray-400">None</span>}
                        </TableCell>
                        <TableCell>{record.changed_by_user.name}</TableCell>
                        <TableCell>{record.created_at.toLocaleDateString()}</TableCell>
                        <TableCell>
                          {record.notes ? (
                            <span className="text-sm">{record.notes}</span>
                          ) : (
                            <span className="text-gray-400">No notes</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {assetHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No activity history available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {currentUser.role === 'admin' && (
            <TabsContent value="admin">
              <div className="space-y-6">
                {/* Add New Asset */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Asset</CardTitle>
                    <CardDescription>
                      Create a new asset in the inventory
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateAsset} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Asset Name *</Label>
                          <Input
                            placeholder="e.g., MacBook Pro 2023"
                            value={assetFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAssetFormData((prev: CreateAssetInput) => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label>Serial Number *</Label>
                          <Input
                            placeholder="e.g., SN123456789"
                            value={assetFormData.serial_number}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAssetFormData((prev: CreateAssetInput) => ({ ...prev, serial_number: e.target.value }))
                            }
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Category *</Label>
                          <Select 
                            value={assetFormData.category} 
                            onValueChange={(value: AssetCategory) => 
                              setAssetFormData((prev: CreateAssetInput) => ({ ...prev, category: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="laptop">💻 Laptop</SelectItem>
                              <SelectItem value="keyboard">⌨️ Keyboard</SelectItem>
                              <SelectItem value="monitor">🖥️ Monitor</SelectItem>
                              <SelectItem value="mouse">🖱️ Mouse</SelectItem>
                              <SelectItem value="tablet">📱 Tablet</SelectItem>
                              <SelectItem value="phone">📞 Phone</SelectItem>
                              <SelectItem value="other">📦 Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Brand</Label>
                          <Input
                            placeholder="e.g., Apple, Dell, HP"
                            value={assetFormData.brand || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAssetFormData((prev: CreateAssetInput) => ({ ...prev, brand: e.target.value || null }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Model</Label>
                          <Input
                            placeholder="e.g., MacBook Pro 14-inch"
                            value={assetFormData.model || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAssetFormData((prev: CreateAssetInput) => ({ ...prev, model: e.target.value || null }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Purchase Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={assetFormData.purchase_price || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAssetFormData((prev: CreateAssetInput) => ({ 
                                ...prev, 
                                purchase_price: e.target.value ? parseFloat(e.target.value) : null 
                              }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Purchase Date</Label>
                          <Input
                            type="date"
                            value={assetFormData.purchase_date ? assetFormData.purchase_date.toISOString().split('T')[0] : ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAssetFormData((prev: CreateAssetInput) => ({ 
                                ...prev, 
                                purchase_date: e.target.value ? new Date(e.target.value) : null 
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Initial Status</Label>
                          <Select 
                            value={assetFormData.status || 'unallocated'} 
                            onValueChange={(value: AssetStatus) => 
                              setAssetFormData((prev: CreateAssetInput) => ({ ...prev, status: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unallocated">Unallocated</SelectItem>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="allocated">Allocated</SelectItem>
                              <SelectItem value="under-repair">Under Repair</SelectItem>
                              <SelectItem value="retired">Retired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Additional notes about this asset..."
                          value={assetFormData.notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setAssetFormData((prev: CreateAssetInput) => ({ ...prev, notes: e.target.value || null }))
                          }
                        />
                      </div>
                      
                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? 'Creating Asset...' : 'Create Asset'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* User Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View all users in the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Assets Assigned</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: User) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assets.filter((asset: AssetWithUser) => asset.allocated_to_user_id === user.id).length}
                            </TableCell>
                            <TableCell>{user.created_at.toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
