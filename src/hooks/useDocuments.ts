import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { GlobalDocument, PersonalDocument, DocCategory } from '../types/document';
import toast from 'react-hot-toast';

// Hook für globale Firmendokumente
export const useGlobalDocuments = (companyId: string) => {
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'company_documents'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: GlobalDocument[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as GlobalDocument);
        });
        setDocuments(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading global documents:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  return { documents, loading };
};

// Hook für persönliche Dokumente eines Users
export const usePersonalDocuments = (userId: string) => {
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', userId, 'documents'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: PersonalDocument[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as PersonalDocument);
        });
        setDocuments(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading personal documents:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { documents, loading };
};

// Upload globales Dokument (nur Admins)
export const uploadGlobalDocument = async (
  file: File,
  title: string,
  category: DocCategory,
  companyId: string,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    // Validierung
    if (file.size > 10 * 1024 * 1024) {
      // 10MB Limit
      throw new Error('Datei zu groß. Maximale Größe: 10MB');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `documents/global/${companyId}/${category}/${timestamp}_${sanitizedFileName}`;

    // Upload zu Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    // Speichere Metadaten in Firestore
    await addDoc(collection(db, 'company_documents'), {
      title,
      category,
      url: downloadURL,
      companyId,
      createdAt: timestamp,
      createdBy: userId,
      createdByName: userName,
      size: file.size,
      type: file.type,
      fileName: file.name,
      storagePath,
    });

    toast.success('Dokument erfolgreich hochgeladen');
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

// Lösche globales Dokument
export const deleteGlobalDocument = async (
  documentId: string,
  storagePath: string
): Promise<void> => {
  try {
    // Lösche aus Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // Lösche aus Firestore
    await deleteDoc(doc(db, 'company_documents', documentId));

    toast.success('Dokument erfolgreich gelöscht');
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Formatiere Dateigröße
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Get File Icon basierend auf MIME type
export const getFileIcon = (type: string): string => {
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
  if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
  if (type.includes('image')) return '🖼️';
  if (type.includes('zip') || type.includes('compressed')) return '📦';
  return '📎';
};
