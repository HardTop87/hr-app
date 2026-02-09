import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../types/user';

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get('invite');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    validateInvite();
  }, [inviteId]);

  const validateInvite = async () => {
    if (!inviteId) {
      setError(t('signup.invalidInvite'));
      setLoading(false);
      return;
    }

    try {
      const inviteRef = doc(db, 'users', inviteId);
      const inviteDoc = await getDoc(inviteRef);

      if (!inviteDoc.exists()) {
        setError(t('signup.invalidInvite'));
        setLoading(false);
        return;
      }

      const data = inviteDoc.data() as UserProfile;

      if (data.status === 'active') {
        setError(t('signup.alreadyRegistered'));
        setLoading(false);
        return;
      }

      if (data.status !== 'invited') {
        setError(t('signup.invalidInvite'));
        setLoading(false);
        return;
      }

      setInviteData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error validating invite:', error);
      setError(t('signup.errorLoadingInvite'));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteData || !inviteId) {
      toast.error(t('signup.invalidInvite'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('signup.passwordTooShort'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('signup.passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);

    try {
      // Create Firebase Auth user with email from invite
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        inviteData.email,
        formData.password
      );

      const user = userCredential.user;

      // Update display name in Firebase Auth
      await updateProfile(user, {
        displayName: inviteData.displayName,
      });

      // Create new user document with the auth UID
      const newUserDoc: UserProfile = {
        ...inviteData,
        uid: user.uid,
        status: 'active',
        ...(user.photoURL && { photoURL: user.photoURL }),
      };

      await setDoc(doc(db, 'users', user.uid), newUserDoc);

      // Delete the old invite document
      await deleteDoc(doc(db, 'users', inviteId));

      toast.success(t('signup.accountCreated'));
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error: any) {
      console.error('Error creating account:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error(t('signup.emailAlreadyInUse'));
      } else if (error.code === 'auth/weak-password') {
        toast.error(t('signup.passwordTooWeak'));
      } else {
        toast.error(t('signup.errorCreatingAccount'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cococo-moss via-cococo-berry to-cococo-moss flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-cococo-pig animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('signup.validatingInvite')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cococo-moss via-cococo-berry to-cococo-moss flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('signup.errorTitle')}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-cococo-pig text-white rounded-lg hover:bg-cococo-pig/90"
          >
            {t('signup.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cococo-moss via-cococo-berry to-cococo-moss flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('signup.welcome')}
          </h1>
          <p className="text-gray-600">
            {t('signup.createAccount')}
          </p>
        </div>

        {/* Invite Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">{t('signup.name')}:</span>{' '}
              <span className="text-gray-900">{inviteData?.displayName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">{t('signup.email')}:</span>{' '}
              <span className="text-gray-900">{inviteData?.email}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">{t('signup.jobTitle')}:</span>{' '}
              <span className="text-gray-900">{inviteData?.jobTitle || '-'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">{t('signup.employeeId')}:</span>{' '}
              <span className="text-gray-900">{inviteData?.employeeId || '-'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('signup.password')} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-pig focus:border-transparent pr-12"
                placeholder={t('signup.passwordPlaceholder')}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('signup.passwordHint')}
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('signup.confirmPassword')} *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cococo-pig focus:border-transparent pr-12"
                placeholder={t('signup.confirmPasswordPlaceholder')}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-cococo-pig text-white rounded-lg hover:bg-cococo-pig/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('signup.creating')}
              </>
            ) : (
              t('signup.createAccount')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-cococo-pig hover:underline"
          >
            {t('signup.alreadyHaveAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
