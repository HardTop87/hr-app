import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssets } from '../../hooks/useAssets';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Monitor, 
  Smartphone, 
  Tv, 
  Cable, 
  Package,
  Plus,
  History,
  UserPlus,
  RotateCcw,
  AlertTriangle,
  Edit,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import type { Asset, AssetType, AssetStatus, WarrantyType } from '../../types/asset';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types/user';

const AssetManagement = () => {
  const { t } = useTranslation();
  const { assets, loading, addAsset, assignAsset, returnAsset, reportDefect, updateAssetDetails } = useAssets();
  const { userProfile, currentCompany } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState({
    identifier: '',
    serialNumber: '',
    model: '',
    type: 'laptop' as AssetType,
    status: 'in_stock' as AssetStatus,
    purchaseDate: '',
    purchasePrice: '',
    warrantyType: 'standard' as WarrantyType,
    warrantyEndDate: '',
    warrantyInfo: ''
  });
  const [assignUserId, setAssignUserId] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [defectNote, setDefectNote] = useState('');

  useEffect(() => {
    loadUsers();
  }, [currentCompany?.id]);

  const loadUsers = async () => {
    if (!currentCompany?.id) return;

    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('companyId', '==', currentCompany.id),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const loadedUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'laptop': return <Monitor className="w-5 h-5" />;
      case 'smartphone': return <Smartphone className="w-5 h-5" />;
      case 'monitor': return <Tv className="w-5 h-5" />;
      case 'peripheral': return <Cable className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'in_stock': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-green-100 text-green-800';
      case 'broken': return 'bg-red-100 text-red-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
    }
  };

  const isWarrantyExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const getWarrantyBadge = (asset: Asset) => {
    if (asset.warrantyType === 'none') {
      return <span className="text-xs text-gray-500">{t('assets.warranty.none')}</span>;
    }

    const isExpired = isWarrantyExpired(asset.warrantyEndDate);
    
    if (asset.warrantyType === 'extended') {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
          isExpired ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {isExpired ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
          {t('assets.warranty.extended')}
          {isExpired && ` (${t('assets.warranty.expired')})`}
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
        isExpired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {isExpired ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
        {t('assets.warranty.standard')}
        {isExpired && ` (${t('assets.warranty.expired')})`}
      </span>
    );
  };

  const getUserName = (userId?: string | null) => {
    if (!userId) return '-';
    const user = users.find(u => u.uid === userId);
    return user ? user.displayName : userId;
  };

  const getUserAvatar = (userId?: string | null) => {
    if (!userId) return null;
    const user = users.find(u => u.uid === userId);
    return user?.photoURL;
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;

    try {
      await addAsset({
        identifier: formData.identifier,
        serialNumber: formData.serialNumber || undefined,
        model: formData.model,
        type: formData.type,
        status: formData.status,
        purchaseDate: formData.purchaseDate || undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        warrantyType: formData.warrantyType,
        warrantyEndDate: formData.warrantyEndDate || undefined,
        warrantyInfo: formData.warrantyInfo || undefined,
        assignedToUserId: null,
        assignedDate: null
      }, userProfile.uid);

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !assignUserId || !userProfile?.uid) return;

    try {
      await assignAsset(selectedAsset.id, assignUserId, userProfile.uid);
      setShowAssignModal(false);
      setSelectedAsset(null);
      setAssignUserId('');
    } catch (error) {
      console.error('Error assigning asset:', error);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !userProfile?.uid) return;

    try {
      await returnAsset(selectedAsset.id, userProfile.uid, returnNote);
      setShowReturnModal(false);
      setSelectedAsset(null);
      setReturnNote('');
    } catch (error) {
      console.error('Error returning asset:', error);
    }
  };

  const handleDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !userProfile?.uid) return;

    try {
      await reportDefect(selectedAsset.id, userProfile.uid, defectNote);
      setShowDefectModal(false);
      setSelectedAsset(null);
      setDefectNote('');
    } catch (error) {
      console.error('Error reporting defect:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !userProfile?.uid) return;

    try {
      await updateAssetDetails(selectedAsset.id, {
        identifier: formData.identifier,
        serialNumber: formData.serialNumber || undefined,
        model: formData.model,
        type: formData.type,
        purchaseDate: formData.purchaseDate || undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        warrantyType: formData.warrantyType,
        warrantyEndDate: formData.warrantyEndDate || undefined,
        warrantyInfo: formData.warrantyInfo || undefined
      }, userProfile.uid);

      setShowEditModal(false);
      setSelectedAsset(null);
      resetForm();
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      identifier: '',
      serialNumber: '',
      model: '',
      type: 'laptop',
      status: 'in_stock',
      purchaseDate: '',
      purchasePrice: '',
      warrantyType: 'standard',
      warrantyEndDate: '',
      warrantyInfo: ''
    });
  };

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      identifier: asset.identifier,
      serialNumber: asset.serialNumber || '',
      model: asset.model,
      type: asset.type,
      status: asset.status,
      purchaseDate: asset.purchaseDate || '',
      purchasePrice: asset.purchasePrice?.toString() || '',
      warrantyType: asset.warrantyType,
      warrantyEndDate: asset.warrantyEndDate || '',
      warrantyInfo: asset.warrantyInfo || ''
    });
    setShowEditModal(true);
  };

  // Calculate KPIs
  const totalValue = assets.reduce((sum, asset) => sum + (asset.purchasePrice || 0), 0);
  const assignedCount = assets.filter(a => a.status === 'assigned').length;
  const brokenCount = assets.filter(a => a.status === 'broken').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('assets.title')}</h1>
          <p className="text-gray-600 mt-1">{t('assets.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('assets.actions.add')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('assets.kpi.totalValue')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                €{totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('assets.kpi.assigned')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{assignedCount}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('assets.kpi.broken')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{brokenCount}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.model')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.identifier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.assignedTo')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.warranty')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.price')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400">
                        {getTypeIcon(asset.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.model}</div>
                        <div className="text-xs text-gray-500">{t(`assets.types.${asset.type}`)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asset.identifier}</div>
                    {asset.serialNumber && (
                      <div className="text-xs text-gray-500">S/N: {asset.serialNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                      {t(`assets.status.${asset.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {asset.assignedToUserId ? (
                      <div className="flex items-center gap-2">
                        {getUserAvatar(asset.assignedToUserId) ? (
                          <img 
                            src={getUserAvatar(asset.assignedToUserId)!} 
                            alt="" 
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-600">
                              {getUserName(asset.assignedToUserId).charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-gray-900">{getUserName(asset.assignedToUserId)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getWarrantyBadge(asset)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {asset.purchasePrice 
                        ? `€${asset.purchasePrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
                        : '-'
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowHistoryModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title={t('assets.actions.viewHistory')}
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(asset)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {asset.status === 'in_stock' && (
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowAssignModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title={t('assets.actions.assign')}
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      {asset.status === 'assigned' && (
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowReturnModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900"
                          title={t('assets.actions.return')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {(asset.status === 'in_stock' || asset.status === 'assigned') && (
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowDefectModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title={t('assets.actions.reportDefect')}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {assets.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{t('assets.empty')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">
                {showAddModal ? t('assets.actions.add') : t('common.edit')}
              </h2>
              <button
                onClick={() => {
                  showAddModal ? setShowAddModal(false) : setShowEditModal(false);
                  setSelectedAsset(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddAsset : handleEdit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('assets.form.identifier')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.identifier}
                    onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                    className="input-field"
                    placeholder="INV-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('assets.form.serialNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                    className="input-field"
                    placeholder="C02XY1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('assets.form.type')} *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as AssetType})}
                    className="input-field"
                  >
                    <option value="laptop">{t('assets.types.laptop')}</option>
                    <option value="smartphone">{t('assets.types.smartphone')}</option>
                    <option value="monitor">{t('assets.types.monitor')}</option>
                    <option value="peripheral">{t('assets.types.peripheral')}</option>
                    <option value="other">{t('assets.types.other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('assets.form.model')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className="input-field"
                    placeholder="MacBook Pro M3 14&quot;"
                  />
                </div>
              </div>

              {/* Finance Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">{t('assets.form.financeSection')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('assets.form.purchaseDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('assets.form.purchasePrice')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                      className="input-field"
                      placeholder="1499.99"
                    />
                  </div>
                </div>
              </div>

              {/* Warranty Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">{t('assets.form.warrantySection')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('assets.form.warrantyType')}
                    </label>
                    <select
                      value={formData.warrantyType}
                      onChange={(e) => setFormData({...formData, warrantyType: e.target.value as WarrantyType})}
                      className="input-field"
                    >
                      <option value="none">{t('assets.warranty.none')}</option>
                      <option value="standard">{t('assets.warranty.standard')}</option>
                      <option value="extended">{t('assets.warranty.extended')}</option>
                    </select>
                  </div>
                  {formData.warrantyType !== 'none' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('assets.form.warrantyEndDate')}
                        </label>
                        <input
                          type="date"
                          value={formData.warrantyEndDate}
                          onChange={(e) => setFormData({...formData, warrantyEndDate: e.target.value})}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('assets.form.warrantyInfo')}
                        </label>
                        <input
                          type="text"
                          value={formData.warrantyInfo}
                          onChange={(e) => setFormData({...formData, warrantyInfo: e.target.value})}
                          className="input-field"
                          placeholder="AppleCare+ bis 2026"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    showAddModal ? setShowAddModal(false) : setShowEditModal(false);
                    setSelectedAsset(null);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {showAddModal ? t('common.create') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{t('assets.actions.assign')}</h2>
            </div>

            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('assets.assignModal.description', { asset: selectedAsset.model })}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assignModal.selectUser')} *
                </label>
                <select
                  required
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="input-field"
                >
                  <option value="">{t('assets.assignModal.selectPlaceholder')}</option>
                  {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedAsset(null);
                    setAssignUserId('');
                  }}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('assets.actions.assign')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{t('assets.actions.return')}</h2>
            </div>

            <form onSubmit={handleReturn} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('assets.returnModal.description', { asset: selectedAsset.model })}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.returnModal.condition')} *
                </label>
                <textarea
                  required
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder={t('assets.returnModal.conditionPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedAsset(null);
                    setReturnNote('');
                  }}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('assets.actions.confirmReturn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Defect Modal */}
      {showDefectModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{t('assets.actions.reportDefect')}</h2>
            </div>

            <form onSubmit={handleDefect} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('assets.defectModal.description', { asset: selectedAsset.model })}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.defectModal.description')} *
                </label>
                <textarea
                  required
                  value={defectNote}
                  onChange={(e) => setDefectNote(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder={t('assets.defectModal.placeholder')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowDefectModal(false);
                    setSelectedAsset(null);
                    setDefectNote('');
                  }}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700">
                  {t('assets.actions.confirmDefect')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('assets.history.title')}</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedAsset(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                {selectedAsset.history
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div key={index} className="flex gap-4 border-l-2 border-gray-200 pl-4">
                      <div className="flex-shrink-0 w-24 text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {t(`assets.history.actions.${entry.action}`)}
                        </p>
                        {entry.note && (
                          <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                        )}
                        {entry.userId && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t('assets.history.user')}: {getUserName(entry.userId)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
