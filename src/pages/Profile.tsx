import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePersonalDocuments } from '../hooks/useDocuments';
import type { PersonalDocument } from '../types/document';
import { useUserAssets } from '../hooks/useAssets';
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload';
import { COUNTRY_CONFIG, GERMAN_STATES, STATE_TO_HOLIDAY_REGION, type CountryCode } from '../lib/countryConfig';
import { isInProbation, getDaysUntil, formatDate } from '../utils/dateUtils';
import type { Department } from '../types/user';
import type { AssetType } from '../types/asset';
import Skeleton, { SkeletonInput } from '../components/ui/Skeleton';
import {
  User,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Eye,
  Download,
  MapPin,
  CreditCard,
  Receipt,
  Phone,
  Save,
  AlertCircle,
  Monitor,
  Smartphone,
  Tv,
  Cable,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type TabId = 'overview' | 'personal' | 'bank-tax' | 'employment' | 'equipment';

export default function Profile() {
  const { t } = useTranslation();
  const { userProfile, currentCompany } = useAuth();
  const { documents, loading: documentsLoading } = usePersonalDocuments(userProfile?.uid || '');
  const { userAssets, loading: assetsLoading } = useUserAssets(userProfile?.uid || '');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [supervisor, setSupervisor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Form states for editable data
  const [address, setAddress] = useState<{
    street: string;
    city: string;
    zip: string;
    region?: string;
    country: CountryCode;
  }>({
    street: '',
    city: '',
    zip: '',
    region: '',
    country: 'DE',
  });
  const [bankDetails, setBankDetails] = useState({
    iban: '',
    bic: '',
    bankName: '',
    sortCode: '',
    accountNumber: '',
  });
  const [taxDetails, setTaxDetails] = useState({
    taxId: '',
    taxClass: '',
    socialSecurityNumber: '',
    healthInsuranceProvider: '',
    nationalInsuranceNumber: '',
    taxCode: '',
  });
  const [personalDetails, setPersonalDetails] = useState({
    birthDate: '',
    phoneNumber: '',
    privateEmail: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isMigrated, setIsMigrated] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentCompany.id, userProfile?.reportsTo]);

  useEffect(() => {
    // Load sensitive data from subcollection (post-migration) or main document (pre-migration)
    const loadSensitiveData = async () => {
      if (!userProfile) return;

      try {
        // Try to load from sensitive subcollection first
        const sensitiveRef = doc(db, 'users', userProfile.uid, 'sensitive', 'data');
        const sensitiveDoc = await getDoc(sensitiveRef);

        if (sensitiveDoc.exists()) {
          // Data has been migrated to subcollection
          setIsMigrated(true);
          const sensitiveData = sensitiveDoc.data();

          if (sensitiveData.address) {
            setAddress({
              street: sensitiveData.address.street || '',
              city: sensitiveData.address.city || '',
              zip: sensitiveData.address.zip || '',
              region: sensitiveData.address.region || '',
              country: (sensitiveData.address.country as CountryCode) || 'DE',
            });
          }
          if (sensitiveData.bankDetails) {
            setBankDetails({
              iban: sensitiveData.bankDetails.iban || '',
              bic: sensitiveData.bankDetails.bic || '',
              bankName: sensitiveData.bankDetails.bankName || '',
              sortCode: sensitiveData.bankDetails.sortCode || '',
              accountNumber: sensitiveData.bankDetails.accountNumber || '',
            });
          }
          if (sensitiveData.taxDetails) {
            setTaxDetails({
              taxId: sensitiveData.taxDetails.taxId || '',
              taxClass: sensitiveData.taxDetails.taxClass || '',
              socialSecurityNumber: sensitiveData.taxDetails.socialSecurityNumber || '',
              healthInsuranceProvider: sensitiveData.taxDetails.healthInsuranceProvider || '',
              nationalInsuranceNumber: sensitiveData.taxDetails.nationalInsuranceNumber || '',
              taxCode: sensitiveData.taxDetails.taxCode || '',
            });
          }
          if (sensitiveData.personalDetails) {
            setPersonalDetails({
              birthDate: sensitiveData.personalDetails.birthDate || '',
              phoneNumber: sensitiveData.personalDetails.phoneNumber || '',
              privateEmail: sensitiveData.personalDetails.privateEmail || '',
              emergencyContact: sensitiveData.personalDetails.emergencyContact || {
                name: '',
                phone: '',
                relationship: '',
              },
            });
          }
        } else {
          // Fallback: Load from main document (pre-migration)
          setIsMigrated(false);
          if (userProfile.address) {
            setAddress({
              street: userProfile.address.street || '',
              city: userProfile.address.city || '',
              zip: userProfile.address.zip || '',
              region: userProfile.address.region || '',
              country: (userProfile.address.country as CountryCode) || 'DE',
            });
          }
          if (userProfile.bankDetails) {
            setBankDetails({
              iban: userProfile.bankDetails.iban || '',
              bic: userProfile.bankDetails.bic || '',
              bankName: userProfile.bankDetails.bankName || '',
              sortCode: userProfile.bankDetails.sortCode || '',
              accountNumber: userProfile.bankDetails.accountNumber || '',
            });
          }
          if (userProfile.taxDetails) {
            setTaxDetails({
              taxId: userProfile.taxDetails.taxId || '',
              taxClass: userProfile.taxDetails.taxClass || '',
              socialSecurityNumber: userProfile.taxDetails.socialSecurityNumber || '',
              healthInsuranceProvider: userProfile.taxDetails.healthInsuranceProvider || '',
              nationalInsuranceNumber: userProfile.taxDetails.nationalInsuranceNumber || '',
              taxCode: userProfile.taxDetails.taxCode || '',
            });
          }
          if (userProfile.personalDetails) {
            setPersonalDetails({
              birthDate: userProfile.personalDetails.birthDate || '',
              phoneNumber: userProfile.personalDetails.phoneNumber || '',
              privateEmail: userProfile.personalDetails.privateEmail || '',
              emergencyContact: userProfile.personalDetails.emergencyContact || {
                name: '',
                phone: '',
                relationship: '',
              },
            });
          }
        }
      } catch (error) {
        console.error('Error loading sensitive data:', error);
        // Fallback to userProfile data
        setIsMigrated(false);
      }
    };

    loadSensitiveData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // Load departments from subcollection
      const departmentsRef = collection(db, 'companies', currentCompany.id, 'departments');
      const departmentsSnapshot = await getDocs(departmentsRef);
      const deptData: Department[] = [];
      departmentsSnapshot.forEach((doc) => {
        deptData.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(deptData);

      // Load supervisor name if exists
      if (userProfile.reportsTo) {
        const supervisorDocRef = doc(db, 'users', userProfile.reportsTo);
        const supervisorDoc = await getDoc(supervisorDocRef);
        if (supervisorDoc.exists()) {
          setSupervisor(supervisorDoc.data().displayName);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      // Update holidayRegion if user is in Germany and has selected a state
      let updatedHolidayRegion = userProfile.holidayRegion;
      if (address.country === 'DE' && address.region) {
        updatedHolidayRegion = STATE_TO_HOLIDAY_REGION[address.region] || userProfile.holidayRegion;
      }

      if (isMigrated) {
        // Save to sensitive subcollection
        const sensitiveRef = doc(db, 'users', userProfile.uid, 'sensitive', 'data');
        await updateDoc(sensitiveRef, {
          address,
        });
        
        // Update holidayRegion in main document if changed
        if (updatedHolidayRegion !== userProfile.holidayRegion) {
          const userRef = doc(db, 'users', userProfile.uid);
          await updateDoc(userRef, {
            holidayRegion: updatedHolidayRegion,
          });
        }
      } else {
        // Save to main document (pre-migration)
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          address,
          holidayRegion: updatedHolidayRegion,
        });
      }
      toast.success(t('profile.saveSuccess'));
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePersonalDetails = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      if (isMigrated) {
        // Save to sensitive subcollection
        const sensitiveRef = doc(db, 'users', userProfile.uid, 'sensitive', 'data');
        await updateDoc(sensitiveRef, {
          personalDetails,
        });
      } else {
        // Save to main document (pre-migration)
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          personalDetails,
        });
      }
      toast.success(t('profile.saveSuccess'));
    } catch (error) {
      console.error('Error saving personal details:', error);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      if (isMigrated) {
        // Save to sensitive subcollection
        const sensitiveRef = doc(db, 'users', userProfile.uid, 'sensitive', 'data');
        await updateDoc(sensitiveRef, {
          bankDetails,
        });
      } else {
        // Save to main document (pre-migration)
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          bankDetails,
        });
      }
      toast.success(t('profile.saveSuccess'));
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTaxDetails = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      if (isMigrated) {
        // Save to sensitive subcollection
        const sensitiveRef = doc(db, 'users', userProfile.uid, 'sensitive', 'data');
        await updateDoc(sensitiveRef, {
          taxDetails,
        });
      } else {
        // Save to main document (pre-migration)
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          taxDetails,
        });
      }
      toast.success(t('profile.saveSuccess'));
    } catch (error) {
      console.error('Error saving tax details:', error);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return t('profile.noDepartment');
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : t('profile.unknownDepartment');
  };

  const getEmploymentTypeLabel = (type: string) => {
    return t(`profile.employmentTypes.${type}`);
  };

  if (!userProfile || loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture Skeleton */}
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="h-8 w-32" />
            </div>
            
            {/* Name & Role Skeleton */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <Skeleton className="h-9 w-64 mx-auto md:mx-0" />
              <Skeleton className="h-6 w-48 mx-auto md:mx-0" />
              <Skeleton className="h-5 w-56 mx-auto md:mx-0" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-32" />
              ))}
            </div>
          </div>

          {/* Content Skeleton - Form Fields */}
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            
            {/* Address Section Skeleton */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <SkeletonInput />
                </div>
                <div className="md:col-span-2">
                  <SkeletonInput />
                </div>
                <SkeletonInput />
                <SkeletonInput />
                <div className="md:col-span-2">
                  <SkeletonInput />
                </div>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Personal Details Skeleton */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonInput />
                <SkeletonInput />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabId, label: t('profile.tabs.overview'), icon: User },
    { id: 'personal' as TabId, label: t('profile.tabs.personal'), icon: MapPin },
    { id: 'bank-tax' as TabId, label: t('profile.tabs.bankTax'), icon: CreditCard },
    { id: 'employment' as TabId, label: t('profile.tabs.employment'), icon: Briefcase },
    { id: 'equipment' as TabId, label: t('profile.tabs.equipment'), icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Profile Picture */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <ProfilePictureUpload
            currentPhotoURL={userProfile.photoURL}
            displayName={userProfile.displayName}
            userId={userProfile.uid}
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {userProfile.displayName}
            </h1>
            <p className="text-lg text-gray-600 mb-4">{userProfile.email}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 bg-[#FF79C9]/10 text-[#FF1493] rounded-full text-sm font-medium">
                {t(`roles.${userProfile.role}`)}
              </span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                {getEmploymentTypeLabel(userProfile.employmentType)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-[#FF1493] border-b-2 border-[#FF1493] bg-[#FF79C9]/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('profile.tabs.overview')}
              </h2>

              {/* Documents Widget */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.myDocuments')}
                  </h3>
                </div>

                {documentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-4 border-[#FF79C9] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {t('profile.noDocuments')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc: PersonalDocument) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-[#FF79C9]/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {doc.title}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>{doc.category}</span>
                            <span>•</span>
                            <span>
                              {new Date(doc.createdAt).toLocaleDateString(
                                t('common.locale'),
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:text-[#FF1493] transition-colors"
                            title={t('documents.view')}
                          >
                            <Eye className="w-5 h-5" />
                          </a>
                          <a
                            href={doc.url}
                            download
                            className="p-2 text-gray-600 hover:text-[#FF1493] transition-colors"
                            title={t('documents.download')}
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      {t('profile.department')}
                    </h3>
                  </div>
                  <p className="text-gray-700">
                    {getDepartmentName(userProfile.departmentId)}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">
                      {t('profile.startDate')}
                    </h3>
                  </div>
                  <p className="text-gray-700">
                    {new Date(userProfile.startDate).toLocaleDateString(
                      t('common.locale'),
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Data Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('profile.tabs.personal')}
              </h2>

              {/* Address Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.sections.address')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Country Selector */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.country')}
                    </label>
                    <select
                      value={address.country}
                      onChange={(e) =>
                        setAddress({ ...address, country: e.target.value as CountryCode })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    >
                      <option value="DE">🇩🇪 {t('profile.countries.germany')}</option>
                      <option value="UK">🇬🇧 {t('profile.countries.unitedKingdom')}</option>
                    </select>
                  </div>

                  {/* Street */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.street')}
                    </label>
                    <input
                      type="text"
                      value={address.street}
                      onChange={(e) =>
                        setAddress({ ...address, street: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>

                  {/* ZIP/Postcode - Dynamic Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {address.country === 'DE' ? t('profile.fields.zip') : t('profile.fields.postcode')}
                    </label>
                    <input
                      type="text"
                      value={address.zip}
                      onChange={(e) =>
                        setAddress({ ...address, zip: e.target.value })
                      }
                      placeholder={COUNTRY_CONFIG[address.country || 'DE']?.address?.zipPlaceholder || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.city')}
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>

                  {/* Region/State - Dynamic (Dropdown for DE, Input for UK) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {address.country === 'DE' ? t('profile.fields.state') : t('profile.fields.county')}
                    </label>
                    {address.country === 'DE' ? (
                      <select
                        value={address.region || ''}
                        onChange={(e) =>
                          setAddress({ ...address, region: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                      >
                        <option value="">{t('profile.placeholders.selectState')}</option>
                        {GERMAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={address.region || ''}
                        onChange={(e) =>
                          setAddress({ ...address, region: e.target.value })
                        }
                        placeholder={t('profile.placeholders.countyExample')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                      />
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveAddress}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF1493] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>

              {/* Personal Details Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.sections.personalDetails')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.birthDate')}
                    </label>
                    <input
                      type="date"
                      value={personalDetails.birthDate}
                      onChange={(e) =>
                        setPersonalDetails({
                          ...personalDetails,
                          birthDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.phoneNumber')}
                    </label>
                    <input
                      type="tel"
                      value={personalDetails.phoneNumber}
                      onChange={(e) =>
                        setPersonalDetails({
                          ...personalDetails,
                          phoneNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.privateEmail')}
                    </label>
                    <input
                      type="email"
                      value={personalDetails.privateEmail}
                      onChange={(e) =>
                        setPersonalDetails({
                          ...personalDetails,
                          privateEmail: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePersonalDetails}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF1493] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>

              {/* Emergency Contact Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.sections.emergencyContact')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.emergencyName')}
                    </label>
                    <input
                      type="text"
                      value={personalDetails.emergencyContact.name}
                      onChange={(e) =>
                        setPersonalDetails({
                          ...personalDetails,
                          emergencyContact: {
                            ...personalDetails.emergencyContact,
                            name: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.emergencyPhone')}
                    </label>
                    <input
                      type="tel"
                      value={personalDetails.emergencyContact.phone}
                      onChange={(e) =>
                        setPersonalDetails({
                          ...personalDetails,
                          emergencyContact: {
                            ...personalDetails.emergencyContact,
                            phone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.fields.emergencyRelationship')}
                    </label>
                    <input
                      type="text"
                      value={personalDetails.emergencyContact.relationship}
                      onChange={(e) =>
                        setPersonalDetails({
                          ...personalDetails,
                          emergencyContact: {
                            ...personalDetails.emergencyContact,
                            relationship: e.target.value,
                          },
                        })
                      }
                      placeholder={t('profile.placeholders.relationship')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePersonalDetails}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF1493] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          )}

          {/* Bank & Tax Tab */}
          {activeTab === 'bank-tax' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('profile.tabs.bankTax')}
              </h2>

              {/* Bank Details Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.sections.bankDetails')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Show IBAN/BIC for DE, Sort Code/Account Number for UK */}
                  {(address.country || 'DE') === 'DE' ? (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.iban')}
                        </label>
                        <input
                          type="text"
                          value={bankDetails.iban}
                          onChange={(e) =>
                            setBankDetails({ ...bankDetails, iban: e.target.value })
                          }
                          placeholder="DE89 3704 0044 0532 0130 00"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.bic')}
                        </label>
                        <input
                          type="text"
                          value={bankDetails.bic}
                          onChange={(e) =>
                            setBankDetails({ ...bankDetails, bic: e.target.value })
                          }
                          placeholder="COBADEFFXXX"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.bankName')}
                        </label>
                        <input
                          type="text"
                          value={bankDetails.bankName}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              bankName: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.sortCode')}
                        </label>
                        <input
                          type="text"
                          value={bankDetails.sortCode}
                          onChange={(e) =>
                            setBankDetails({ ...bankDetails, sortCode: e.target.value })
                          }
                          placeholder="12-34-56"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.accountNumber')}
                        </label>
                        <input
                          type="text"
                          value={bankDetails.accountNumber}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              accountNumber: e.target.value,
                            })
                          }
                          placeholder="12345678"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.bankName')}
                        </label>
                        <input
                          type="text"
                          value={bankDetails.bankName}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              bankName: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleSaveBankDetails}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF1493] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>

              {/* Tax Details Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.sections.taxDetails')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Show different fields based on country */}
                  {(address.country || 'DE') === 'DE' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.taxId')}
                        </label>
                        <input
                          type="text"
                          value={taxDetails.taxId}
                          onChange={(e) =>
                            setTaxDetails({ ...taxDetails, taxId: e.target.value })
                          }
                          placeholder="12 345 678 901"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.taxClass')}
                        </label>
                        <select
                          value={taxDetails.taxClass}
                          onChange={(e) =>
                            setTaxDetails({
                              ...taxDetails,
                              taxClass: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        >
                          <option value="">{t('profile.placeholders.selectTaxClass')}</option>
                          <option value="1">I</option>
                          <option value="2">II</option>
                          <option value="3">III</option>
                          <option value="4">IV</option>
                          <option value="5">V</option>
                          <option value="6">VI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.socialSecurityNumber')}
                        </label>
                        <input
                          type="text"
                          value={taxDetails.socialSecurityNumber}
                          onChange={(e) =>
                            setTaxDetails({
                              ...taxDetails,
                              socialSecurityNumber: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.healthInsuranceProvider')}
                        </label>
                        <input
                          type="text"
                          value={taxDetails.healthInsuranceProvider}
                          onChange={(e) =>
                            setTaxDetails({
                              ...taxDetails,
                              healthInsuranceProvider: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.nationalInsuranceNumber')}
                        </label>
                        <input
                          type="text"
                          value={taxDetails.nationalInsuranceNumber}
                          onChange={(e) =>
                            setTaxDetails({
                              ...taxDetails,
                              nationalInsuranceNumber: e.target.value,
                            })
                          }
                          placeholder="AB 12 34 56 C"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fields.taxCode')}
                        </label>
                        <input
                          type="text"
                          value={taxDetails.taxCode}
                          onChange={(e) =>
                            setTaxDetails({
                              ...taxDetails,
                              taxCode: e.target.value,
                            })
                          }
                          placeholder="1250L"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF79C9] focus:border-[#FF79C9]"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleSaveTaxDetails}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF1493] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          )}

          {/* Employment Tab (Read-Only) */}
          {activeTab === 'employment' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('profile.tabs.employment')}
              </h2>

              <div className="bg-gray-100 rounded-lg p-6 border-2 border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-6">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">
                    {t('profile.readOnlyNotice')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('profile.fields.department')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {getDepartmentName(userProfile.departmentId)}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('profile.fields.supervisor')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {supervisor || t('profile.noSupervisor')}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('profile.fields.employmentType')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {getEmploymentTypeLabel(userProfile.employmentType)}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('profile.fields.startDate')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {new Date(userProfile.startDate).toLocaleDateString(
                        t('common.locale'),
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('profile.fields.vacationEntitlement')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {userProfile.vacationEntitlement} {t('profile.days')}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('profile.fields.holidayRegion')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {userProfile.holidayRegion.toUpperCase()}
                    </p>
                  </div>

                  {userProfile.probationEndDate && (
                    <div className="bg-white rounded-lg p-4 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        {t('profile.fields.probationEndDate')}
                      </label>
                      <div className="flex items-center gap-3">
                        <p className="text-gray-900 font-medium">
                          {formatDate(userProfile.probationEndDate, t('common.locale'))}
                        </p>
                        {isInProbation(userProfile.probationEndDate) && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            {t('profile.inProbation')} ({getDaysUntil(userProfile.probationEndDate)} {t('profile.daysRemaining')})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('profile.tabs.equipment')}
              </h2>

              {assetsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[#FF79C9] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userAssets.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {t('profile.equipment.noEquipment')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userAssets.map((asset) => {
                    const getAssetIcon = (type: AssetType) => {
                      switch (type) {
                        case 'laptop':
                          return <Monitor className="w-8 h-8 text-[#FF1493]" />;
                        case 'smartphone':
                          return <Smartphone className="w-8 h-8 text-[#FF1493]" />;
                        case 'monitor':
                          return <Tv className="w-8 h-8 text-[#FF1493]" />;
                        case 'peripheral':
                          return <Cable className="w-8 h-8 text-[#FF1493]" />;
                        default:
                          return <Package className="w-8 h-8 text-[#FF1493]" />;
                      }
                    };

                    const isWarrantyActive = asset.warrantyEndDate 
                      ? new Date(asset.warrantyEndDate) > new Date()
                      : false;

                    return (
                      <div
                        key={asset.id}
                        className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-[#FF79C9]/10 rounded-lg flex-shrink-0">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {asset.model}
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">
                              {t(`assets.types.${asset.type}`)}
                            </p>

                            <div className="space-y-2">
                              {asset.identifier && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">
                                    {t('profile.equipment.assetId')}:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {asset.identifier}
                                  </span>
                                </div>
                              )}

                              {asset.serialNumber && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">
                                    {t('profile.equipment.serialNumber')}:
                                  </span>
                                  <span className="font-mono text-gray-900 text-xs">
                                    {asset.serialNumber}
                                  </span>
                                </div>
                              )}

                              {asset.assignedDate && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-500">
                                    {t('profile.equipment.assignedOn')}:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {new Date(asset.assignedDate).toLocaleDateString(
                                      t('common.locale'),
                                      {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      }
                                    )}
                                  </span>
                                </div>
                              )}

                              {asset.warrantyType !== 'none' && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                                  <ShieldCheck
                                    className={`w-4 h-4 ${
                                      isWarrantyActive ? 'text-green-500' : 'text-red-500'
                                    }`}
                                  />
                                  <span
                                    className={`text-sm font-medium ${
                                      isWarrantyActive ? 'text-green-700' : 'text-red-700'
                                    }`}
                                  >
                                    {asset.warrantyType === 'extended'
                                      ? t('assets.warranty.extended')
                                      : t('assets.warranty.standard')}
                                  </span>
                                  {asset.warrantyEndDate && (
                                    <span className="text-xs text-gray-500">
                                      {isWarrantyActive
                                        ? t('profile.equipment.validUntil', {
                                            date: new Date(
                                              asset.warrantyEndDate
                                            ).toLocaleDateString(t('common.locale'), {
                                              year: 'numeric',
                                              month: 'short',
                                            }),
                                          })
                                        : t('assets.warranty.expired')}
                                    </span>
                                  )}
                                </div>
                              )}

                              {asset.warrantyInfo && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-600 italic">
                                    {asset.warrantyInfo}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
