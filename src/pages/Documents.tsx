import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  useGlobalDocuments,
  usePersonalDocuments,
  uploadGlobalDocument,
  deleteGlobalDocument,
  formatFileSize,
  getFileIcon,
} from '../hooks/useDocuments';
import type { DocCategory } from '../types/document';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Filter,
  FolderOpen,
  File,
  X,
  Search,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabId = 'company' | 'personal';

export default function Documents() {
  const { t, i18n } = useTranslation();
  const { currentCompany, user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('company');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string; title: string; fileName: string } | null>(null);

  // Hooks
  const { documents: globalDocs, loading: globalLoading } = useGlobalDocuments(
    currentCompany.id
  );
  const { documents: personalDocs, loading: personalLoading } =
    usePersonalDocuments(user?.uid || '');

  const isAdmin =
    userProfile?.role === 'global_admin' || userProfile?.role === 'company_admin';

  // Filter globale Dokumente
  const filteredGlobalDocs = globalDocs.filter((doc) => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter persönliche Dokumente
  const filteredPersonalDocs = personalDocs.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories: { id: DocCategory | 'all'; label: string }[] = [
    { id: 'all', label: t('documents.categories.all') },
    { id: 'policy', label: t('documents.categories.policy') },
    { id: 'handbook', label: t('documents.categories.handbook') },
    { id: 'template', label: t('documents.categories.template') },
    { id: 'general', label: t('documents.categories.general') },
  ];

  const handleDelete = async (docId: string, storagePath: string) => {
    if (!confirm(t('documents.confirmDelete'))) return;

    try {
      await deleteGlobalDocument(docId, storagePath);
    } catch (error) {
      toast.error(t('documents.errors.deleteFailed'));
    }
  };

  const canPreview = (type: string): boolean => {
    return type.includes('pdf') || type.includes('image');
  };

  const handlePreview = (doc: { url: string; type: string; title: string; fileName: string }) => {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-cococo-berry" />
            {t('documents_title')}
          </h1>
          <p className="text-gray-600 mt-2">{t('documents.description')}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'company'
                  ? 'border-cococo-berry text-cococo-berry'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FolderOpen className="w-5 h-5 inline mr-2" />
              {t('documents.tabs.company')}
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'personal'
                  ? 'border-cococo-berry text-cococo-berry'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <File className="w-5 h-5 inline mr-2" />
              {t('documents.tabs.personal')}
            </button>
          </nav>
        </div>

        {/* Company Documents Tab */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-5 h-5 text-gray-500" />
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-cococo-berry text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search & Upload */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('documents.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
                  />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cococo-berry text-white rounded-lg hover:bg-cococo-moss transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-5 h-5" />
                    {t('documents.upload')}
                  </button>
                )}
              </div>
            </div>

            {/* Documents Grid */}
            {globalLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cococo-berry"></div>
              </div>
            ) : filteredGlobalDocs.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('documents.empty.title')}
                </h3>
                <p className="text-gray-500 mb-6">{t('documents.empty.description')}</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cococo-berry text-white rounded-lg hover:bg-cococo-moss transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    {t('documents.uploadFirst')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGlobalDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{getFileIcon(doc.type)}</div>
                      <div className="flex items-center gap-2">
                        {canPreview(doc.type) && (
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('documents.preview')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-cococo-berry hover:bg-cococo-peach rounded-lg transition-colors"
                          title={t('documents.download')}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.url)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('documents.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{doc.fileName}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {t(`documents.categories.${doc.category}`)}
                      </span>
                      <span>{formatFileSize(doc.size)}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      {t('documents.uploadedBy')}: {doc.createdByName}
                      <br />
                      {new Date(doc.createdAt).toLocaleDateString(
                        i18n.language === 'de' ? 'de-DE' : 'en-US'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personal Documents Tab */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('documents.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
              />
            </div>

            {/* Documents List */}
            {personalLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cococo-berry"></div>
              </div>
            ) : filteredPersonalDocs.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('documents.emptyPersonal.title')}
                </h3>
                <p className="text-gray-500">{t('documents.emptyPersonal.description')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {filteredPersonalDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-3xl">
                          {getFileIcon(doc.type || 'application/pdf')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {doc.category && (
                              <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs mr-2">
                                {doc.category}
                              </span>
                            )}
                            {new Date(doc.createdAt).toLocaleDateString(
                              i18n.language === 'de' ? 'de-DE' : 'en-US'
                            )}
                            {doc.size && ` • ${formatFileSize(doc.size)}`}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 text-cococo-berry hover:bg-cococo-peach rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        {t('documents.download')}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            companyId={currentCompany.id}
            userId={user?.uid || ''}
            userName={userProfile?.displayName || 'Admin'}
          />
        )}

        {/* Preview Modal */}
        {showPreviewModal && previewDoc && (
          <PreviewModal
            doc={previewDoc}
            onClose={() => {
              setShowPreviewModal(false);
              setPreviewDoc(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Upload Modal Component
function UploadModal({
  onClose,
  companyId,
  userId,
  userName,
}: {
  onClose: () => void;
  companyId: string;
  userId: string;
  userName: string;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocCategory>('general');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error(t('documents.errors.requiredFields'));
      return;
    }

    setUploading(true);
    try {
      await uploadGlobalDocument(file, title, category, companyId, userId, userName);
      toast.success(t('documents.success.uploaded'));
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('documents.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-cococo-berry" />
            {t('documents.uploadDocument')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('documents.form.title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
              placeholder={t('documents.form.titlePlaceholder')}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('documents.form.category')} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
            >
              <option value="general">{t('documents.categories.general')}</option>
              <option value="policy">{t('documents.categories.policy')}</option>
              <option value="handbook">{t('documents.categories.handbook')}</option>
              <option value="template">{t('documents.categories.template')}</option>
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('documents.form.file')} *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-berry focus:border-transparent"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('documents.form.fileHint')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-cococo-berry text-white rounded-lg hover:bg-cococo-moss transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? t('documents.uploading') : t('documents.upload')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Preview Modal
function PreviewModal({
  doc,
  onClose,
}: {
  doc: { url: string; type: string; title: string; fileName: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  
  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 bg-black/50 p-4 rounded-t-lg">
          <div className="text-white">
            <h3 className="font-semibold text-lg">{doc.title}</h3>
            <p className="text-sm text-gray-300">{doc.fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Preview Content */}
        <div className="flex-1 bg-white rounded-lg overflow-hidden">
          {doc.type.includes('pdf') ? (
            <iframe
              src={`${doc.url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full"
              title={doc.title}
            />
          ) : doc.type.includes('image') ? (
            <div className="w-full h-full flex items-center justify-center p-4 bg-gray-100">
              <img
                src={doc.url}
                alt={doc.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : null}
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-center gap-3 mt-4">
          <a
            href={doc.url}
            download
            className="flex items-center gap-2 bg-cococo-berry text-white px-6 py-3 rounded-lg hover:bg-cococo-moss transition-colors"
          >
            <Download size={20} />
            <span>{t('documents.download')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
