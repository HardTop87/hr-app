import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { useAssets } from '../hooks/useAssets';
import type { OnboardingProcess, OnboardingTask } from '../types/onboarding';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  CheckCircle,
  Circle,
  Clock,
  Briefcase,
  User,
  ShieldCheck,
  PartyPopper,
  Package,
  AlertCircle,
} from 'lucide-react';

const OnboardingMyPlan: React.FC = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { getMyOnboarding, completeTask } = useOnboarding();
  const { assets } = useAssets();
  const [process, setProcess] = useState<OnboardingProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    setLoading(true);
    const unsubscribe = getMyOnboarding(userProfile.uid, (onboardingProcess) => {
      setProcess(onboardingProcess);
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]);

  // Filter assigned assets for the current user (for offboarding)
  const assignedAssets = userProfile 
    ? assets.filter(asset => 
        asset.status === 'assigned' && 
        asset.assignedToUserId === userProfile.uid
      )
    : [];

  const handleCompleteTask = async (taskId: string) => {
    if (!process || !userProfile) return;

    setCompletingTaskId(taskId);
    try {
      const result = await completeTask(process.id, taskId, userProfile.uid);
      
      // Show success toast
      toast.success(t('onboarding.taskCompleted'));
      
      // Show confetti effect if all tasks are completed
      if (result.status === 'completed') {
        toast.success(t('onboarding.allTasksCompleted'), {
          icon: '🎉',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(t('common.error'));
    } finally {
      setCompletingTaskId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4" />;
      case 'MANAGER':
        return <User className="w-4 h-4" />;
      case 'EMPLOYEE':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: {
        label: t('onboarding.waitingForAdmin'),
        className: 'bg-purple-100 text-purple-700',
      },
      MANAGER: {
        label: t('onboarding.waitingForManager'),
        className: 'bg-blue-100 text-blue-700',
      },
      EMPLOYEE: {
        label: t('onboarding.yourTask'),
        className: 'bg-green-100 text-green-700',
      },
    };

    return badges[role as keyof typeof badges] || badges.EMPLOYEE;
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

  if (!process) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('onboarding.noActiveOnboarding')}
          </h2>
          <p className="text-gray-600">
            {t('onboarding.noActiveOnboardingDescription')}
          </p>
        </div>
      </div>
    );
  }

  const completedTasks = process.tasks.filter((task) => task.completed).length;
  const totalTasks = process.tasks.length;
  const progressPercent = process.progress || 0;
  const isCompleted = process.status === 'completed';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {process.type === 'offboarding' 
                ? t('onboarding.offboarding.myOffboarding', 'Mein Austritt')
                : process.title
              }
            </h1>
            <p className="text-gray-600">
              {t('onboarding.startedOn')} {process.startDate}
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
              <PartyPopper className="w-5 h-5" />
              <span className="font-medium">{t('onboarding.completed')}</span>
            </div>
          )}
        </div>

        {/* Large Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {t('onboarding.overallProgress')}
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ease-out ${
                isCompleted ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {completedTasks} {t('onboarding.of')} {totalTasks}{' '}
            {t('onboarding.tasksCompleted')}
          </p>
        </div>
      </div>

      {/* Asset Return Section (for offboarding) */}
      {process.type === 'offboarding' && assignedAssets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('onboarding.offboarding.equipmentReturn', 'Geräte zurückgeben')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('onboarding.offboarding.returnInstructions', 'Bitte gib folgendes Equipment zurück')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {assignedAssets.map(asset => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{asset.model}</p>
                  {asset.serialNumber && (
                    <p className="text-xs text-gray-600">SN: {asset.serialNumber}</p>
                  )}
                  <p className="text-xs text-gray-500">ID: {asset.identifier}</p>
                </div>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                  {t('onboarding.offboarding.pending', 'Ausstehend')}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{t('onboarding.offboarding.note', 'Hinweis')}:</strong>{' '}
              {t('onboarding.offboarding.adminContact', 'Bitte kontaktiere deinen Administrator, um die Rückgabe zu koordinieren.')}
            </p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {process.tasks.map((task: OnboardingTask, index: number) => {
          const isEmployeeTask = task.role === 'EMPLOYEE';
          const canComplete = isEmployeeTask && !task.completed;
          const roleBadge = getRoleBadge(task.role);
          const isCompleting = completingTaskId === task.id;

          return (
            <div
              key={task.id}
              className={`bg-white rounded-lg border-2 transition-all ${
                task.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox or Status Icon */}
                  <div className="flex-shrink-0 pt-1">
                    {task.completed ? (
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    ) : canComplete ? (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={isCompleting}
                        className={`w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                          isCompleting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isCompleting ? (
                          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3
                        className={`text-lg font-medium ${
                          task.completed
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {index + 1}. {task.title}
                      </h3>
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${roleBadge.className}`}
                      >
                        {getRoleIcon(task.role)}
                        {roleBadge.label}
                      </span>
                    </div>

                    {task.description && (
                      <p
                        className={`text-sm mb-2 ${
                          task.completed ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {task.description}
                      </p>
                    )}

                    {task.completed && task.completedAt && (
                      <p className="text-xs text-gray-500">
                        {t('onboarding.completedOn')}{' '}
                        {new Date(task.completedAt).toLocaleDateString(
                          t('common.locale'),
                          {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          }
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 text-center">
          <PartyPopper className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {t('onboarding.congratulations')}
          </h3>
          <p className="text-gray-700">
            {t('onboarding.congratulationsMessage')}
          </p>
        </div>
      )}
    </div>
  );
};

export default OnboardingMyPlan;
