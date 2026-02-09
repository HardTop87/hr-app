export interface AppNotification {
  id: string;
  userId: string; // Empfänger
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: number; // Timestamp
  link?: string; // Optional, z.B. '/requests/123'
}
