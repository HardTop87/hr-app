export type AssetType = 'laptop' | 'smartphone' | 'monitor' | 'peripheral' | 'other';
export type AssetStatus = 'in_stock' | 'assigned' | 'broken' | 'retired';
export type WarrantyType = 'standard' | 'extended' | 'none'; // Extended = AppleCare etc.

export interface AssetHistoryEntry {
  date: string; // ISO Timestamp
  action: 'created' | 'assigned' | 'returned' | 'status_change' | 'note' | 'edit';
  userId?: string; // Wenn relevant (z.B. zugewiesen an User X)
  note?: string; // "Displayriss", "Rückgabe ok", etc.
  performedBy: string; // Admin-ID
}

export interface Asset {
  id: string;
  identifier: string; // Inventarnummer / Tag (Muss eindeutig sein)
  serialNumber?: string; // Hersteller-Serial
  model: string; // z.B. "MacBook Pro M3"
  type: AssetType;
  status: AssetStatus;

  // Finanzen & Garantie
  purchaseDate?: string;
  purchasePrice?: number; // Netto
  warrantyType: WarrantyType;
  warrantyEndDate?: string;
  warrantyInfo?: string; // z.B. "AppleCare+ bis 2026"

  // Aktuelle Zuweisung
  assignedToUserId?: string | null;
  assignedDate?: string | null;

  // Verlauf
  history: AssetHistoryEntry[];

  companyId: string;
  createdAt: number;
}
