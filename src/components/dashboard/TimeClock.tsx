import { useEffect, useState } from 'react';
import { Play, Square, Coffee, AlertTriangle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracking } from '../../hooks/useTimeTracking';
import type { UserProfile } from '../../types/user';
import toast from 'react-hot-toast';

/**
 * Get compliance warning message based on regional rules
 */
function getComplianceMessage(
  workMinutes: number,
  breakMinutes: number,
  userProfile: UserProfile | null,
  t: (key: string) => string
): { message: string; severity: 'red' | 'orange' | 'yellow' } | null {
  if (!userProfile) return null;

  const { employmentType, holidayRegion } = userProfile;
  const workHours = workMinutes / 60;

  // Contractors: No warnings, they manage their own time
  if (employmentType === 'contractor') {
    return null;
  }

  // UK Rules
  if (holidayRegion === 'en-uk') {
    if (workHours > 6 && breakMinutes < 20) {
      return {
        message: `⚠️ ${t('timeentry_mandatory_break_uk')}`,
        severity: 'yellow',
      };
    }
    return null;
  }

  // German Rules (de-* or default)
  if (workHours > 10) {
    return {
      message: `🛑 ${t('timeentry_max_daily_hours_de')}`,
      severity: 'red',
    };
  }
  if (workHours > 9 && breakMinutes < 45) {
    return {
      message: `⚠️ ${t('timeentry_mandatory_break_de')}`,
      severity: 'orange',
    };
  }
  if (workHours > 6 && breakMinutes < 30) {
    return {
      message: `⚠️ ${t('timeentry_mandatory_break_de')}`,
      severity: 'yellow',
    };
  }

  return null;
}

export default function TimeClock() {
  const { t, i18n } = useTranslation();
  const { user, userProfile } = useAuth();
  const {
    activeEntry,
    totalWorkTime,
    totalBreakTime,
    isLoading,
    startWork,
    stopWork,
    toggleBreak,
  } = useTimeTracking(user?.uid);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time for active entry
  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      setElapsedTime(now - activeEntry.startTime);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);

    return () => clearInterval(timer);
  }, [activeEntry]);

  // Format time as HH:MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Format time as HH:MM (without seconds)
  const formatTimeShort = (ms: number): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Calculate total work including active work
  const currentTotalWork = activeEntry?.type === 'work' 
    ? totalWorkTime + elapsedTime 
    : totalWorkTime;

  const workMinutes = Math.floor(currentTotalWork / (1000 * 60));
  const breakMinutes = Math.floor(totalBreakTime / (1000 * 60));

  // Get regional compliance warning
  const complianceWarning = getComplianceMessage(workMinutes, breakMinutes, userProfile, t);

  const handleStartWork = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await startWork();
      toast.success(t('timeclock_work_started'));
    } catch (error) {
      toast.error(t('timeentry_error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopWork = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await stopWork();
      toast.success(t('timeclock_work_ended') + ' 🎉');
    } catch (error) {
      toast.error(t('timeentry_error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleBreak = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      if (activeEntry?.type === 'work') {
        await toggleBreak();
        toast.success(t('timeclock_break_started'));
      } else if (activeEntry?.type === 'break') {
        await toggleBreak();
        toast.success(t('timeclock_break_ended'));
      }
    } catch (error) {
      toast.error(t('timeentry_error'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#FF79C9]/20">
      {/* Header */}
      <div className="bg-[#FFEFF8] px-6 py-4 border-b border-[#FF79C9]/20">
        <h2 className="text-xl font-semibold text-[#4D2B41]">{t('timeclock_title')}</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Time Display */}
        <div className="text-center">
          <div className="text-5xl font-bold text-[#4D2B41] mb-2">
            {currentTime.toLocaleTimeString(i18n.language === 'de' ? 'de-DE' : 'en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit' 
            })}
          </div>
          <div className="text-sm text-[#1E4947]">
            {currentTime.toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
        </div>

        {/* Active Timer */}
        {activeEntry && (
          <div className="bg-[#FFEFF8]/50 rounded-lg p-4 border border-[#FF79C9]/30">
            <div className="text-center">
              <div className="text-sm text-[#4D2B41] mb-1">
                {activeEntry.type === 'work' ? t('timeclock_working_for') : t('timeclock_on_break')}
              </div>
              <div className="text-3xl font-bold text-[#FF79C9]">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        )}

        {/* Daily Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1E4947]/5 rounded-lg p-4">
            <div className="text-xs text-[#1E4947] mb-1">{t('timeclock_total_work')}</div>
            <div 
              className={`text-2xl font-bold ${
                complianceWarning?.severity === 'red' ? 'text-red-600' : 'text-[#1E4947]'
              }`}
            >
              {formatTimeShort(currentTotalWork)}
            </div>
          </div>
          <div className="bg-[#FF79C9]/5 rounded-lg p-4">
            <div className="text-xs text-[#FF79C9] mb-1">{t('timeentry_breaks')}</div>
            <div className="text-2xl font-bold text-[#FF79C9]">
              {formatTimeShort(totalBreakTime)}
            </div>
          </div>
        </div>

        {/* Compliance Warnings */}
        {complianceWarning && (
          <div 
            className={`flex items-start gap-2 p-3 rounded-lg ${
              complianceWarning.severity === 'red' 
                ? 'bg-red-50 border border-red-200' 
                : complianceWarning.severity === 'orange'
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            {complianceWarning.severity === 'red' ? (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                complianceWarning.severity === 'orange' ? 'text-orange-600' : 'text-yellow-600'
              }`} />
            )}
            <div 
              className={`text-sm ${
                complianceWarning.severity === 'red' 
                  ? 'text-red-800' 
                  : complianceWarning.severity === 'orange'
                  ? 'text-orange-800'
                  : 'text-yellow-800'
              }`}
            >
              <p className="font-medium">{complianceWarning.message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!activeEntry && (
            <button
              onClick={handleStartWork}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-[#1E4947] text-white px-6 py-3 rounded-lg hover:bg-[#163935] transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('loading')}
                </>
              ) : (
                <>
                  <Play size={20} />
                  {t('timeclock_start_work')}
                </>
              )}
            </button>
          )}

          {activeEntry && (
            <>
              <button
                onClick={handleToggleBreak}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeEntry.type === 'work'
                    ? 'bg-[#FFEFF8] text-[#4D2B41] hover:bg-[#ffdff3] border border-[#FF79C9]/30'
                    : 'bg-[#1E4947] text-white hover:bg-[#163935]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('loading')}
                  </>
                ) : activeEntry.type === 'work' ? (
                  <>
                    <Coffee size={20} />
                    {t('timeclock_start_break')}
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    {t('timeclock_end_break')}
                  </>
                )}
              </button>

              {activeEntry.type === 'work' && (
                <button
                  onClick={handleStopWork}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-[#4D2B41] text-white px-6 py-3 rounded-lg hover:bg-[#3d1f33] transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <Square size={20} />
                      {t('timeclock_end_work')}
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
