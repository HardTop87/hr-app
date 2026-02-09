import { useState, useRef } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db, auth } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ProfilePictureUploadProps {
  currentPhotoURL?: string;
  displayName: string;
  userId: string;
}

export default function ProfilePictureUpload({
  currentPhotoURL,
  displayName,
  userId,
}: ProfilePictureUploadProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.pictureUpload.invalidFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.pictureUpload.fileTooLarge'));
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setSelectedFile(file);
      setShowPreviewModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelPreview = () => {
    setShowPreviewModal(false);
    setPreviewImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedFile || !auth.currentUser) return;

    setIsUploading(true);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile_pictures/${userId}`);
      await uploadBytes(storageRef, selectedFile);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        photoURL: downloadURL,
      });

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });

      toast.success(t('profile.pictureUpload.success'));
      
      // Close modal and reset
      setShowPreviewModal(false);
      setPreviewImage(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload page to show new photo
      window.location.reload();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(t('profile.pictureUpload.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = () => {
    fileInputRef.current?.click();
  };

  // Get initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Profile Picture Display with Edit Overlay */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#FF79C9] to-[#FF1493] flex items-center justify-center ring-4 ring-white shadow-lg">
          {currentPhotoURL ? (
            <img
              src={currentPhotoURL}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-white">{initials}</span>
          )}
        </div>

        {/* Edit Overlay on Hover */}
        <button
          onClick={handleEditClick}
          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <Camera className="w-8 h-8 text-white" />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('profile.pictureUpload.previewTitle')}
              </h3>
              <button
                onClick={handleCancelPreview}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Image */}
            <div className="flex justify-center mb-6">
              <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-100 ring-4 ring-[#FF79C9]/20">
                {previewImage && (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelPreview}
                disabled={isUploading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSavePhoto}
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-[#FF79C9] text-white rounded-lg hover:bg-[#FF1493] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t('common.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
