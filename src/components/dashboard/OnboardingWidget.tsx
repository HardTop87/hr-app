import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import type { OnboardingProcess } from '../../types/onboarding';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight, Briefcase } from 'lucide-react';

const OnboardingWidget: React.FC = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { getMyOnboarding } = useOnboarding();
  const [process, setProcess] = useState<OnboardingProcess | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Don't show widget if no active onboarding
  if (loading) {
    return null;
  }

  if (!process) {
    return null;
  }

  const completedTasks = process.tasks.filter((task) => task.completed).length;
  const totalTasks = process.tasks.length;
  const progressPercent = process.progress || 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('onboarding.myOnboarding')}
            </h3>
            <p className="text-sm text-gray-600">{process.title}</p>
          </div>
        </div>
        {progressPercent === 100 && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{t('onboarding.completed')}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 font-medium">
            {t('onboarding.yourProgress')}
          </span>
          <span className="text-gray-900 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {completedTasks} {t('onboarding.of')} {totalTasks} {t('onboarding.tasksCompleted')}
        </p>
      </div>

      {/* Link to Detail Page */}
      <Link
        to="/onboarding/my-plan"
        className="flex items-center justify-between w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group"
      >
        <span className="font-medium">{t('onboarding.viewPlan')}</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
};

export default OnboardingWidget;
