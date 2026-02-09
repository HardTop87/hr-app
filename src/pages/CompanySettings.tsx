import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Save,
  Upload,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Hash,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, getDoc, collection, addDoc, deleteDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

type TabId = 'company' | 'departments'; // | 'migration' - ausgeblendet

interface CompanyInfo {
  name: string;
  legalName: string;
  logoURL?: string;
  taxId?: string;
  registrationNumber?: string;
  address: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

interface Department {
  id: string;
  name: string;
  createdAt: Date;
}

export default function CompanySettings() {
  const { t } = useTranslation();
  const { currentCompany, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>('company');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Company Info State
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    legalName: '',
    logoURL: '',
    taxId: '',
    registrationNumber: '',
    address: {
      street: '',
      zip: '',
      city: '',
      country: '',
    },
    contact: {
      phone: '',
      email: '',
      website: '',
    },
  });
  
  // Departments State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  // Check if user has admin access
  const isAdmin = userProfile?.role === 'global_admin' || userProfile?.role === 'company_admin';

  useEffect(() => {
    if (isAdmin) {
      loadCompanyInfo();
      loadDepartments();
    }
  }, [currentCompany.id, isAdmin]);

  const loadCompanyInfo = async () => {
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, "companies", currentCompany.id));
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        setCompanyInfo({
          name: data.name || '',
          legalName: data.info?.legalName || '',
          logoURL: data.info?.logoURL || '',
          taxId: data.info?.taxId || '',
          registrationNumber: data.info?.registrationNumber || '',
          address: {
            street: data.info?.address?.street || '',
            zip: data.info?.address?.zip || '',
            city: data.info?.address?.city || '',
            country: data.info?.address?.country || '',
          },
          contact: {
            phone: data.info?.contact?.phone || '',
            email: data.info?.contact?.email || '',
            website: data.info?.contact?.website || '',
          },
        });
      }
    } catch (error) {
      console.error("Error loading company info:", error);
      toast.error(t('settings.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const departmentsSnapshot = await getDocs(
        collection(db, "companies", currentCompany.id, "departments")
      );
      const departmentsList: Department[] = [];
      departmentsSnapshot.forEach((doc) => {
        departmentsList.push({
          id: doc.id,
          name: doc.data().name,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        });
      });
      setDepartments(departmentsList);
    } catch (error) {
      console.error("Error loading departments:", error);
      toast.error(t('settings.errors.loadFailed'));
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.errors.invalidFileType'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('settings.errors.fileTooLarge'));
      return;
    }

    try {
      setSaving(true);
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `companies/${currentCompany.id}/logo/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update company document
      await updateDoc(doc(db, "companies", currentCompany.id), {
        'info.logoURL': downloadURL,
      });

      setCompanyInfo(prev => ({
        ...prev,
        logoURL: downloadURL,
      }));

      toast.success(t('settings.success.logoUploaded'));
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error(t('settings.errors.uploadFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveCompanyInfo = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "companies", currentCompany.id), {
        name: companyInfo.name,
        'info.legalName': companyInfo.legalName,
        'info.taxId': companyInfo.taxId,
        'info.registrationNumber': companyInfo.registrationNumber,
        'info.address': companyInfo.address,
        'info.contact': companyInfo.contact,
      });

      toast.success(t('settings.success.saved'));
    } catch (error) {
      console.error("Error saving company info:", error);
      toast.error(t('settings.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = async () => {
    if (!newDepartmentName.trim()) return;

    try {
      await addDoc(collection(db, "companies", currentCompany.id, "departments"), {
        name: newDepartmentName,
        createdAt: new Date(),
      });
      
      setNewDepartmentName("");
      await loadDepartments();
      toast.success(t('settings.success.departmentAdded'));
    } catch (error) {
      console.error("Error adding department:", error);
      toast.error(t('settings.errors.saveFailed'));
    }
  };

  const deleteDepartment = async (departmentId: string) => {
    if (!confirm(t('settings.confirmDelete'))) return;

    try {
      await deleteDoc(doc(db, "companies", currentCompany.id, "departments", departmentId));
      await loadDepartments();
      toast.success(t('settings.success.departmentDeleted'));
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error(t('settings.errors.deleteFailed'));
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{t('no_access')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cococo-berry"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-cococo-berry" />
            {t('company_settings')}
          </h1>
          <p className="text-gray-600 mt-2">{t('settings.description')}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'company'
                  ? 'border-cococo-berry text-cococo-berry'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-5 h-5 inline mr-2" />
              {t('settings.tabs.company')}
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'departments'
                  ? 'border-cococo-berry text-cococo-berry'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              {t('settings.tabs.departments')}
            </button>
            
            {/* Migration Tab (nur für Global Admin) - AUSGEBLENDET aber Code behalten */}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'company' && (
          <div className="space-y-8">
            {/* Company Logo */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-cococo-berry" />
                {t('settings.companyLogo')}
              </h2>
              
              <div className="flex items-start gap-6">
                {companyInfo.logoURL && (
                  <div className="w-32 h-32 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img
                      src={companyInfo.logoURL}
                      alt="Company Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-cococo-berry text-white rounded-md hover:bg-cococo-moss transition-colors">
                    <Upload className="w-4 h-4" />
                    {t('settings.uploadLogo')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={saving}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('settings.logoRequirements')}
                  </p>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cococo-berry" />
                {t('settings.companyDetails')}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fields.companyName')} *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fields.legalName')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.legalName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, legalName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    {t('settings.fields.taxId')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.taxId}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('settings.fields.registrationNumber')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.registrationNumber}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, registrationNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cococo-berry" />
                {t('settings.address')}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fields.street')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.address.street}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      address: { ...companyInfo.address, street: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fields.zip')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.address.zip}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      address: { ...companyInfo.address, zip: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fields.city')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.address.city}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      address: { ...companyInfo.address, city: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fields.country')}
                  </label>
                  <input
                    type="text"
                    value={companyInfo.address.country}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      address: { ...companyInfo.address, country: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-cococo-berry" />
                {t('settings.contact')}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t('settings.fields.phone')}
                  </label>
                  <input
                    type="tel"
                    value={companyInfo.contact.phone}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      contact: { ...companyInfo.contact, phone: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t('settings.fields.email')}
                  </label>
                  <input
                    type="email"
                    value={companyInfo.contact.email}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      contact: { ...companyInfo.contact, email: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t('settings.fields.website')}
                  </label>
                  <input
                    type="url"
                    value={companyInfo.contact.website}
                    onChange={(e) => setCompanyInfo({
                      ...companyInfo,
                      contact: { ...companyInfo.contact, website: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveCompanyInfo}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-cococo-berry text-white rounded-md hover:bg-cococo-moss transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="space-y-6">
            {/* Add Department */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cococo-berry" />
                {t('add_department')}
              </h2>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder={t('department_name')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                />
                <button
                  onClick={addDepartment}
                  className="flex items-center gap-2 px-6 py-2 bg-cococo-berry text-white rounded-md hover:bg-cococo-moss transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {t('add')}
                </button>
              </div>
            </div>

            {/* Departments List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cococo-berry" />
                  {t('departments')} ({departments.length})
                </h2>
              </div>
              
              {departments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {t('no_departments')}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{dept.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('created')}: {dept.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteDepartment(dept.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
