import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserProfile, Role, DocumentCategory, EmploymentType, Department } from '../../types/user';
import type { PersonalDocument } from '../../types/document';
import { collection, getDocs, addDoc, updateDoc, setDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db, storage, auth } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { usePersonalDocuments } from '../../hooks/useDocuments';
import { calculateProbationEnd, isInProbation, getDaysUntil } from '../../utils/dateUtils';
import { APP_BASE_URL } from '../../utils/config';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  User,
  Mail,
  Briefcase,
  Shield,
  Building2,
  Hash,
  Check,
  Copy,
  Send,
  FileText,
  Upload,
  Download,
  Eye,
  Calendar,
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentCompany, userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedUserForDocs, setSelectedUserForDocs] = useState<UserProfile | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    file: null as File | null,
    title: '',
    category: 'contract' as DocumentCategory,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [invitedUserEmail, setInvitedUserEmail] = useState('');
  const [invitedUserName, setInvitedUserName] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    role: 'employee' as Role,
    departmentId: '',
    jobTitle: '',
  });
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    employeeId: '',
    role: 'employee' as Role,
    departmentId: '',
    jobTitle: '',
    reportsTo: '',
    requiresTimeTracking: false,
    requiresGoogleSSO: false,
    vacationEntitlement: 30,
    employmentType: 'full_time' as EmploymentType,
    weeklyHours: 40,
    startDate: '',
    probationMonths: 0,
  });
  const [editModalTab, setEditModalTab] = useState<'basic' | 'employment' | 'settings'>('basic');

  useEffect(() => {
    if (currentCompany) {
      loadData();
    }
  }, [currentCompany]);

  const loadData = async () => {
    if (!currentCompany) {
      console.log('No currentCompany available');
      return;
    }

    try {
      setLoading(true);

      // Load users for current company
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('companyId', '==', currentCompany.id));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData: UserProfile[] = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(usersData);

      // Load departments from company subcollection
      console.log('Loading departments for company:', currentCompany.id);
      const departmentsRef = collection(db, 'companies', currentCompany.id, 'departments');
      const departmentsSnapshot = await getDocs(departmentsRef);
      const deptData: Department[] = [];
      departmentsSnapshot.forEach((doc) => {
        deptData.push({ id: doc.id, ...doc.data() } as Department);
      });
      console.log('Loaded departments from subcollection:', deptData);
      console.log('Number of departments:', deptData.length);
      setDepartments(deptData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (
      !inviteForm.firstName.trim() ||
      !inviteForm.lastName.trim() ||
      !inviteForm.email.trim() ||
      !inviteForm.employeeId.trim()
    ) {
      toast.error(t('userManagement.errors.fillAllFields'));
      return;
    }

    try {
      // Check if email already exists
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', inviteForm.email.toLowerCase()));
      const existingUsers = await getDocs(emailQuery);

      if (!existingUsers.empty) {
        toast.error(t('userManagement.errors.emailExists'));
        return;
      }

      // Create invited user document with email as temporary ID
      const displayName = `${inviteForm.firstName} ${inviteForm.lastName}`;
      const newUserData = {
        email: inviteForm.email.toLowerCase(),
        displayName,
        companyId: currentCompany.id,
        role: inviteForm.role,
        status: 'invited',
        employeeId: inviteForm.employeeId,
        jobTitle: inviteForm.jobTitle || '',
        departmentId: inviteForm.departmentId || null,
        reportsTo: null,
        employmentType: 'full_time',
        startDate: new Date().toISOString().split('T')[0],
        requiresTimeTracking: false,
        requiresGoogleSSO: false, // Allow password login initially
        holidayRegion: 'de-by',
        vacationEntitlement: 30,
        assets: [],
        createdAt: Date.now(),
      };

      const docRef = await addDoc(usersRef, newUserData);

      // Generate invite link
      const link = `${APP_BASE_URL}/signup?invite=${docRef.id}`;
      setInviteLink(link);
      setInvitedUserEmail(inviteForm.email.toLowerCase());
      setInvitedUserName(displayName);

      toast.success(t('userManagement.userInvited'));
      setShowInviteModal(false);
      setShowInviteSuccessModal(true);
      setInviteForm({
        firstName: '',
        lastName: '',
        email: '',
        employeeId: '',
        role: 'employee',
        departmentId: '',
        jobTitle: '',
      });
      await loadData();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(t('common.error'));
    }
  };

  const handleEditUser = async (user: UserProfile) => {
    setSelectedUser(user);
    
    // Load sensitive data (startDate, probationMonths)
    let startDate = user.startDate || '';
    let probationMonths = 0;
    
    try {
      const sensitiveDocRef = doc(db, 'users', user.uid, 'sensitive', 'data');
      const sensitiveSnap = await getDoc(sensitiveDocRef);
      if (sensitiveSnap.exists()) {
        const sensitiveData = sensitiveSnap.data();
        startDate = sensitiveData.startDate || startDate;
        probationMonths = sensitiveData.probationMonths || 0;
      }
    } catch (error) {
      console.error('Error loading sensitive data:', error);
    }
    
    setEditForm({
      displayName: user.displayName,
      email: user.email,
      employeeId: user.employeeId || '',
      role: user.role,
      departmentId: user.departmentId || '',
      jobTitle: user.jobTitle || '',
      reportsTo: user.reportsTo || '',
      requiresTimeTracking: user.requiresTimeTracking || false,
      requiresGoogleSSO: user.requiresGoogleSSO || false,
      vacationEntitlement: user.vacationEntitlement || 30,
      employmentType: user.employmentType || 'full_time',
      weeklyHours: user.weeklyHours || 40,
      startDate,
      probationMonths,
    });
    setEditModalTab('basic');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    if (!editForm.displayName || !editForm.email) {
      toast.error(t('userManagement.fillRequired'));
      return;
    }

    try {
      // Check if email has changed
      const emailChanged = editForm.email.toLowerCase() !== selectedUser.email.toLowerCase();
      
      if (emailChanged) {
        // Check if new email is already in use
        const usersRef = collection(db, 'users');
        const emailQuery = query(usersRef, where('email', '==', editForm.email.toLowerCase()));
        const existingUsers = await getDocs(emailQuery);
        
        if (!existingUsers.empty) {
          toast.error(t('userManagement.errors.emailExists'));
          return;
        }

        // Try to check if email is already used in Firebase Auth
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, editForm.email.toLowerCase());
          if (signInMethods.length > 0) {
            toast.error(t('userManagement.errors.emailExistsInAuth'));
            return;
          }
        } catch (error: any) {
          // If error is not about email format, show warning
          if (error.code !== 'auth/invalid-email') {
            console.warn('Could not check Firebase Auth email:', error);
          }
        }
      }

      // Calculate probationEndDate if probationMonths is set
      const probationEndDate = editForm.probationMonths > 0 && editForm.startDate
        ? calculateProbationEnd(editForm.startDate, editForm.probationMonths)
        : null;

      // Update Firestore public document
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        displayName: editForm.displayName,
        email: editForm.email.toLowerCase(),
        employeeId: editForm.employeeId || null,
        role: editForm.role,
        departmentId: editForm.departmentId || null,
        jobTitle: editForm.jobTitle || null,
        reportsTo: editForm.reportsTo || null,
        requiresTimeTracking: editForm.requiresTimeTracking,
        requiresGoogleSSO: editForm.requiresGoogleSSO,
        employmentType: editForm.employmentType,
        probationEndDate,
      });

      // Update sensitive data (startDate, probationMonths, weeklyHours, vacationEntitlement)
      // Use setDoc with merge to create the document if it doesn't exist
      const sensitiveRef = doc(db, 'users', selectedUser.uid, 'sensitive', 'data');
      await setDoc(sensitiveRef, {
        startDate: editForm.startDate,
        probationMonths: editForm.probationMonths,
        weeklyHours: editForm.weeklyHours,
        vacationEntitlement: editForm.vacationEntitlement,
      }, { merge: true });

      // Note: Firebase Auth email cannot be updated by admin
      // User needs to update their own email through their account settings
      // Or they can use Google SSO with their company email
      
      if (emailChanged) {
        toast.success(t('userManagement.emailUpdatedInfo'), { duration: 5000 });
      } else {
        toast.success(t('userManagement.userUpdated'));
      }
      
      setShowEditModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('common.error'));
    }
  };

  const handleOpenDeleteModal = (user: UserProfile) => {
    setSelectedUser(user);
    setDeleteConfirmName('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    if (deleteConfirmName !== selectedUser.displayName) {
      toast.error(t('userManagement.nameDoesNotMatch'));
      return;
    }

    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        status: 'disabled',
      });
      toast.success(t('userManagement.userDisabled'));
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      console.error('Error disabling user:', error);
      toast.error(t('common.error'));
    }
  };

  const handleOpenDocumentsModal = (user: UserProfile) => {
    setSelectedUserForDocs(user);
    setShowDocumentsModal(true);
    setDocumentForm({ file: null, title: '', category: 'contract' });
  };

  const handleUploadDocument = async () => {
    if (!documentForm.file || !documentForm.title || !selectedUserForDocs || !userProfile) {
      toast.error(t('userManagement.documents.fillRequired'));
      return;
    }

    try {
      setUploadingDoc(true);
      
      // Upload file to Storage
      const timestamp = Date.now();
      const sanitizedFilename = documentForm.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `documents/personal/${selectedUserForDocs.uid}/${timestamp}_${sanitizedFilename}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, documentForm.file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Save metadata to Firestore
      const docRef = collection(db, 'users', selectedUserForDocs.uid, 'documents');
      await addDoc(docRef, {
        title: documentForm.title,
        category: documentForm.category,
        url: downloadUrl,
        createdAt: new Date().toISOString(),
        uploadedBy: userProfile.uid,
        uploadedByName: userProfile.displayName,
        size: documentForm.file.size,
        type: documentForm.file.type,
        fileName: documentForm.file.name,
      });

      toast.success(t('userManagement.documents.uploaded'));
      setDocumentForm({ file: null, title: '', category: 'contract' });
      
      // Reset file input
      const fileInput = document.getElementById('doc-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(t('userManagement.documents.uploadError'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success(t('userManagement.linkCopied'));
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      invited: 'bg-yellow-100 text-yellow-700',
      disabled: 'bg-red-100 text-red-700',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role: Role) => {
    const labels = {
      global_admin: t('roles.global_admin'),
      company_admin: t('roles.company_admin'),
      hr_manager: t('roles.hr_manager'),
      supervisor: t('roles.supervisor'),
      employee: t('roles.employee'),
    };
    return labels[role];
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return t('userManagement.noDepartment');
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || t('userManagement.unknownDepartment');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{t('userManagement.title')}</h1>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          {t('userManagement.inviteUser')}
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.table.user')}
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.table.email')}
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.table.department')}
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.form.reportsTo')}
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.form.employmentType')}
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Std/W
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Urlaub
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.table.role')}
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Probezeit
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {t('userManagement.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const manager = users.find(u => u.uid === user.reportsTo);
              return (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 h-6 w-6">
                        {user.photoURL ? (
                          <img
                            className="h-6 w-6 rounded-full object-cover"
                            src={user.photoURL}
                            alt={user.displayName}
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                          {user.displayName}
                        </div>
                        {user.jobTitle && (
                          <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{user.jobTitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">
                      {user.employeeId || '-'}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="text-xs text-gray-900 max-w-[140px] truncate" title={user.email}>{user.email}</div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900 max-w-[100px] truncate" title={getDepartmentName(user.departmentId)}>
                      {getDepartmentName(user.departmentId)}
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900 max-w-[100px] truncate" title={manager?.displayName}>
                      {manager?.displayName || '-'}
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded">
                      {user.employmentType === 'full_time' ? 'VZ' : user.employmentType === 'part_time' ? 'TZ' : user.employmentType?.substring(0, 2).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">
                      {user.weeklyHours || 40}h
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">
                      {user.vacationEntitlement || 30}d
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-900">{getRoleLabel(user.role)}</div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${getStatusBadge(
                        user.status
                      )}`}
                    >
                      {t(`userManagement.status.${user.status}`)}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {user.probationEndDate && isInProbation(user.probationEndDate) ? (
                      <span className="px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-orange-100 text-orange-800">
                        {getDaysUntil(user.probationEndDate)}d
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenDocumentsModal(user)}
                        className="text-purple-600 hover:text-purple-900"
                        title={t('userManagement.documents.title')}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {user.uid !== userProfile?.uid && (
                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          className="text-red-600 hover:text-red-900"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {/* Edit Modal with Tabs */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('userManagement.editUser')}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setEditModalTab('basic')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    editModalTab === 'basic'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  {t('userManagement.tabs.basic')}
                </button>
                <button
                  onClick={() => setEditModalTab('employment')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    editModalTab === 'employment'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Briefcase className="w-4 h-4 inline mr-2" />
                  {t('userManagement.tabs.employment')}
                </button>
                <button
                  onClick={() => setEditModalTab('settings')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    editModalTab === 'settings'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  {t('userManagement.tabs.settings')}
                </button>
              </div>

              {/* Basic Info Tab */}
              {editModalTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.displayName')} *
                    </label>
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.email')} *
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Hash className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.employeeId')}
                    </label>
                    <input
                      type="text"
                      value={editForm.employeeId}
                      onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.jobTitle')}
                    </label>
                    <input
                      type="text"
                      value={editForm.jobTitle}
                      onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.department')}
                    </label>
                    <select
                      value={editForm.departmentId}
                      onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('userManagement.noDepartment')}</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Shield className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.role')} *
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">{t('roles.employee')}</option>
                      <option value="supervisor">{t('roles.supervisor')}</option>
                      <option value="hr_manager">{t('roles.hr_manager')}</option>
                      <option value="company_admin">{t('roles.company_admin')}</option>
                      <option value="global_admin">{t('roles.global_admin')}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Employment Tab */}
              {editModalTab === 'employment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.startDate')}
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.probationMonths')}
                    </label>
                    <select
                      value={editForm.probationMonths}
                      onChange={(e) => setEditForm({ ...editForm, probationMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="0">{t('userManagement.form.noProbation')}</option>
                      <option value="1">1 {t('userManagement.form.month')}</option>
                      <option value="2">2 {t('userManagement.form.months')}</option>
                      <option value="3">3 {t('userManagement.form.months')}</option>
                      <option value="4">4 {t('userManagement.form.months')}</option>
                      <option value="5">5 {t('userManagement.form.months')}</option>
                      <option value="6">6 {t('userManagement.form.months')}</option>
                    </select>
                    {editForm.probationMonths > 0 && editForm.startDate && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t('userManagement.form.probationEnds')}: {calculateProbationEnd(editForm.startDate, editForm.probationMonths)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.reportsTo')}
                    </label>
                    <select
                      value={editForm.reportsTo}
                      onChange={(e) => setEditForm({ ...editForm, reportsTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('userManagement.form.noManager')}</option>
                      {users
                        .filter(u => u.uid !== selectedUser?.uid && u.status === 'active')
                        .map((user) => (
                          <option key={user.uid} value={user.uid}>
                            {user.displayName} {user.jobTitle ? `(${user.jobTitle})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.employmentType')}
                    </label>
                    <select
                      value={editForm.employmentType}
                      onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value as EmploymentType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full_time">{t('employeesPage.employmentTypes.full_time')}</option>
                      <option value="part_time">{t('employeesPage.employmentTypes.part_time')}</option>
                      <option value="contractor">{t('employeesPage.employmentTypes.contractor')}</option>
                      <option value="intern">{t('employeesPage.employmentTypes.intern')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Hash className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.weeklyHours')}
                    </label>
                    <input
                      type="number"
                      value={editForm.weeklyHours}
                      onChange={(e) => setEditForm({ ...editForm, weeklyHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {t('userManagement.form.vacationDays')}
                    </label>
                    <input
                      type="number"
                      value={editForm.vacationEntitlement}
                      onChange={(e) => setEditForm({ ...editForm, vacationEntitlement: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="50"
                    />
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {editModalTab === 'settings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {t('userManagement.form.requiresTimeTracking')}
                      </label>
                      <p className="text-xs text-gray-500">
                        {t('userManagement.form.timeTrackingHint')}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.requiresTimeTracking}
                        onChange={(e) => setEditForm({ ...editForm, requiresTimeTracking: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {t('userManagement.form.requiresGoogleSSO')}
                      </label>
                      <p className="text-xs text-gray-500">
                        {t('userManagement.form.googleSSOHint')}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.requiresGoogleSSO}
                        onChange={(e) => setEditForm({ ...editForm, requiresGoogleSSO: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('userManagement.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('userManagement.deleteUser')}
                </h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  {t('userManagement.deleteConfirmMessage', {
                    name: selectedUser.displayName,
                  })}
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    {t('userManagement.deleteWarning')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('userManagement.confirmNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={selectedUser.displayName}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('userManagement.typeName', { name: selectedUser.displayName })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmName !== selectedUser.displayName}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('userManagement.confirmDisable')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Success Modal */}
      {showInviteSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('userManagement.inviteSuccess')}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t('userManagement.inviteSuccessDescription', { name: invitedUserName })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Invite Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('userManagement.inviteLink')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                      title={t('userManagement.copyLink')}
                    >
                      {linkCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Email Button */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    {t('userManagement.sendInviteEmailDescription')}
                  </p>
                  <a
                    href={`mailto:${invitedUserEmail}?subject=${encodeURIComponent(
                      t('userManagement.emailSubject')
                    )}&body=${encodeURIComponent(
                      t('userManagement.emailBody', {
                        name: invitedUserName,
                        link: inviteLink,
                      })
                    )}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                    {t('userManagement.openEmailProgram')}
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowInviteSuccessModal(false);
                    loadData();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Success Modal */}
      {showInviteSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('userManagement.inviteSuccess')}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t('userManagement.inviteSuccessDescription', { name: invitedUserName })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Invite Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('userManagement.inviteLink')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                      title={t('userManagement.copyLink')}
                    >
                      {linkCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Email Button */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    {t('userManagement.sendInviteEmailDescription')}
                  </p>
                  <a
                    href={`mailto:${invitedUserEmail}?subject=${encodeURIComponent(
                      t('userManagement.emailSubject')
                    )}&body=${encodeURIComponent(
                      t('userManagement.emailBody', {
                        name: invitedUserName,
                        link: inviteLink,
                      })
                    )}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                    {t('userManagement.openEmailProgram')}
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowInviteSuccessModal(false);
                    loadData();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{t('userManagement.inviteUser')}</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('userManagement.form.firstName')} *
                    </label>
                    <input
                      type="text"
                      value={inviteForm.firstName}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('userManagement.form.lastName')} *
                    </label>
                    <input
                      type="text"
                      value={inviteForm.lastName}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mustermann"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    {t('userManagement.form.email')} *
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="max.mustermann@firma.de"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    {t('userManagement.form.employeeId')} *
                  </label>
                  <input
                    type="text"
                    value={inviteForm.employeeId}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, employeeId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="EMP-001"
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    {t('userManagement.form.jobTitle')}
                  </label>
                  <input
                    type="text"
                    value={inviteForm.jobTitle}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, jobTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Software Developer"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 inline mr-1" />
                    {t('userManagement.form.role')} *
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, role: e.target.value as Role })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="employee">{t('roles.employee')}</option>
                    <option value="supervisor">{t('roles.supervisor')}</option>
                    <option value="hr_manager">{t('roles.hr_manager')}</option>
                    <option value="company_admin">{t('roles.company_admin')}</option>
                    <option value="global_admin">{t('roles.global_admin')}</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    {t('userManagement.form.department')}
                  </label>
                  <select
                    value={inviteForm.departmentId}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, departmentId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('userManagement.noDepartment')}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleInviteUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('userManagement.sendInvite')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && selectedUserForDocs && (
        <DocumentsModal
          user={selectedUserForDocs}
          onClose={() => {
            setShowDocumentsModal(false);
            setSelectedUserForDocs(null);
          }}
          documentForm={documentForm}
          setDocumentForm={setDocumentForm}
          uploadingDoc={uploadingDoc}
          handleUploadDocument={handleUploadDocument}
        />
      )}
    </div>
  );
};

// Documents Modal Component
function DocumentsModal({
  user,
  onClose,
  documentForm,
  setDocumentForm,
  uploadingDoc,
  handleUploadDocument,
}: {
  user: UserProfile;
  onClose: () => void;
  documentForm: { file: File | null; title: string; category: DocumentCategory };
  setDocumentForm: React.Dispatch<React.SetStateAction<{ file: File | null; title: string; category: DocumentCategory }>>;
  uploadingDoc: boolean;
  handleUploadDocument: () => void;
}) {
  const { t } = useTranslation();
  const { documents, loading } = usePersonalDocuments(user.uid);

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      contract: t('userManagement.documents.categories.contract'),
      certificate: t('userManagement.documents.categories.certificate'),
      id_document: t('userManagement.documents.categories.id_document'),
      other: t('userManagement.documents.categories.other'),
    };
    return labels[category] || category;
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              {t('userManagement.documents.title')}
            </h2>
            <p className="text-sm text-gray-600">{user.displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Upload Form */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-lg space-y-4 border border-purple-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Upload size={18} className="text-purple-600" />
              {t('userManagement.documents.upload')}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('userManagement.documents.form.file')} *
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="doc-file-upload"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })}
                  className="hidden"
                />
                <label
                  htmlFor="doc-file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-white/50 transition-colors text-sm text-gray-700"
                >
                  <Upload size={16} className="text-purple-600" />
                  <span>{documentForm.file ? documentForm.file.name : t('userManagement.documents.form.selectFile')}</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('userManagement.documents.form.fileHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('userManagement.documents.form.title')} *
              </label>
              <input
                type="text"
                value={documentForm.title}
                onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                placeholder={t('userManagement.documents.form.titlePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('userManagement.documents.form.category')} *
              </label>
              <select
                value={documentForm.category}
                onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value as DocumentCategory })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="contract">{t('userManagement.documents.categories.contract')}</option>
                <option value="certificate">{t('userManagement.documents.categories.certificate')}</option>
                <option value="id_document">{t('userManagement.documents.categories.id_document')}</option>
                <option value="other">{t('userManagement.documents.categories.other')}</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleUploadDocument}
                disabled={uploadingDoc || !documentForm.file || !documentForm.title}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 font-medium shadow-md"
              >
                {uploadingDoc ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('userManagement.documents.uploading')}</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>{t('userManagement.documents.upload')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Document List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-purple-600" />
              {t('userManagement.documents.existingDocuments')}
            </h3>
            
            {loading ? (
              <div className="text-center py-4 text-gray-600">{t('loading')}</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">{t('userManagement.documents.noDocuments')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: PersonalDocument) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{doc.type ? getFileIcon(doc.type) : '📎'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {getCategoryLabel(doc.category)}
                          </span>
                          <span>{new Date(doc.createdAt).toLocaleDateString('de-DE')}</span>
                          {doc.size && <span>{(doc.size / 1024).toFixed(0)} KB</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:bg-purple-50 rounded transition-colors"
                        title={t('common.view')}
                      >
                        <Eye size={18} />
                      </a>
                      <a
                        href={doc.url}
                        download
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title={t('common.download')}
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
