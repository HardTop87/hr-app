import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Clock, Pause } from 'lucide-react';
import { useTimeTracking } from '../../hooks/useTimeTracking';
import { toast } from 'react-hot-toast';

interface TimeTrackingWidgetProps {
  userId: string;
}

export default function TimeTrackingWidget({ userId }: TimeTrackingWidgetProps) {
  const { t } = useTranslation();
  const {
    activeEntry,
    totalWorkTime,
    totalBreakTime,
    isLoading,
    startWork,
    stopWork,
    toggleBreak,
  } = useTimeTracking(userId);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleStart = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await startWork();
      toast.success(t('dashboardPage.timeTracking.started'));
    } catch (error) {
      console.error('Error starting work:', error);
      toast.error(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleBreak = async () => {
    if (isProcessing || !activeEntry) return;
    try {
      setIsProcessing(true);
      if (activeEntry.type === 'work') {
        await toggleBreak();
        toast.success(t('dashboardPage.timeTracking.pauseStarted'));
      } else if (activeEntry.type === 'break') {
        await toggleBreak();
        toast.success(t('dashboardPage.timeTracking.resumed'));
      }
    } catch (error) {
      console.error('Error toggling break:', error);
      toast.error(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    if (isProcessing || !activeEntry || activeEntry.type !== 'work') return;
    try {
      setIsProcessing(true);
      await stopWork();
      toast.success(t('dashboardPage.timeTracking.stopped'));
    } catch (error) {
      console.error('Error stopping work:', error);
      toast.error(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">{t('dashboardPage.timeTracking.title')}</h3>
      </div>

      {!activeEntry ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <p className="text-gray-600 mb-2">{t('dashboardPage.timeTracking.notStarted')}</p>
            <p className="text-4xl font-bold text-gray-400">00:00:00</p>
          </div>
          <button
            onClick={handleStart}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            {t('dashboardPage.timeTracking.start')}
          </button>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3 ${
              activeEntry.type === 'work'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                activeEntry.type === 'work' ? 'bg-green-600' : 'bg-yellow-600'
              } animate-pulse`}></div>
              <span className="text-sm font-medium">
                {activeEntry.type === 'work'
                  ? t('dashboardPage.timeTracking.working')
                  : t('dashboardPage.timeTracking.onBreak')}
              </span>
            </div>
            
            <p className="text-5xl font-bold text-gray-900 mb-2">
              {formatTime(elapsedTime)}
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            {activeEntry.type === 'work' && (
              <button
                onClick={handleToggleBreak}
                disabled={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                {t('dashboardPage.timeTracking.pause')}
              </button>
            )}
            {activeEntry.type === 'break' && (
              <button
                onClick={handleToggleBreak}
                disabled={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {t('dashboardPage.timeTracking.resume')}
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              {t('dashboardPage.timeTracking.stop')}
            </button>
          </div>

          {/* Daily Summary */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t('dashboardPage.timeTracking.startTime')}:</span>
              <span className="font-medium">
                {new Date(activeEntry.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('dashboardPage.timeTracking.totalWork')}:</span>
              <span className="font-medium text-green-600">
                {formatTimeShort(currentTotalWork)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('dashboardPage.timeTracking.breaksToday')}:</span>
              <span className="font-medium text-yellow-600">
                {formatTimeShort(totalBreakTime)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
