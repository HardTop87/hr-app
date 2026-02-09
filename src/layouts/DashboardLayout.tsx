import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Settings as SettingsIcon, Languages, Building2, User, Bell, Check, FileText, Calendar, ClipboardCheck, CalendarRange, UserPlus, UsersRound, Banknote, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { COMPANIES } from '../types/user';
import { useState, useRef, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentCompany, switchCompany, userProfile } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyDisplayName, setCompanyDisplayName] = useState<string>(currentCompany.name);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load company logo and name
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', currentCompany.id));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          setCompanyLogo(data.info?.logoURL || null);
          setCompanyDisplayName(data.name || currentCompany.name);
        }
      } catch (error) {
        console.error('Error loading company info:', error);
        setCompanyLogo(null);
        setCompanyDisplayName(currentCompany.name);
      }
    };

    loadCompanyInfo();
  }, [currentCompany.id, currentCompany.name]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const navigation = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard, key: 'dashboard' },
    { name: t('employees'), href: '/employees', icon: Users, key: 'employees' },
    { name: t('time_tracking'), href: '/time-tracking', icon: Clock, key: 'time_tracking' },
    { name: 'Abwesenheiten', href: '/absences', icon: Calendar, key: 'absences' },
    { name: i18n.language === 'de' ? 'Team Kalender' : 'Team Calendar', href: '/calendar', icon: CalendarRange, key: 'calendar' },
    { name: t('documents_title'), href: '/documents', icon: FileText, key: 'documents' },
  ];
  
  // Admin-only navigation
  const adminNavigation = (userProfile?.role === 'global_admin' || userProfile?.role === 'company_admin') ? [
    { name: i18n.language === 'de' ? 'Anträge verwalten' : 'Manage Requests', href: '/absences/manager', icon: ClipboardCheck, key: 'absence_manager' },
    { name: i18n.language === 'de' ? 'Onboarding' : 'Onboarding', href: '/onboarding/admin', icon: UserPlus, key: 'onboarding' },
    { name: i18n.language === 'de' ? 'Benutzerverwaltung' : 'User Management', href: '/admin/users', icon: UsersRound, key: 'user_management' },
    { name: i18n.language === 'de' ? 'Lohnbuchhaltung' : 'Payroll', href: '/admin/payroll', icon: Banknote, key: 'payroll' },
    { name: i18n.language === 'de' ? 'Inventar' : 'Assets', href: '/admin/assets', icon: Monitor, key: 'assets' },
    { name: t('company_settings'), href: '/admin/settings', icon: SettingsIcon, key: 'company_settings' },
  ] : [];

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
    setShowNotifications(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Visual styling based on current company
  const companyStyles = {
    triple_c: { color: 'bg-blue-600', border: 'border-cococo-pig' },
    cococo: { color: 'bg-purple-600', border: 'border-cococo-moss' },
  };

  const currentStyle = companyStyles[currentCompany.id as keyof typeof companyStyles] || companyStyles.triple_c;

  // Get notification type color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'error':
        return 'bg-red-50 border-l-4 border-red-500';
      default:
        return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-cococo-berry text-cococo-peach fixed h-full flex flex-col">
        {/* Company Switcher - Only for global_admin */}
        {userProfile?.role === 'global_admin' && (
          <div className="p-4 border-b border-cococo-moss/30 flex-shrink-0">
            <label className="text-xs text-cococo-peach/60 block mb-2">
              {t('switch_company')}
            </label>
            <select
              value={currentCompany.id}
              onChange={(e) => switchCompany(e.target.value)}
              className="w-full px-3 py-2 bg-cococo-moss border border-cococo-moss rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cococo-pig text-white"
            >
              {COMPANIES.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Company Logo */}
        <div className="p-4 border-b border-cococo-moss/30 flex-shrink-0">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {companyLogo ? (
              <div className="relative bg-white">
                <img 
                  src={companyLogo} 
                  alt={companyDisplayName}
                  className="w-full h-20 object-contain p-3"
                />
              </div>
            ) : (
              <div className={`${currentStyle.color} p-4 flex items-center justify-center h-20`}>
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="bg-white px-3 py-2 text-center border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {companyDisplayName}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation - Scrollable */}
        <nav className="flex-1 mt-2 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.key}
                to={item.href}
                className={`flex items-center px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-cococo-pig text-cococo-berry border-r-4 border-cococo-pig'
                    : 'text-cococo-peach/70 hover:bg-cococo-moss hover:text-cococo-peach'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
          
          {/* Admin Navigation */}
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.key}
                to={item.href}
                className={`flex items-center px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-cococo-pig text-cococo-berry border-r-4 border-cococo-pig'
                    : 'text-cococo-peach/70 hover:bg-cococo-moss hover:text-cococo-peach'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile Link at Bottom */}
        <div className="border-t border-cococo-moss/30 p-4">
          <Link
            to="/profile"
            className={`flex items-center px-6 py-3 text-sm transition-colors rounded-md ${
              location.pathname === '/profile'
                ? 'bg-cococo-pig text-cococo-berry'
                : 'text-cococo-peach/70 hover:bg-cococo-moss hover:text-cococo-peach'
            }`}
          >
            <User className="w-5 h-5 mr-3" />
            {t('my_profile')}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header - Fixed */}
        <header className={`bg-white border-b-2 ${currentStyle.border} h-16 flex items-center justify-between px-8 transition-colors sticky top-0 z-40`}>
          <h2 className="text-xl font-condensed font-bold text-cococo-berry">
            {t('hr_management_system')}
          </h2>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-cococo-berry hover:bg-cococo-peach rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {/* Badge Logic */}
                {unreadCount > 0 && (
                  unreadCount === 1 ? (
                    // Just a red dot for 1 unread
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                  ) : (
                    // Red circle with number for 2+
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full px-1">
                      {unreadCount}
                    </span>
                  )
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-cococo-peach">
                    <h3 className="font-semibold text-cococo-berry">{t('notifications')}</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-cococo-pig hover:underline flex items-center gap-1"
                      >
                        <Check size={14} />
                        {t('mark_all_read')}
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto max-h-[500px]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">{t('no_notifications')}</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !notification.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className={`p-3 rounded-lg ${getNotificationColor(notification.type)}`}>
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium text-sm text-gray-900">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-cococo-berry" />
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="px-3 py-1.5 border border-cococo-pig rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cococo-pig"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

