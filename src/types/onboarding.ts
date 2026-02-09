export type TaskRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface OnboardingTemplate {
  id: string;
  title: string; // z.B. "Developer Onboarding"
  type: 'onboarding' | 'offboarding'; // Type of process
  steps: {
    title: string;
    role: TaskRole; // Wer muss es tun?
    description?: string;
  }[];
  createdAt?: number;
  createdBy?: string;
  deleted?: boolean; // Soft delete
}

export interface OnboardingTask {
  id: string;
  title: string;
  description?: string;
  role: TaskRole;
  completed: boolean;
  completedBy?: string; // User ID
  completedAt?: number; // Timestamp
}

export interface OnboardingProcess {
  id: string;
  userId: string; // Der neue Mitarbeiter / Der austretende Mitarbeiter
  templateId: string;
  title: string;
  type: 'onboarding' | 'offboarding'; // Type of process
  startDate: string;
  status: 'active' | 'completed';
  tasks: OnboardingTask[];
  progress: number; // 0-100%
  createdAt?: number;
}
