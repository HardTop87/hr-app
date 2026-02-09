import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import type { TaskRole } from '../types/onboarding';
import type { UserProfile } from '../types/user';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Users,
  ClipboardList,
  X,
  Trash2,
  Circle,
  User,
} from 'lucide-react';

type TabId = 'processes' | 'templates';
type ProcessType = 'onboarding' | 'offboarding';

interface ProcessWithUser {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  type: 'onboarding' | 'offboarding';
  startDate: string;
  status: 'active' | 'completed';
  tasks: any[];
  progress: number;
  user?: UserProfile;
}

const OnboardingAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { user, currentCompany } = useAuth();
  const {
    templates,
    loading,
    getTemplates,
    createTemplate,
    startOnboarding,
    getAllProcesses,
    deleteTemplate,
  } = useOnboarding();

  const [activeTab, setActiveTab] = useState<TabId>('processes');
  const [processType, setProcessType] = useState<ProcessType>('onboarding');
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showStartProcessModal, setShowStartProcessModal] = useState(false);
  const [processes, setProcesses] = useState<ProcessWithUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // New Template Form State
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    type: 'onboarding' as ProcessType,
    steps: [{ title: '', role: 'EMPLOYEE' as TaskRole, description: '' }],
  });

  // Start Process Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await getTemplates();
      const processesData = await getAllProcesses();
      setProcesses(processesData);

      // Load all users for the dropdown (only from same company)
      if (!currentCompany) return;
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('companyId', '==', currentCompany.id));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData: UserProfile[] = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setAllUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('common.error'));
    }
  };

  // Add new step to template
  const addStep = () => {
    setNewTemplate({
      ...newTemplate,
      steps: [...newTemplate.steps, { title: '', role: 'EMPLOYEE', description: '' }],
    });
  };

  // Remove step from template
  const removeStep = (index: number) => {
    const updatedSteps = newTemplate.steps.filter((_, i) => i !== index);
    setNewTemplate({ ...newTemplate, steps: updatedSteps });
  };

  // Update step
  const updateStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...newTemplate.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewTemplate({ ...newTemplate, steps: updatedSteps });
  };

  // Create new template
  const handleCreateTemplate = async () => {
    if (!newTemplate.title.trim()) {
      toast.error(t('onboarding.errors.titleRequired'));
      return;
    }

    if (newTemplate.steps.some((step) => !step.title.trim())) {
      toast.error(t('onboarding.errors.stepTitleRequired'));
      return;
    }

    try {
      await createTemplate({
        title: newTemplate.title,
        type: newTemplate.type,
        steps: newTemplate.steps,
        createdBy: user?.uid,
      });
      toast.success(t('onboarding.templateCreated'));
      setShowNewTemplateModal(false);
      setNewTemplate({
        title: '',
        type: 'onboarding',
        steps: [{ title: '', role: 'EMPLOYEE', description: '' }],
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error(t('common.error'));
    }
  };

  // Start onboarding process
  const handleStartProcess = async () => {
    if (!selectedUserId || !selectedTemplateId) {
      toast.error(t('onboarding.errors.selectUserAndTemplate'));
      return;
    }

    try {
      await startOnboarding(selectedUserId, selectedTemplateId);
      toast.success(t('onboarding.processStarted'));
      setShowStartProcessModal(false);
      setSelectedUserId('');
      setSelectedTemplateId('');
      await loadData(); // Refresh
    } catch (error) {
      console.error('Error starting process:', error);
      toast.error(t('common.error'));
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(t('onboarding.confirmDeleteTemplate'))) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      toast.success(t('onboarding.templateDeleted'));
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(t('common.error'));
    }
  };

  // Get role label
  const getRoleLabel = (role: TaskRole) => {
    const labels = {
      ADMIN: t('onboarding.roles.admin'),
      MANAGER: t('onboarding.roles.manager'),
      EMPLOYEE: t('onboarding.roles.employee'),
    };
    return labels[role];
  };

  // Tabs
  const tabs = [
    { id: 'processes' as TabId, label: t('onboarding.tabs.processes'), icon: Users },
    { id: 'templates' as TabId, label: t('onboarding.tabs.templates'), icon: ClipboardList },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('onboarding.title')}</h1>
          <p className="text-gray-600 mt-1">{t('onboarding.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Process Type Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setProcessType('onboarding')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            processType === 'onboarding'
              ? 'bg-[#1E4947] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('onboarding.processTypes.onboarding', 'Onboarding')}
        </button>
        <button
          onClick={() => setProcessType('offboarding')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            processType === 'offboarding'
              ? 'bg-[#1E4947] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('onboarding.processTypes.offboarding', 'Offboarding')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'processes' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowStartProcessModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              {t('onboarding.startProcess')}
            </button>
          </div>

          {/* Processes List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : processes.filter(p => (p.type || 'onboarding') === processType).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">{t('onboarding.noProcesses')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {processes.filter(p => (p.type || 'onboarding') === processType).map((process) => (
                <div
                  key={process.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* User Avatar */}
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {process.user?.photoURL ? (
                          <img
                            src={process.user.photoURL}
                            alt={process.user.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-blue-600" />
                        )}
                      </div>

                      {/* Process Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {process.user?.displayName || t('common.unknown')}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              process.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {process.status === 'completed'
                              ? t('onboarding.status.completed')
                              : t('onboarding.status.active')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{process.title}</p>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {t('onboarding.progress')}
                            </span>
                            <span className="font-medium">{process.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${process.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {process.tasks.filter((t) => t.completed).length} /{' '}
                            {process.tasks.length} {t('onboarding.tasksCompleted')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Start Date */}
                    <div className="text-right text-sm text-gray-500">
                      <p>{t('onboarding.startDate')}</p>
                      <p className="font-medium text-gray-900">{process.startDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setNewTemplate({ ...newTemplate, type: processType });
                setShowNewTemplateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              {t('onboarding.newTemplate')}
            </button>
          </div>

          {/* Templates List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : templates.filter(t => (t.type || 'onboarding') === processType).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">{t('onboarding.noTemplates')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.filter(template => (template.type || 'onboarding') === processType).map((template) => (
                <div
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">{template.title}</h3>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {template.steps.length} {t('onboarding.steps')}
                    </p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {template.steps.map((step, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-start gap-2 text-gray-700"
                        >
                          <Circle className="w-3 h-3 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <span>{step.title}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({getRoleLabel(step.role)})
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{t('onboarding.newTemplate')}</h2>
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Template Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('onboarding.templateTitle')}
                </label>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('onboarding.templateTitlePlaceholder')}
                />
              </div>

              {/* Steps */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('onboarding.steps')}
                </label>
                <div className="space-y-4">
                  {newTemplate.steps.map((step, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          {t('onboarding.step')} {index + 1}
                        </span>
                        {newTemplate.steps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={t('onboarding.stepTitlePlaceholder')}
                        />

                        <select
                          value={step.role}
                          onChange={(e) =>
                            updateStep(index, 'role', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="EMPLOYEE">
                            {t('onboarding.roles.employee')}
                          </option>
                          <option value="MANAGER">
                            {t('onboarding.roles.manager')}
                          </option>
                          <option value="ADMIN">{t('onboarding.roles.admin')}</option>
                        </select>

                        <textarea
                          value={step.description}
                          onChange={(e) =>
                            updateStep(index, 'description', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder={t('onboarding.stepDescriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addStep}
                  className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t('onboarding.addStep')}
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('common.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Process Modal */}
      {showStartProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{t('onboarding.startProcess')}</h2>
                <button
                  onClick={() => setShowStartProcessModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Select User */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('onboarding.selectEmployee')}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('onboarding.selectEmployeePlaceholder')}</option>
                    {allUsers.map((user) => (
                      <option key={user.uid} value={user.uid}>
                        {user.displayName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('onboarding.selectTemplate')}
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {t('onboarding.selectTemplatePlaceholder')}
                    </option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title} ({template.steps.length}{' '}
                        {t('onboarding.steps')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowStartProcessModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleStartProcess}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('onboarding.start')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingAdmin;
