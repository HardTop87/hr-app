import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarRange, Filter } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  useTeamCalendar,
  isUserAbsentOnDate,
} from '../hooks/useTeamCalendar';
import type { AbsenceType } from '../types/absence';
import type { Department, UserProfile } from '../types/user';

export default function TeamCalendar() {
  const { i18n } = useTranslation();
  const { user, currentCompany } = useAuth();
  const locale = i18n.language === 'de' ? 'de' : 'en';

  // Current month state
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-based

  // Department filter
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Load departments and current user profile
  useEffect(() => {
    const loadData = async () => {
      if (!currentCompany?.id || !user?.uid) return;
      
      try {
        // Load departments
        const deptSnapshot = await getDocs(
          collection(db, 'companies', currentCompany.id, 'departments')
        );
        const deptData: Department[] = [];
        deptSnapshot.forEach((doc) => {
          deptData.push({ id: doc.id, ...doc.data() } as Department);
        });
        setDepartments(deptData);

        // Load current user profile for departmentId
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUserProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [currentCompany?.id, user?.uid]);

  const { users, daysInMonth, isLoading } = useTeamCalendar(
    currentCompany.id, 
    year, 
    month,
    departmentFilter,
    currentUserProfile?.holidayRegion // Pass holidayRegion for regional holidays
  );

  // Today
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
  const currentDay = isCurrentMonth ? today.getDate() : -1;

  // Month navigation
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Jump to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle filter change
  const handleDepartmentFilterChange = (value: string) => {
    if (value === 'all') {
      setDepartmentFilter(null);
    } else if (value === 'my') {
      setDepartmentFilter(currentUserProfile?.departmentId || null);
    } else {
      setDepartmentFilter(value);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#FF79C9]/20">
        <div className="bg-[#FFEFF8] px-4 md:px-6 py-3 md:py-4 border-b border-[#FF79C9]/20">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold text-[#4D2B41] flex items-center gap-2">
              <CalendarRange className="w-5 h-5 md:w-6 md:h-6" />
              {locale === 'de' ? 'Team Kalender' : 'Team Calendar'}
            </h1>
          </div>
        </div>
      </div>

      {/* Month Selector & Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          {/* Top Row: Month Navigation & Department Filter */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={locale === 'de' ? 'Vorheriger Monat' : 'Previous month'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-[#4D2B41] min-w-[200px] text-center">
                {monthName}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={locale === 'de' ? 'Nächster Monat' : 'Next month'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF79C9]/90 transition-colors text-sm font-medium"
                title={locale === 'de' ? 'Zum heutigen Monat springen' : 'Jump to current month'}
              >
                {locale === 'de' ? 'Heute' : 'Today'}
              </button>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={departmentFilter === null ? 'all' : (departmentFilter === currentUserProfile?.departmentId ? 'my' : departmentFilter)}
                onChange={(e) => handleDepartmentFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF79C9] focus:border-transparent"
              >
                <option value="all">
                  {locale === 'de' ? 'Alle Abteilungen' : 'All Departments'}
                </option>
                {currentUserProfile?.departmentId && (
                  <option value="my">
                    {locale === 'de' ? 'Meine Abteilung' : 'My Department'}
                  </option>
                )}
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-sm border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded" />
              <span className="text-gray-700">{locale === 'de' ? 'Urlaub' : 'Vacation'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-rose-500 rounded" />
              <span className="text-gray-700">{locale === 'de' ? 'Krank' : 'Sick'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span className="text-gray-700">Workation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded" />
              <span className="text-gray-700">{locale === 'de' ? 'Dienstreise' : 'Business trip'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 overflow-hidden max-w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-[#FF79C9] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CalendarRange className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {locale === 'de' ? 'Keine Mitarbeiter gefunden' : 'No employees found'}
            </p>
          </div>
        ) : (
          <div className="flex">
            {/* Fixed Left Column - Employee Names */}
            <div className="flex-shrink-0 border-r-2 border-gray-300 z-10 bg-white">
              {/* Header */}
              <div className="bg-gray-50 border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase h-[52px] flex items-center" style={{ width: '160px' }}>
                {locale === 'de' ? 'Mitarbeiter' : 'Employee'}
              </div>
              
              {/* Employee Rows */}
              {users.map((teamUser) => {
                const isCurrentUser = user?.uid === teamUser.uid;
                const nameParts = teamUser.displayName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                return (
                  <div
                    key={teamUser.uid}
                    className={`border-b border-gray-200 px-3 py-2 h-[48px] flex items-center transition-colors ${
                      isCurrentUser ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'
                    }`}
                    style={{ width: '160px' }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                        isCurrentUser ? 'bg-[#FF79C9]' : 'bg-[#1E4947]'
                      }`}>
                        {teamUser.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight truncate ${
                          isCurrentUser ? 'text-[#FF79C9]' : 'text-[#4D2B41]'
                        }`}>
                          {firstName}
                        </p>
                        {lastName && (
                          <p className={`text-xs leading-tight truncate ${
                            isCurrentUser ? 'text-[#FF79C9]' : 'text-[#4D2B41]'
                          }`}>
                            {lastName}
                          </p>
                        )}
                        {isCurrentUser && (
                          <p className="text-[10px] text-[#FF79C9]">
                            ({locale === 'de' ? 'Ich' : 'Me'})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable Right Area - Calendar Days */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: `${daysInMonth.length * 45}px` }}>
                {/* Header Row */}
                <div className="flex border-b-2 border-gray-300 h-[52px]">
                  {daysInMonth.map(({ day, isWeekend, isHoliday, holidayName }) => {
                    const isToday = day === currentDay;
                    const date = new Date(year, month - 1, day);
                    const dayName = date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
                      weekday: 'short',
                    });

                    return (
                      <div
                        key={day}
                        className={`relative group flex flex-col items-center justify-center text-xs font-medium px-2 ${
                          isHoliday 
                            ? 'bg-red-100 border-l border-r border-red-300' 
                            : isWeekend 
                              ? 'bg-gray-200' 
                              : 'bg-white'
                        } ${isToday ? 'border-x-2 border-[#FF79C9]' : ''}`}
                        style={{ width: '45px', minWidth: '45px' }}
                      >
                        <span className={`${
                          isToday 
                            ? 'text-[#FF79C9] font-bold' 
                            : isHoliday 
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}>
                          {dayName}
                        </span>
                        <span className={`text-sm ${
                          isToday 
                            ? 'text-[#FF79C9] font-bold' 
                            : isHoliday
                              ? 'text-red-700 font-semibold'
                              : 'text-gray-900'
                        }`}>
                          {day}
                        </span>
                        
                        {/* Holiday indicator tooltip */}
                        {isHoliday && holidayName && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-red-700 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                            {holidayName}
                            {/* Arrow */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-700" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Data Rows */}
                {users.map((teamUser) => {
                  const isCurrentUser = user?.uid === teamUser.uid;

                  return (
                    <div key={teamUser.uid} className="flex border-b border-gray-200 h-[48px] group">
                      {daysInMonth.map(({ day, isWeekend, isHoliday }) => {
                        const date = new Date(year, month - 1, day);
                        const absence = isUserAbsentOnDate(teamUser, date);
                        const isToday = day === currentDay;

                        return (
                          <div
                            key={`${teamUser.uid}-${day}`}
                            className={`px-1 py-2 transition-colors border-l border-r ${
                              isHoliday
                                ? 'bg-red-50 border-red-200 group-hover:bg-red-100'
                                : isWeekend 
                                  ? 'bg-gray-100 border-gray-200 group-hover:bg-gray-150' 
                                  : 'bg-white border-gray-100 group-hover:bg-gray-50'
                            } ${isToday ? 'border-x-2 border-[#FF79C9]' : ''} ${
                              isCurrentUser && !absence ? 'bg-blue-50/30 group-hover:bg-blue-50/50' : ''
                            }`}
                            style={{ width: '45px', minWidth: '45px' }}
                          >
                            {absence && (
                              <AbsenceCell absence={absence} locale={locale} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Absence Cell Component with Tooltip
function AbsenceCell({ absence, locale }: { absence: any; locale: string }) {
  const bgColor = getAbsenceColor(absence.type);
  const label = getAbsenceLabel(absence.type, locale);
  const statusLabel = absence.status === 'approved' 
    ? (locale === 'de' ? 'Genehmigt' : 'Approved')
    : (locale === 'de' ? 'Gemeldet' : 'Reported');

  return (
    <div className="relative group">
      <div className={`h-8 rounded ${bgColor} cursor-pointer transition-opacity hover:opacity-80`} />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 shadow-lg">
        <div className="font-medium">{label}</div>
        <div className="text-gray-300">{statusLabel}</div>
        {absence.destinationCountry && (
          <div className="text-gray-300">→ {absence.destinationCountry}</div>
        )}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

// Helper functions
function getAbsenceColor(type: AbsenceType): string {
  switch (type) {
    case 'vacation':
      return 'bg-emerald-500';
    case 'sick':
    case 'sick_child':
      return 'bg-rose-500';
    case 'work_remote_abroad':
      return 'bg-blue-500';
    case 'business_trip':
      return 'bg-amber-500';
    default:
      return 'bg-gray-400';
  }
}

function getAbsenceLabel(type: AbsenceType, locale: string): string {
  const labels: Record<AbsenceType, { de: string; en: string }> = {
    vacation: { de: 'Urlaub', en: 'Vacation' },
    sick: { de: 'Krank', en: 'Sick' },
    sick_child: { de: 'Kind krank', en: 'Sick child' },
    work_remote_abroad: { de: 'Workation', en: 'Workation' },
    business_trip: { de: 'Dienstreise', en: 'Business trip' },
  };

  return locale === 'de' ? labels[type].de : labels[type].en;
}
