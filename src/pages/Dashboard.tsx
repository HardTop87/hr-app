import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, CheckSquare, Cake, Umbrella, Stethoscope, Plane, Home, AlertCircle, User } from 'lucide-react';
import TimeTrackingWidget from '../components/dashboard/TimeTrackingWidget';
import StatCard from '../components/dashboard/StatCard';
import { useDashboardStats, useTeamPresence, useUpcomingBirthdays, useEmployeesInProbation } from '../hooks/useDashboard';
import { useProbationCheck } from '../hooks/useProbationCheck';
import { isInProbation, getDaysUntil, formatDate } from '../utils/dateUtils';
import Skeleton, { SkeletonText, SkeletonCard } from '../components/ui/Skeleton';

export default function Dashboard() {
  const { t } = useTranslation();
  const { userProfile, currentCompany } = useAuth();

  const { remainingVacationDays, workedHoursThisWeek, loading: statsLoading } = useDashboardStats(userProfile?.uid || '');
  const { absences, loading: absencesLoading } = useTeamPresence(
    currentCompany?.id || '',
    userProfile?.departmentId || null
  );
  const { birthdays, loading: birthdaysLoading } = useUpcomingBirthdays(currentCompany?.id || '');
  
  // Probation data
  const { employees: probationEmployees, loading: probationLoading } = useEmployeesInProbation(currentCompany?.id || '');
  
  // Enable probation checks for HR/admin only
  const isHROrAdmin = userProfile?.role === 'hr_manager' || 
                      userProfile?.role === 'company_admin' || 
                      userProfile?.role === 'global_admin';
  useProbationCheck(currentCompany?.id || '', isHROrAdmin);
  
  // Check if current user is in probation
  const userInProbation = userProfile?.probationEndDate && isInProbation(userProfile.probationEndDate);

  // Loading state
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cococo-pig border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Get greeting
  const hour = new Date().getHours();
  let greeting = t('dashboardPage.greeting.morning');
  if (hour >= 12 && hour < 18) {
    greeting = t('dashboardPage.greeting.afternoon');
  } else if (hour >= 18) {
    greeting = t('dashboardPage.greeting.evening');
  }

  const firstName = userProfile.displayName.split(' ')[0];
  const today = new Date().toLocaleDateString(t('common.locale'), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getAbsenceIcon = (type: string) => {
    switch (type) {
      case 'vacation':
        return Umbrella;
      case 'sick':
        return Stethoscope;
      case 'business_trip':
        return Plane;
      case 'remote':
        return Home;
      default:
        return Calendar;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cococo-berry to-purple-600 rounded-lg shadow-sm p-6 text-white">
        {!userProfile ? (
          <>
            <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
            <Skeleton className="h-5 w-96 bg-white/10" />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-1">
              {greeting}, {firstName}!
            </h1>
            <p className="text-white/90">{today}</p>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Time Tracking Widget */}
        <div className="lg:col-span-2">
          <TimeTrackingWidget userId={userProfile.uid} />
        </div>

        {/* Right Column: KPI Cards */}
        <div className="space-y-4">
          {statsLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                title={t('dashboardPage.stats.remainingVacation')}
                value={remainingVacationDays}
                icon={Umbrella}
                color="blue"
              />
              <StatCard
                title={t('dashboardPage.stats.workedThisWeek')}
                value={`${workedHoursThisWeek}h`}
                icon={Clock}
                color="green"
              />
              <StatCard
                title={t('dashboardPage.stats.openTasks')}
                value="0"
                icon={CheckSquare}
                color="purple"
              />
            </>
          )}

          {/* User Probation Banner */}
          {userInProbation && userProfile.probationEndDate && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">
                    {t('dashboardPage.probation.title')}
                  </h3>
                  <p className="text-sm text-orange-800 mb-1">
                    {t('dashboardPage.probation.endsOn')} {formatDate(userProfile.probationEndDate, t('common.locale'))}
                  </p>
                  <p className="text-xs text-orange-700">
                    {t('dashboardPage.probation.daysRemaining', { days: getDaysUntil(userProfile.probationEndDate) })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Probation List for HR/Admin */}
      {isHROrAdmin && probationEmployees.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {t('dashboardPage.probation.employeesTitle')}
            </h2>
            <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full">
              {probationEmployees.length}
            </span>
          </div>

          {probationLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonText className="w-3/4" />
                    <SkeletonText className="w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {probationEmployees.map((employee) => (
                <div
                  key={employee.uid}
                  className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  {employee.photoURL ? (
                    <img
                      src={employee.photoURL}
                      alt={employee.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-orange-300 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {employee.jobTitle || t('common.noJobTitle')}
                    </p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      {t('dashboardPage.probation.endsOn')} {formatDate(employee.probationEndDate, t('common.locale'))}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                      employee.daysRemaining <= 30 
                        ? 'bg-red-100 text-red-800' 
                        : employee.daysRemaining <= 45 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.daysRemaining} {t('dashboardPage.probation.days')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Radar Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {t('dashboardPage.teamRadar.title')}
        </h2>

        {absencesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonText className="w-3/4" />
                  <SkeletonText className="w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : absences.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('dashboardPage.teamRadar.noAbsences')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {absences.map((absence, index) => {
              const Icon = getAbsenceIcon(absence.type);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="relative">
                    {absence.user.photoURL ? (
                      <img
                        src={absence.user.photoURL}
                        alt={absence.user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                        {absence.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                      absence.type === 'vacation' ? 'bg-blue-500' :
                      absence.type === 'sick' ? 'bg-red-500' :
                      absence.type === 'business_trip' ? 'bg-purple-500' :
                      'bg-green-500'
                    }`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {absence.user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {absence.user.jobTitle || t('common.noJobTitle')}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {t(`dashboardPage.teamRadar.${absence.type}`)} · {t('dashboardPage.teamRadar.until')} {absence.returnDate.toLocaleDateString(t('common.locale'))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Birthdays Section */}
      {birthdays.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cake className="w-5 h-5 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {t('dashboardPage.birthdays.title')}
            </h2>
          </div>

          {birthdaysLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonText className="w-3/4" />
                    <SkeletonText className="w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {birthdays.map((birthday, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  {birthday.photoURL ? (
                    <img
                      src={birthday.photoURL}
                      alt={birthday.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-pink-300 flex items-center justify-center text-white font-semibold">
                      {birthday.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {birthday.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {birthday.day}.{birthday.month}.
                      {birthday.daysUntil === 0 && (
                        <span className="ml-1 text-pink-600 font-semibold">
                          {t('dashboardPage.birthdays.today')}
                        </span>
                      )}
                      {birthday.daysUntil === 1 && (
                        <span className="ml-1 text-gray-600">
                          {t('dashboardPage.birthdays.tomorrow')}
                        </span>
                      )}
                      {birthday.daysUntil > 1 && (
                        <span className="ml-1 text-gray-500">
                          {t('dashboardPage.birthdays.inDays', { days: birthday.daysUntil })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
