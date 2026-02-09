import type { DocumentCategory } from './user';

export type DocCategory = 'policy' | 'handbook' | 'template' | 'general';

// Globales Dokument (für alle Mitarbeiter)
export interface GlobalDocument {
  id: string;
  title: string;
  category: DocCategory;
  url: string; // Storage URL
  companyId: string;
  createdAt: number;
  createdBy: string; // Admin ID
  createdByName: string; // Admin Name
  size: number; // Bytes
  type: string; // MIME type (application/pdf etc.)
  fileName: string; // Original filename
}

// Persönliches Dokument (Mitarbeiterakte)
export interface PersonalDocument {
  id: string;
  title: string;
  category: string;
  url: string;
  createdAt: string; // ISO Date
  uploadedBy?: string;
  uploadedByName?: string;
  size?: number;
  type?: string;
  fileName?: string;
}

// Bestehendes Interface für Kompatibilität
export interface AppDocument {
  id: string;
  userId: string; // Wem gehört das Dokument?
  uploadedBy: string; // Wer hat es hochgeladen? (UID)
  title: string;
  category: DocumentCategory;
  storagePath: string; // Pfad im Storage Bucket
  downloadUrl: string;
  createdAt: number;
  size: number;
  contentType: string;
}

