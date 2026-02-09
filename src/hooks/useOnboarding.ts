import { useState } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import type { OnboardingTemplate, OnboardingProcess, OnboardingTask } from '../types/onboarding';
import type { UserProfile } from '../types/user';

export const useOnboarding = () => {
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [processes, setProcesses] = useState<OnboardingProcess[]>([]);
  const [loading, setLoading] = useState(false);

  // Get all templates
  const getTemplates = async () => {
    try {
      setLoading(true);
      const templatesRef = collection(db, 'onboarding_templates');
      const q = query(templatesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const templatesData: OnboardingTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out deleted templates
        if (!data.deleted) {
          templatesData.push({ id: doc.id, ...data } as OnboardingTemplate);
        }
      });
      
      setTemplates(templatesData);
      return templatesData;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create new template
  const createTemplate = async (data: Omit<OnboardingTemplate, 'id'>) => {
    try {
      const templatesRef = collection(db, 'onboarding_templates');
      const docRef = await addDoc(templatesRef, {
        ...data,
        type: data.type || 'onboarding', // Default to onboarding for backward compatibility
        deleted: false,
        createdAt: Timestamp.now().toMillis(),
      });
      
      await getTemplates(); // Refresh list
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  };

  // Start onboarding for a user
  const startOnboarding = async (userId: string, templateId: string) => {
    try {
      // Get the template
      const templateRef = doc(db, 'onboarding_templates', templateId);
      const templateSnap = await getDoc(templateRef);
      
      if (!templateSnap.exists()) {
        throw new Error('Template not found');
      }
      
      const template = { id: templateSnap.id, ...templateSnap.data() } as OnboardingTemplate;
      
      // Create tasks from template steps
      const tasks: OnboardingTask[] = template.steps.map((step, index) => ({
        id: `task-${Date.now()}-${index}`,
        title: step.title,
        description: step.description,
        role: step.role,
        completed: false,
      }));
      
      // Create new process
      const processesRef = collection(db, 'onboarding_processes');
      const processData = {
        userId,
        templateId,
        title: template.title,
        type: template.type || 'onboarding', // Inherit type from template
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        tasks,
        progress: 0,
        createdAt: Timestamp.now().toMillis(),
      };
      
      const docRef = await addDoc(processesRef, processData);
      return docRef.id;
    } catch (error) {
      console.error('Error starting onboarding:', error);
      throw error;
    }
  };

  // Get process for a specific user
  const getProcessForUser = async (userId: string) => {
    try {
      const processesRef = collection(db, 'onboarding_processes');
      const q = query(
        processesRef,
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as OnboardingProcess;
    } catch (error) {
      console.error('Error getting process for user:', error);
      throw error;
    }
  };

  // Get all processes (Admin function)
  const getAllProcesses = async () => {
    try {
      setLoading(true);
      const processesRef = collection(db, 'onboarding_processes');
      const q = query(processesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const processesData: OnboardingProcess[] = [];
      const userIds: string[] = [];
      
      snapshot.forEach((doc) => {
        const process = { id: doc.id, ...doc.data() } as OnboardingProcess;
        processesData.push(process);
        userIds.push(process.userId);
      });
      
      // Get user data for each process
      const usersMap = new Map<string, UserProfile>();
      if (userIds.length > 0) {
        // Fetch users individually by UID to avoid permission issues
        for (const userId of userIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              usersMap.set(userId, { uid: userId, ...userDoc.data() } as UserProfile);
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
          }
        }
      }
      
      // Attach user data to processes
      const processesWithUsers = processesData.map((process) => ({
        ...process,
        user: usersMap.get(process.userId),
      }));
      
      setProcesses(processesData);
      return processesWithUsers;
    } catch (error) {
      console.error('Error getting all processes:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Complete a task
  const completeTask = async (processId: string, taskId: string, userId: string) => {
    try {
      const processRef = doc(db, 'onboarding_processes', processId);
      const processSnap = await getDoc(processRef);
      
      if (!processSnap.exists()) {
        throw new Error('Process not found');
      }
      
      const process = { id: processSnap.id, ...processSnap.data() } as OnboardingProcess;
      
      // Update the specific task
      const updatedTasks = process.tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            completed: true,
            completedBy: userId,
            completedAt: Timestamp.now().toMillis(),
          };
        }
        return task;
      });
      
      // Calculate progress
      const completedCount = updatedTasks.filter((t) => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      
      // Check if all tasks are completed
      const allCompleted = updatedTasks.every((t) => t.completed);
      const status = allCompleted ? 'completed' : 'active';
      
      // Update process
      await updateDoc(processRef, {
        tasks: updatedTasks,
        progress,
        status,
      });
      
      return { progress, status };
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  };

  // Delete template
  const deleteTemplate = async (templateId: string) => {
    try {
      const templateRef = doc(db, 'onboarding_templates', templateId);
      await updateDoc(templateRef, {
        deleted: true,
      });
      await getTemplates(); // Refresh list
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  };

  // Get my onboarding (Realtime with onSnapshot)
  const getMyOnboarding = (userId: string, callback: (process: OnboardingProcess | null) => void) => {
    try {
      const processesRef = collection(db, 'onboarding_processes');
      const q = query(
        processesRef,
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      // Return unsubscribe function
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          callback(null);
        } else {
          const doc = snapshot.docs[0];
          const process = { id: doc.id, ...doc.data() } as OnboardingProcess;
          callback(process);
        }
      }, (error) => {
        console.error('Error in onboarding snapshot:', error);
        callback(null);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error getting my onboarding:', error);
      callback(null);
      return () => {}; // Return empty unsubscribe function
    }
  };

  return {
    templates,
    processes,
    loading,
    getTemplates,
    createTemplate,
    startOnboarding,
    getProcessForUser,
    getAllProcesses,
    completeTask,
    deleteTemplate,
    getMyOnboarding,
  };
};
