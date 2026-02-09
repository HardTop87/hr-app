import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Asset, AssetHistoryEntry } from '../types/asset';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentCompany } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (currentCompany?.id) {
      loadAssets();
    }
  }, [currentCompany?.id]);

  const loadAssets = async () => {
    if (!currentCompany?.id) return;

    try {
      const assetsRef = collection(db, 'assets');
      const q = query(assetsRef, where('companyId', '==', currentCompany.id));
      const snapshot = await getDocs(q);
      
      const loadedAssets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Asset[];

      setAssets(loadedAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error(t('assets.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addAsset = async (data: Omit<Asset, 'id' | 'createdAt' | 'history' | 'companyId'>, adminId: string) => {
    if (!currentCompany?.id) return;

    try {
      const initialHistory: AssetHistoryEntry = {
        date: new Date().toISOString(),
        action: 'created',
        note: t('assets.history.created'),
        performedBy: adminId
      };

      const newAsset = {
        ...data,
        companyId: currentCompany.id,
        createdAt: Date.now(),
        history: [initialHistory],
        assignedToUserId: data.assignedToUserId || null,
        assignedDate: data.assignedDate || null
      };

      await addDoc(collection(db, 'assets'), newAsset);
      await loadAssets();
      toast.success(t('assets.success.created'));
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error(t('assets.errors.createFailed'));
      throw error;
    }
  };

  const assignAsset = async (assetId: string, userId: string, adminId: string, note?: string) => {
    try {
      const assetRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetRef);
      
      if (!assetDoc.exists()) {
        throw new Error('Asset not found');
      }

      const currentAsset = assetDoc.data() as Asset;

      // Get user details for history note
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userName = userDoc.exists() ? 
        userDoc.data().displayName : 
        userId;

      const historyEntry: AssetHistoryEntry = {
        date: new Date().toISOString(),
        action: 'assigned',
        userId: userId,
        note: note || t('assets.history.assignedTo', { user: userName }),
        performedBy: adminId
      };

      await updateDoc(assetRef, {
        assignedToUserId: userId,
        assignedDate: new Date().toISOString(),
        status: 'assigned',
        history: [...currentAsset.history, historyEntry]
      });

      await loadAssets();
      toast.success(t('assets.success.assigned'));
    } catch (error) {
      console.error('Error assigning asset:', error);
      toast.error(t('assets.errors.assignFailed'));
      throw error;
    }
  };

  const returnAsset = async (assetId: string, adminId: string, conditionNote: string) => {
    if (!conditionNote.trim()) {
      toast.error(t('assets.errors.noteRequired'));
      return;
    }

    try {
      const assetRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetRef);
      
      if (!assetDoc.exists()) {
        throw new Error('Asset not found');
      }

      const currentAsset = assetDoc.data() as Asset;

      const historyEntry: AssetHistoryEntry = {
        date: new Date().toISOString(),
        action: 'returned',
        userId: currentAsset.assignedToUserId || undefined,
        note: conditionNote,
        performedBy: adminId
      };

      await updateDoc(assetRef, {
        assignedToUserId: null,
        assignedDate: null,
        status: 'in_stock',
        history: [...currentAsset.history, historyEntry]
      });

      await loadAssets();
      toast.success(t('assets.success.returned'));
    } catch (error) {
      console.error('Error returning asset:', error);
      toast.error(t('assets.errors.returnFailed'));
      throw error;
    }
  };

  const reportDefect = async (assetId: string, adminId: string, note: string) => {
    if (!note.trim()) {
      toast.error(t('assets.errors.noteRequired'));
      return;
    }

    try {
      const assetRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetRef);
      
      if (!assetDoc.exists()) {
        throw new Error('Asset not found');
      }

      const currentAsset = assetDoc.data() as Asset;

      const historyEntry: AssetHistoryEntry = {
        date: new Date().toISOString(),
        action: 'status_change',
        note: note,
        performedBy: adminId
      };

      await updateDoc(assetRef, {
        status: 'broken',
        history: [...currentAsset.history, historyEntry]
      });

      await loadAssets();
      toast.success(t('assets.success.defectReported'));
    } catch (error) {
      console.error('Error reporting defect:', error);
      toast.error(t('assets.errors.defectFailed'));
      throw error;
    }
  };

  const updateAssetDetails = async (
    assetId: string, 
    data: Partial<Omit<Asset, 'id' | 'history' | 'companyId' | 'createdAt'>>, 
    adminId: string
  ) => {
    try {
      const assetRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetRef);
      
      if (!assetDoc.exists()) {
        throw new Error('Asset not found');
      }

      const currentAsset = assetDoc.data() as Asset;

      const historyEntry: AssetHistoryEntry = {
        date: new Date().toISOString(),
        action: 'edit',
        note: t('assets.history.updated'),
        performedBy: adminId
      };

      await updateDoc(assetRef, {
        ...data,
        history: [...currentAsset.history, historyEntry]
      });

      await loadAssets();
      toast.success(t('assets.success.updated'));
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error(t('assets.errors.updateFailed'));
      throw error;
    }
  };

  const retireAsset = async (assetId: string, adminId: string, reason: string) => {
    try {
      const assetRef = doc(db, 'assets', assetId);
      const assetDoc = await getDoc(assetRef);
      
      if (!assetDoc.exists()) {
        throw new Error('Asset not found');
      }

      const currentAsset = assetDoc.data() as Asset;

      const historyEntry: AssetHistoryEntry = {
        date: new Date().toISOString(),
        action: 'status_change',
        note: reason,
        performedBy: adminId
      };

      await updateDoc(assetRef, {
        status: 'retired',
        assignedToUserId: null,
        assignedDate: null,
        history: [...currentAsset.history, historyEntry]
      });

      await loadAssets();
      toast.success(t('assets.success.retired'));
    } catch (error) {
      console.error('Error retiring asset:', error);
      toast.error(t('assets.errors.retireFailed'));
      throw error;
    }
  };

  return {
    assets,
    loading,
    addAsset,
    assignAsset,
    returnAsset,
    reportDefect,
    updateAssetDetails,
    retireAsset,
    reload: loadAssets
  };
};

// Hook for user-specific assets (employee view)
export const useUserAssets = (userId: string | null) => {
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Real-time listener for user's assigned assets
    const assetsRef = collection(db, 'assets');
    const q = query(assetsRef, where('assignedToUserId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedAssets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Asset[];

        setUserAssets(loadedAssets);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading user assets:', error);
        toast.error(t('assets.errors.loadFailed'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, t]);

  return { userAssets, loading };
};
