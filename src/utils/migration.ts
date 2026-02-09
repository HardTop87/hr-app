/**
 * Database Migration Utility: Sensitive Data Split
 * Moves sensitive user data from flat users/{uid} document to users/{uid}/sensitive/data subcollection
 */

import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteField 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types/user';

/**
 * List of sensitive fields to move to subcollection
 */
const SENSITIVE_FIELDS = [
  'address',
  'bankDetails',
  'taxDetails',
  'personalDetails',
  'startDate',
  'probationEndDate',
  'weeklyHours',
  'vacationEntitlement',
] as const;

interface MigrationResult {
  success: number;
  failed: number;
  errors: Array<{ uid: string; error: string }>;
}

/**
 * Migrate user data: Move sensitive fields to subcollection
 * 
 * Before: users/{uid} contains all data including sensitive fields
 * After:  users/{uid} contains only non-sensitive data
 *         users/{uid}/sensitive/data contains sensitive data
 */
export async function migrateUserData(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  console.log('🔄 Starting user data migration: Sensitive Data Split');
  console.log(`📦 Moving ${SENSITIVE_FIELDS.length} sensitive fields to subcollection...`);

  try {
    // 1. Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    
    console.log(`👥 Found ${totalUsers} users to migrate`);

    // 2. Process each user
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data() as UserProfile;

      try {
        // 3. Extract sensitive data
        const sensitiveData: Partial<UserProfile> = {};
        let hasSensitiveData = false;

        SENSITIVE_FIELDS.forEach((field) => {
          const value = userData[field];
          if (value !== undefined) {
            (sensitiveData as any)[field] = value;
            hasSensitiveData = true;
          }
        });

        // Skip if no sensitive data found
        if (!hasSensitiveData) {
          console.log(`⏭️  User ${uid} (${userData.email}): No sensitive data to migrate`);
          result.success++;
          continue;
        }

        // 4. Write sensitive data to subcollection
        const sensitiveDocRef = doc(db, 'users', uid, 'sensitive', 'data');
        await setDoc(sensitiveDocRef, sensitiveData, { merge: true });

        // 5. Remove sensitive fields from main document
        const updateData: Record<string, any> = {};
        SENSITIVE_FIELDS.forEach((field) => {
          if (userData[field] !== undefined) {
            updateData[field] = deleteField();
          }
        });

        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, updateData);

        console.log(`✅ User ${uid} (${userData.email}): Migrated ${Object.keys(sensitiveData).length} fields`);
        result.success++;

      } catch (error: any) {
        console.error(`❌ Error migrating user ${uid}:`, error);
        result.failed++;
        result.errors.push({
          uid,
          error: error.message || 'Unknown error',
        });
      }
    }

    // 6. Summary
    console.log('\n✨ Migration completed!');
    console.log(`✅ Success: ${result.success}/${totalUsers}`);
    console.log(`❌ Failed: ${result.failed}/${totalUsers}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(({ uid, error }) => {
        console.log(`  - User ${uid}: ${error}`);
      });
    }

  } catch (error: any) {
    console.error('💥 Critical error during migration:', error);
    throw error;
  }

  return result;
}

/**
 * Rollback migration: Move data back from subcollection to main document
 * Use this if you need to undo the migration
 */
export async function rollbackMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  console.log('🔄 Starting migration rollback: Moving data back to main document');

  try {
    // 1. Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    
    console.log(`👥 Found ${totalUsers} users to rollback`);

    // 2. Process each user
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data() as UserProfile;

      try {
        // 3. Get sensitive data from subcollection
        const sensitiveDoc = await getDocs(collection(db, 'users', uid, 'sensitive'));
        
        if (sensitiveDoc.empty) {
          console.log(`⏭️  User ${uid} (${userData.email}): No sensitive subcollection found`);
          result.success++;
          continue;
        }

        const sensitiveData = sensitiveDoc.docs[0].data();

        // 4. Move sensitive data back to main document
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, sensitiveData);

        console.log(`✅ User ${uid} (${userData.email}): Rolled back ${Object.keys(sensitiveData).length} fields`);
        result.success++;

      } catch (error: any) {
        console.error(`❌ Error rolling back user ${uid}:`, error);
        result.failed++;
        result.errors.push({
          uid,
          error: error.message || 'Unknown error',
        });
      }
    }

    // 5. Summary
    console.log('\n✨ Rollback completed!');
    console.log(`✅ Success: ${result.success}/${totalUsers}`);
    console.log(`❌ Failed: ${result.failed}/${totalUsers}`);

  } catch (error: any) {
    console.error('💥 Critical error during rollback:', error);
    throw error;
  }

  return result;
}
