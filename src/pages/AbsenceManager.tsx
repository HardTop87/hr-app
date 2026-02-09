import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  AlertCircle, 
  Plane, 
  Briefcase,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  usePendingAbsences,
  useAllAbsences,
  approveAbsence,
  rejectAbsence,
  type AbsenceWithUser,
} from '../hooks/useAbsenceManager';
import type { AbsenceType } from '../types/absence';
import toast from 'react-hot-toast';

export default function AbsenceManager() {
  const { t, i18n } = useTranslation();
  const { user, userProfile, currentCompany } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<AbsenceWithUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { absences: pendingAbsences, isLoading: loadingPending } = usePendingAbsences(currentCompany.id);
  const { absences: allAbsences, isLoading: loadingHistory } = useAllAbsences(currentCompany.id);

  const locale = i18n.language === 'de' ? 'de' : 'en';

  // Access control
  if (userProfile?.role !== 'global_admin' && userProfile?.role !== 'hr_manager') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#4D2B41] mb-2">
            {t('absenceManager.accessDenied')}
          </h2>
          <p className="text-gray-600">
            {t('absenceManager.noPermission')}
          </p>
        </div>
      </div>
    );
  }

  const handleApprove = async (absence: AbsenceWithUser) => {
    if (!user) return;

    try {
      await approveAbsence(absence.id, user.uid, absence);
      toast.success(t('absenceManager.approved'));
    } catch (error: any) {
      toast.error(error.message || t('absenceManager.errorApproving'));
    }
  };

  const handleRejectClick = (absence: AbsenceWithUser) => {
    setSelectedAbsence(absence);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!user || !selectedAbsence || !rejectReason.trim()) {
      toast.error(t('absenceManager.provideReason'));
      return;
    }

    try {
      setIsSubmitting(true);
      await rejectAbsence(selectedAbsence.id, user.uid, selectedAbsence, rejectReason);
      toast.success(t('absenceManager.rejected'));
      setShowRejectModal(false);
      setSelectedAbsence(null);
    } catch (error: any) {
      toast.error(error.message || t('absenceManager.errorRejecting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#FF79C9]/20">
        <div className="bg-[#FFEFF8] px-4 md:px-6 py-3 md:py-4 border-b border-[#FF79C9]/20">
          <h1 className="text-xl md:text-2xl font-semibold text-[#4D2B41] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
            {t('absenceManager.title')}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-[#FF79C9] border-b-2 border-[#FF79C9]'
                  : 'text-gray-600 hover:text-[#4D2B41]'
              }`}
            >
              {t('absenceManager.tabs.pending')}
              {pendingAbsences.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-[#FF79C9] text-white text-xs rounded-full">
                  {pendingAbsences.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-[#FF79C9] border-b-2 border-[#FF79C9]'
                  : 'text-gray-600 hover:text-[#4D2B41]'
              }`}
            >
              {t('absenceManager.tabs.history')}
            </button>
          </div>
        </div>

        {/* Pending Requests */}
        {activeTab === 'pending' && (
          <div className="p-4 md:p-6">
            {loadingPending ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-[#FF79C9] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingAbsences.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {t('absenceManager.noPending')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAbsences.map((absence) => (
                  <AbsenceCard
                    key={absence.id}
                    absence={absence}
                    locale={locale}
                    onApprove={() => handleApprove(absence)}
                    onReject={() => handleRejectClick(absence)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-[#FF79C9] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allAbsences.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {t('absenceManager.noHistory')}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      {t('absenceManager.employee')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      {t('absenceManager.type')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      {t('absenceManager.period')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      {t('absenceManager.workingDays')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allAbsences.map((absence) => (
                    <tr key={absence.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#1E4947] text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {absence.userAvatar}
                          </div>
                          <span className="text-sm font-medium text-[#4D2B41]">{absence.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getTypeBadge(absence.type, locale)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateRange(absence.startDate, absence.endDate, locale)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {absence.workingDays}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(absence.status, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedAbsence && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <h2 className="text-xl font-semibold text-red-900 flex items-center gap-2">
                <XCircle size={24} />
                {t('absenceManager.rejectModal.title')}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('absenceManager.rejectModal.employee')}
                </p>
                <p className="font-medium text-[#4D2B41]">{selectedAbsence.userName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('absenceManager.rejectModal.period')}
                </p>
                <p className="font-medium text-[#4D2B41]">
                  {formatDateRange(selectedAbsence.startDate, selectedAbsence.endDate, locale)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4D2B41] mb-2">
                  {t('absenceManager.rejectModal.reasonLabel')}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('absenceManager.rejectModal.reasonPlaceholder')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={isSubmitting}
                className="px-6 py-2 text-[#4D2B41] hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {t('absenceManager.rejectModal.cancel')}
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isSubmitting || !rejectReason.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('absenceManager.rejectModal.submitting')}
                  </>
                ) : (
                  <>
                    <XCircle size={18} />
                    {t('absenceManager.rejectModal.submit')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Absence Card Component
function AbsenceCard({
  absence,
  locale,
  onApprove,
  onReject,
}: {
  absence: AbsenceWithUser;
  locale: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeInfo = getTypeInfo(absence.type);
  const Icon = typeInfo.icon;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#1E4947] text-white rounded-full flex items-center justify-center text-lg font-medium">
            {absence.userAvatar}
          </div>
          <div>
            <h3 className="font-semibold text-[#4D2B41]">{absence.userName}</h3>
            <p className="text-sm text-gray-600">{absence.userEmail}</p>
          </div>
        </div>
        <div className={`px-3 py-1 ${typeInfo.bg} rounded-lg flex items-center gap-2`}>
          <Icon className={`w-4 h-4 ${typeInfo.color}`} />
          <span className={`text-sm font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 mb-4 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="font-medium">
            {formatDateRange(absence.startDate, absence.endDate, locale)}
          </span>
          <span className="text-gray-600">
            • {absence.workingDays} {locale === 'de' ? 'Arbeitstage' : 'working days'}
          </span>
        </div>

        {absence.destinationCountry && (
          <div className="flex items-center gap-2 text-sm">
            <Plane className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-purple-900">{absence.destinationCountry}</span>
            <span className="text-xs text-orange-600">
              {locale === 'de' ? '(A1-Bescheinigung erforderlich)' : '(A1 certificate required)'}
            </span>
          </div>
        )}

        {absence.certificateUrl && (
          <a
            href={absence.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <FileText className="w-4 h-4" />
            {locale === 'de' ? 'Attest ansehen' : 'View certificate'}
          </a>
        )}

        {absence.note && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-700 italic">{absence.note}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReject}
          className="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <XCircle size={18} />
          {locale === 'de' ? 'Ablehnen' : 'Reject'}
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} />
          {locale === 'de' ? 'Genehmigen' : 'Approve'}
        </button>
      </div>
    </div>
  );
}

// Helper functions
function getTypeInfo(type: AbsenceType) {
  switch (type) {
    case 'vacation':
      return { label: 'Urlaub / Vacation', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'sick':
      return { label: 'Krank / Sick', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };
    case 'sick_child':
      return { label: 'Kind krank / Sick child', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' };
    case 'work_remote_abroad':
      return { label: 'Workation', icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50' };
    case 'business_trip':
      return { label: 'Dienstreise / Business trip', icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50' };
  }
}

function getTypeBadge(type: AbsenceType, locale: string) {
  const info = getTypeInfo(type);
  const Icon = info.icon;
  const label = locale === 'de' ? info.label.split(' / ')[0] : info.label.split(' / ')[1] || info.label;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 ${info.bg} rounded text-xs font-medium ${info.color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

function getStatusBadge(status: string, locale: string) {
  const statusMap: Record<string, { label: { de: string; en: string }; class: string }> = {
    requested: { label: { de: 'Beantragt', en: 'Requested' }, class: 'bg-yellow-100 text-yellow-800' },
    approved: { label: { de: 'Genehmigt', en: 'Approved' }, class: 'bg-green-100 text-green-800' },
    rejected: { label: { de: 'Abgelehnt', en: 'Rejected' }, class: 'bg-red-100 text-red-800' },
    cancelled: { label: { de: 'Storniert', en: 'Cancelled' }, class: 'bg-gray-100 text-gray-800' },
  };

  const info = statusMap[status] || statusMap.requested;
  const label = locale === 'de' ? info.label.de : info.label.en;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${info.class}`}>
      {label}
    </span>
  );
}

function formatDateRange(start: string, end: string, locale: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const formatOptions: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: 'short',
    year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
  };

  const startStr = startDate.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', formatOptions);
  const endStr = endDate.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { 
    day: '2-digit', 
    month: 'short',
    year: 'numeric'
  });

  return `${startStr} - ${endStr}`;
}
