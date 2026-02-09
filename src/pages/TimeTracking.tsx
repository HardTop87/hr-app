import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useMonthlyTimeEntries } from '../hooks/useTimeTracking';
import TimeEntryModal from '../components/time/TimeEntryModal';
import { 
  groupEntriesByDay, 
  calculateDailyDuration, 
  formatDuration,
  getDaysInMonth,
  isWeekend,
  isWorkingDay,
  hasIncompleteEntries,
  isToday,
  getMonthStartOffset
} from '../lib/timeUtils';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertTriangle, Minus, Info } from 'lucide-react';

export default function TimeTracking() {
  const { t, i18n } = useTranslation();
  const { user, userProfile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // JS months are 0-indexed
  
  const { entries, isLoading } = useMonthlyTimeEntries(user?.uid, year, month);
  
  // Group entries by day
  const entriesByDay = groupEntriesByDay(entries);
  
  // Get all days of the month
  const allDays = getDaysInMonth(year, month);
  
  // Calculate offset for calendar (empty cells at start)
  const monthStartOffset = getMonthStartOffset(year, month);
  
  // Calculate monthly statistics
  const monthStats = {
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
    daysWorked: 0,
  };
  
  Object.keys(entriesByDay).forEach(date => {
    const dayEntries = entriesByDay[date];
    const result = calculateDailyDuration(dayEntries, userProfile);
    monthStats.totalWorkMinutes += result.net; // Use net (after deductions)
    monthStats.totalBreakMinutes += result.takenBreak;
    if (result.net > 0) {
      monthStats.daysWorked++;
    }
  });
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };
  
  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };
  
  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  // Get current locale from i18n
  const locale = i18n.language === 'de' ? 'de' : 'en';
  const localeTag = i18n.language === 'de' ? 'de-DE' : 'en-US';

  const weekdays = [
    t('timetracking_weekday_mon'),
    t('timetracking_weekday_tue'),
    t('timetracking_weekday_wed'),
    t('timetracking_weekday_thu'),
    t('timetracking_weekday_fri'),
    t('timetracking_weekday_sat'),
    t('timetracking_weekday_sun'),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF79C9] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#1E4947]">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Month Selector */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#FF79C9]/20">
        <div className="bg-[#FFEFF8] px-4 md:px-6 py-3 md:py-4 border-b border-[#FF79C9]/20">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold text-[#4D2B41] flex items-center gap-2">
              <Calendar className="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{t('timetracking_title')}</span>
              <span className="sm:hidden">{t('timeclock_title')}</span>
            </h1>
            
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={handlePreviousMonth}
                className="p-1.5 md:p-2 text-[#4D2B41] hover:bg-[#FF79C9]/10 rounded-lg transition-colors"
                title={t('timetracking_previous_month')}
              >
                <ChevronLeft size={18} className="md:w-5 md:h-5" />
              </button>
              
              <div className="text-base md:text-lg font-semibold text-[#4D2B41] min-w-[140px] md:min-w-[200px] text-center">
                {currentDate.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' })}
              </div>
              
              <button
                onClick={handleNextMonth}
                className="p-1.5 md:p-2 text-[#4D2B41] hover:bg-[#FF79C9]/10 rounded-lg transition-colors"
                title={t('timetracking_next_month')}
              >
                <ChevronRight size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="p-4 md:p-6 grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-[#1E4947]/5 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-1 md:gap-2 text-[#1E4947] text-xs md:text-sm mb-1">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">{t('timetracking_total_hours')}</span>
              <span className="sm:hidden">{t('timeclock_total_work')}</span>
            </div>
            <div className="text-xl md:text-3xl font-bold text-[#1E4947]">
              {formatDuration(monthStats.totalWorkMinutes, locale)}
            </div>
          </div>
          
          <div className="bg-[#FF79C9]/5 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-1 md:gap-2 text-[#FF79C9] text-xs md:text-sm mb-1">
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">{t('timetracking_days_worked')}</span>
              <span className="sm:hidden">{t('timetracking_days_worked')}</span>
            </div>
            <div className="text-xl md:text-3xl font-bold text-[#FF79C9]">
              {monthStats.daysWorked}
            </div>
          </div>
          
          <div className="bg-[#4D2B41]/5 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-1 md:gap-2 text-[#4D2B41] text-xs md:text-sm mb-1">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">{t('timeentry_breaks')}</span>
              <span className="sm:hidden">{t('timeentry_breaks')}</span>
            </div>
            <div className="text-xl md:text-3xl font-bold text-[#4D2B41]">
              {formatDuration(monthStats.totalBreakMinutes, locale)}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#FF79C9]/20 p-3 md:p-6">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {weekdays.map((day) => (
            <div 
              key={day}
              className="text-center text-xs md:text-sm font-bold text-white bg-[#4D2B41] rounded py-1.5 md:py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {/* Empty cells at start */}
          {Array.from({ length: monthStartOffset }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Day Cells */}
          {allDays.map(date => {
            const dayEntries = entriesByDay[date] || [];
            const hasTimes = dayEntries.length > 0;
            const weekend = isWeekend(date);
            const workingDay = isWorkingDay(date);
            const today = isToday(date);
            const incomplete = hasIncompleteEntries(dayEntries);
            
            // Calculate with regional rules
            const result = calculateDailyDuration(dayEntries, userProfile);
            const { gross, net, deductedBreak, isCompliant } = result;
            
            // Extract day number
            const dayNumber = parseInt(date.split('-')[2]);
            
            // Determine which icons to show
            const isContractor = userProfile?.employmentType === 'contractor';
            const isGerman = userProfile?.holidayRegion?.startsWith('de-');
            const isUK = userProfile?.holidayRegion === 'en-uk';
            const showDeduction = isGerman && deductedBreak > 0;
            const showUKWarning = isUK && !isCompliant && hasTimes;
            
            return (
              <button
                key={date}
                onClick={() => handleDayClick(date)}
                className={`aspect-square p-1 md:p-1.5 rounded border-2 transition-all hover:shadow-md ${
                  today
                    ? 'border-[#4D2B41] shadow-md'
                    : 'border-transparent'
                } ${
                  workingDay && !hasTimes
                    ? 'bg-[#FFEFF8]/50 hover:bg-[#FFEFF8]'
                    : weekend && !hasTimes
                    ? 'bg-gray-100 hover:bg-gray-200'
                    : hasTimes
                    ? 'bg-white hover:bg-[#FFEFF8]/50'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="h-full flex flex-col">
                  {/* Day Number */}
                  <div className={`text-xs md:text-sm font-semibold mb-0.5 ${
                    today ? 'text-[#4D2B41]' : weekend ? 'text-gray-500' : 'text-[#1E4947]'
                  }`}>
                    {dayNumber}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                    {hasTimes && (
                      <>
                        {/* Show net time (after deductions) for employees, gross for contractors */}
                        <div className="text-xs md:text-sm font-bold text-[#1E4947]">
                          {formatDuration(isContractor ? gross : net, locale)}
                        </div>
                        
                        {/* Show icons based on region and status */}
                        <div className="flex items-center gap-0.5">
                          {incomplete && (
                            <div title="Incomplete entry">
                              <AlertTriangle className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-600" />
                            </div>
                          )}
                          {showDeduction && (
                            <div title={`Auto-deducted ${deductedBreak}m break (German law)`}>
                              <Minus className="w-3 h-3 md:w-3.5 md:h-3.5 text-orange-600" />
                            </div>
                          )}
                          {showUKWarning && (
                            <div title="Missing required 20m break (UK law)">
                              <Info className="w-3 h-3 md:w-3.5 md:h-3.5 text-red-600" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {hasTimes && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#1E4947]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded border-2 border-[#4D2B41]" />
            <span className="text-gray-600">{t('timetracking_today')}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-[#FFEFF8]/50" />
            <span className="text-gray-600">{t('timetracking_legend_normal_work')}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gray-100" />
            <span className="text-gray-600">{t('timetracking_legend_weekend')}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />
            <span className="text-gray-600">{t('timeentry_compliance_warning')}</span>
          </div>
          {userProfile?.holidayRegion?.startsWith('de-') && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <Minus className="w-3 h-3 md:w-4 md:h-4 text-orange-600" />
              <span className="text-gray-600">{t('timeentry_mandatory_break_de').split(':')[0]}</span>
            </div>
          )}
          {userProfile?.holidayRegion === 'en-uk' && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <Info className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
              <span className="text-gray-600">{t('timeentry_mandatory_break_uk').split(':')[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedDate && user && (
        <TimeEntryModal
          date={selectedDate}
          entries={entriesByDay[selectedDate] || []}
          userId={user.uid}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
