import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Plus, 
  FileText, 
  X, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Ban,
  Plane,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  useMyAbsences, 
  requestAbsence, 
  cancelAbsence, 
  getAbsenceStats,
  calculateWorkingDays,
  type RequestAbsenceData,
  type AbsenceStats 
} from '../hooks/useAbsences';
import type { AbsenceType, Absence } from '../types/absence';
import toast from 'react-hot-toast';

export default function Absences() {
  const { t, i18n } = useTranslation();
  const { user, userProfile, currentCompany } = useAuth();
  const { absences, isLoading } = useMyAbsences(user?.uid, currentCompany.id);
  
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState<AbsenceStats>({
    vacationTotal: 30,
    vacationTaken: 0,
    vacationPlanned: 0,
    vacationRemaining: 30,
    sickDaysSelf: 0,
    sickDaysChild: 0,
  });

  // Calculate stats when absences change
  useEffect(() => {
    if (absences) {
      getAbsenceStats(userProfile, absences).then(setStats);
    }
  }, [absences, userProfile]);

  const locale = i18n.language === 'de' ? 'de' : 'en';

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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#FF79C9]/20">
        <div className="bg-[#FFEFF8] px-4 md:px-6 py-3 md:py-4 border-b border-[#FF79C9]/20">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold text-[#4D2B41] flex items-center gap-2">
              <Calendar className="w-5 h-5 md:w-6 md:h-6" />
              {t('absences.title')}
            </h1>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#FF79C9] text-white px-4 py-2 rounded-lg hover:bg-[#ff5eb8] transition-colors font-medium text-sm md:text-base"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t('absences.newRequest')}</span>
              <span className="sm:hidden">{t('absences.new')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vacation Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#1E4947]/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#1E4947]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#4D2B41]">{t('absences.vacationAccount')}</h3>
              <p className="text-sm text-gray-600">{new Date().getFullYear()}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-[#1E4947] mb-1">
                {stats.vacationRemaining} {t('absences.days')}
              </div>
              <p className="text-sm text-gray-600">{t('absences.available')}</p>
            </div>
            
            <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('absences.total')}:</span>
                <span className="font-medium">{stats.vacationTotal} {t('absences.days')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('absences.taken')}:</span>
                <span className="font-medium text-green-600">{stats.vacationTaken} {t('absences.days')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('absences.planned')}:</span>
                <span className="font-medium text-orange-600">{stats.vacationPlanned} {t('absences.days')}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-[#1E4947]"
                  style={{ width: `${(stats.vacationTaken / stats.vacationTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sick Days Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#4D2B41]">{t('absences.sickDays')}</h3>
              <p className="text-sm text-gray-600">{new Date().getFullYear()}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {stats.sickDaysSelf} {t('absences.days')}
              </div>
              <p className="text-sm text-gray-600">{t('absences.sickSelf')}</p>
            </div>
            
            {stats.sickDaysChild > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('absences.sickChild')}:</span>
                  <span className="text-2xl font-bold text-orange-600">{stats.sickDaysChild} {t('absences.days')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Absences List */}
      <div className="bg-white rounded-lg shadow-sm border border-[#FF79C9]/20">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-[#4D2B41]">{t('absences.myRequests')}</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {absences.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>{t('absences.noAbsences')}</p>
            </div>
          ) : (
            absences.map((absence) => (
              <AbsenceCard 
                key={absence.id} 
                absence={absence} 
                locale={locale}
                onCancel={() => {
                  cancelAbsence(absence.id, absence.status)
                    .then(() => toast.success(t('absences.requestCancelled')))
                    .catch((err) => toast.error(err.message));
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && user && (
        <AbsenceModal
          userId={user.uid}
          companyId={currentCompany.id}
          stats={stats}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Absence Card Component
function AbsenceCard({ 
  absence, 
  locale,
  onCancel 
}: { 
  absence: Absence; 
  locale: string;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  
  const getTypeInfo = (type: AbsenceType) => {
    switch (type) {
      case 'vacation':
        return { label: t('absences.type.vacation'), icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'sick':
        return { label: t('absences.type.sick'), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };
      case 'sick_child':
        return { label: t('absences.type.sick_child'), icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'work_remote_abroad':
        return { label: t('absences.type.remote'), icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'business_trip':
        return { label: t('absences.type.business_trip'), icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50' };
    }
  };

  const getStatusBadge = (status: Absence['status']) => {
    switch (status) {
      case 'requested':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">{t('absences.status.requested')}</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1"><CheckCircle size={12} />{t('absences.status.approved')}</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded flex items-center gap-1"><XCircle size={12} />{t('absences.status.rejected')}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded flex items-center gap-1"><Ban size={12} />{t('absences.status.cancelled')}</span>;
    }
  };

  const typeInfo = getTypeInfo(absence.type);
  const Icon = typeInfo.icon;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 ${typeInfo.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${typeInfo.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-[#4D2B41]">{typeInfo.label}</h3>
              {getStatusBadge(absence.status)}
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                {new Date(absence.startDate).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { 
                  day: '2-digit', 
                  month: 'short' 
                })}
                {' - '}
                {new Date(absence.endDate).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { 
                  day: '2-digit', 
                  month: 'short',
                  year: 'numeric'
                })}
                {' • '}
                <span className="font-medium">{absence.workingDays} {t('absences.card.workingDays')}</span>
              </p>
              
              {absence.destinationCountry && (
                <p className="flex items-center gap-1">
                  <Plane size={14} />
                  {absence.destinationCountry}
                  <span className="text-xs text-orange-600">{t('absenceManager.a1Required')}</span>
                </p>
              )}
              
              {absence.certificateUrl && (
                <p className="flex items-center gap-1 text-blue-600">
                  <FileText size={14} />
                  {t('absenceManager.certificateAvailable')}
                </p>
              )}
              
              {absence.note && (
                <p className="text-xs italic">{absence.note}</p>
              )}
              
              {absence.rejectedReason && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle size={12} />
                  {absence.rejectedReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {absence.status === 'requested' && (
          <button
            onClick={onCancel}
            className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
            title={t('absences.card.cancel')}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// Absence Request Modal
function AbsenceModal({ 
  userId, 
  companyId,
  stats,
  onClose 
}: { 
  userId: string; 
  companyId: string;
  stats: AbsenceStats;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RequestAbsenceData>({
    type: 'vacation',
    startDate: '',
    endDate: '',
    note: '',
    destinationCountry: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [workingDays, setWorkingDays] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate working days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = calculateWorkingDays(formData.startDate, formData.endDate);
      setWorkingDays(days);
    } else {
      setWorkingDays(0);
    }
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate) {
      toast.error(t('absences.errors.fillAllFields'));
      return;
    }

    try {
      setIsSaving(true);
      await requestAbsence(userId, companyId, formData, file || undefined, stats);
      toast.success(t('absences.success.requested'));
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('absences.errors.fillAllFields'));
    } finally {
      setIsSaving(false);
    }
  };

  const absenceTypes: { value: AbsenceType; label: string; description: string }[] = [
    { value: 'vacation', label: t('absences.type.vacation'), description: t('absences.typeDescriptions.vacation') },
    { value: 'sick', label: t('absences.type.sick'), description: t('absences.typeDescriptions.sick') },
    { value: 'sick_child', label: t('absences.type.sick_child'), description: t('absences.typeDescriptions.sick_child') },
    { value: 'work_remote_abroad', label: t('absences.type.remote'), description: t('absences.typeDescriptions.remote') },
    { value: 'business_trip', label: t('absences.type.business_trip'), description: t('absences.typeDescriptions.business_trip') },
  ];

  const showFileUpload = formData.type === 'sick' || formData.type === 'sick_child';
  const showCountryInput = formData.type === 'work_remote_abroad';
  const isVacationOverLimit = formData.type === 'vacation' && workingDays > stats.vacationRemaining;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#FFEFF8] border-b border-[#FF79C9]/20 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#4D2B41]">{t('absences.modal.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#4D2B41] hover:bg-[#1E4947]/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-[#4D2B41] mb-2">
              {t('absences.modal.type')} *
            </label>
            <div className="space-y-2">
              {absenceTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.type === type.value
                      ? 'border-[#FF79C9] bg-[#FFEFF8]/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AbsenceType })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#4D2B41]">{type.label}</div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                {t('absences.modal.startDate')} *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                {t('absences.modal.endDate')} *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9]"
                required
              />
            </div>
          </div>

          {/* Working Days Display */}
          {workingDays > 0 && (
            <div className={`p-3 rounded-lg ${isVacationOverLimit ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <p className={`text-sm ${isVacationOverLimit ? 'text-red-800' : 'text-blue-800'}`}>
                {t('absences.modal.calculatedDays', { days: workingDays })}
                {formData.type === 'vacation' && (
                  <>
                    {' • '}
                    {isVacationOverLimit ? (
                      <span className="text-red-600 font-medium">{t('absences.errors.notEnoughVacation')}</span>
                    ) : (
                      <span>{t('absences.modal.remainingAfter', { days: stats.vacationRemaining - workingDays })}</span>
                    )}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Country Input (for work_remote_abroad) */}
          {showCountryInput && (
            <div>
              <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                {t('absences.modal.destinationCountry')} * <span className="text-xs text-orange-600">{t('absences.modal.forA1')}</span>
              </label>
              <input
                type="text"
                value={formData.destinationCountry}
                onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                placeholder={t('absences.modal.countryPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9]"
                required
              />
            </div>
          )}

          {/* File Upload (for sick/sick_child) */}
          {showFileUpload && (
            <div>
              <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                {t('absences.modal.certificate')} <span className="text-xs text-gray-600">{t('absences.modal.certificateOptional')}</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#FF79C9] transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {file ? (
                    <p className="text-sm text-[#4D2B41] font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">{t('absences.modal.uploadFile')}</p>
                      <p className="text-xs text-gray-500">{t('absences.modal.uploadHint')}</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-[#4D2B41] mb-1">
              {t('absences.modal.reason')}
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder={t('absences.modal.reasonPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-[#4D2B41] hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('absences.modal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.startDate || !formData.endDate || isVacationOverLimit}
            className="px-6 py-2 bg-[#1E4947] text-white rounded-lg hover:bg-[#163935] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('absences.modal.submitting')}
              </>
            ) : (
              t('absences.modal.submit')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
