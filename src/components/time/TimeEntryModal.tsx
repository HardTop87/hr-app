import { useState } from 'react';
import { X, Trash2, Clock, Save, Minus, Info, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { addManualEntry, deleteEntry } from '../../hooks/useTimeTracking';
import { formatDateDisplay, calculateDailyDuration, formatDuration, formatTime } from '../../lib/timeUtils';
import type { TimeEntry } from '../../types/time';
import toast from 'react-hot-toast';

interface TimeEntryModalProps {
  date: string;
  entries: TimeEntry[];
  userId: string;
  onClose: () => void;
}

export default function TimeEntryModal({ date, entries, userId, onClose }: TimeEntryModalProps) {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    type: 'work' as 'work' | 'break',
    startTime: '',
    endTime: '',
    note: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Get current locale
  const locale = i18n.language === 'de' ? 'de' : 'en';

  const result = calculateDailyDuration(entries, userProfile);
  const { gross, takenBreak, explicitBreak, deductedBreak, net, isCompliant } = result;

  const isContractor = userProfile?.employmentType === 'contractor';
  const isGerman = userProfile?.holidayRegion?.startsWith('de-');
  const isUK = userProfile?.holidayRegion === 'en-uk';

  // Show break card only if user has explicitly taken breaks OR system deducted time
  const showBreakCard = explicitBreak > 0 || deductedBreak > 0;

  const handleDelete = async (entryId: string) => {
    if (!confirm(t('timeentry_btn_delete') + '?')) return;

    try {
      await deleteEntry(entryId);
      toast.success(t('timeentry_deleted'));
    } catch (error) {
      toast.error(t('timeentry_error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startTime || !formData.endTime) {
      toast.error(t('timeentry_start_time') + ' & ' + t('timeentry_end_time'));
      return;
    }

    if (!formData.note.trim()) {
      toast.error(t('timeentry_notes'));
      return;
    }

    try {
      setIsSaving(true);

      // Convert time strings to timestamps
      const startTimestamp = new Date(`${date}T${formData.startTime}:00`).getTime();
      const endTimestamp = new Date(`${date}T${formData.endTime}:00`).getTime();

      if (endTimestamp <= startTimestamp) {
        toast.error(t('timeentry_error'));
        return;
      }

      await addManualEntry(
        userId,
        date,
        formData.type,
        startTimestamp,
        endTimestamp,
        formData.note
      );

      toast.success(t('timeentry_saved'));
      setFormData({ type: 'work', startTime: '', endTime: '', note: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error(t('timeentry_error'));
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="px-6 py-4 bg-[#FFEFF8] border-b border-[#FF79C9]/20 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-[#4D2B41]">{t('timetracking_title')}</h2>
            <p className="text-sm text-[#1E4947]">{formatDateDisplay(date, locale)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#4D2B41] hover:bg-[#1E4947]/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Daily Summary */}
          <div>
            <div className={`grid gap-4 ${showBreakCard ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="bg-[#1E4947]/5 rounded-lg p-4">
                <div className="text-xs text-[#1E4947] mb-1">
                  {t('timeentry_net_work')}
                </div>
                <div className={`text-2xl font-bold ${
                  isGerman && deductedBreak > 0 ? 'text-orange-600' : 'text-[#1E4947]'
                }`}>
                  {formatDuration(isContractor ? gross : net, locale)}
                </div>
                {!isContractor && gross !== net && (
                  <div className="text-xs text-gray-500 mt-1">
                    {t('timeentry_duration')}: {formatDuration(gross, locale)}
                  </div>
                )}
              </div>
              {showBreakCard && (
                <div className="bg-[#FF79C9]/5 rounded-lg p-4">
                  <div className="text-xs text-[#FF79C9] mb-1">{t('timeentry_breaks')}</div>
                  <div className="text-2xl font-bold text-[#FF79C9]">
                    {formatDuration(takenBreak, locale)}
                  </div>
                  {isGerman && deductedBreak > 0 && (
                    <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <Minus className="w-3 h-3" />
                      +{formatDuration(deductedBreak, locale)} auto
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Compliance Warnings */}
            {!isContractor && (
              <div className="mt-3">
                {isGerman && deductedBreak > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-orange-800">
                      {t('timeentry_mandatory_break_de')}
                    </p>
                  </div>
                )}
                {isUK && !isCompliant && gross > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <Info className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">
                      {t('timeentry_mandatory_break_uk')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Existing Entries */}
          <div>
            <h3 className="font-semibold text-[#4D2B41] mb-3 flex items-center gap-2">
              <Clock size={18} />
              {t('timeentry_title_edit')} ({entries.length})
            </h3>

            {entries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">{t('timetracking_no_entries')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const duration = entry.endTime 
                    ? Math.floor((entry.endTime - entry.startTime) / 60000)
                    : 0;
                  
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-white border border-[#1E4947]/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-2 h-2 rounded-full ${
                          entry.type === 'work' ? 'bg-[#1E4947]' : 'bg-[#FF79C9]'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-[#4D2B41]">
                              {formatTime(entry.startTime, locale)}
                              {' - '}
                              {entry.endTime 
                                ? formatTime(entry.endTime, locale)
                                : '...'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              entry.type === 'work' 
                                ? 'bg-[#1E4947]/10 text-[#1E4947]' 
                                : 'bg-[#FF79C9]/10 text-[#FF79C9]'
                            }`}>
                              {entry.type === 'work' ? t('timeclock_start_work') : t('timeclock_start_break')}
                            </span>
                            <span className="text-gray-600">
                              {formatDuration(duration, locale)}
                            </span>
                          </div>
                          {entry.isManual && entry.note && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              📝 {entry.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('timeentry_btn_delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Entry Button / Form */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#FF79C9] text-white px-4 py-3 rounded-lg hover:bg-[#ff5eb8] transition-colors font-medium"
            >
              <Clock size={18} />
              {t('timeentry_title_add')}
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 bg-[#FFEFF8]/50 p-4 rounded-lg border border-[#FF79C9]/30">
              <h3 className="font-semibold text-[#4D2B41]">{t('timeentry_title_add')}</h3>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                  {t('documents_table_type')} *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'work' | 'break' })}
                  className="w-full px-3 py-2 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
                >
                  <option value="work">{t('timeclock_start_work')}</option>
                  <option value="break">{t('timeclock_start_break')}</option>
                </select>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                    {t('timeentry_start_time')} *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                    {t('timeentry_end_time')} *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
                    required
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                  {t('timeentry_notes')} *
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder={t('timeentry_notes_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setFormData({ type: 'work', startTime: '', endTime: '', note: '' });
                  }}
                  className="flex-1 px-4 py-2 text-[#4D2B41] hover:bg-[#1E4947]/5 rounded-lg transition-colors"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1E4947] text-white px-4 py-2 rounded-lg hover:bg-[#163935] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {t('btn_save')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1E4947]/5 border-t border-[#1E4947]/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#4D2B41] text-white rounded-lg hover:bg-[#3d1f33] transition-colors font-medium"
          >
            {t('btn_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
