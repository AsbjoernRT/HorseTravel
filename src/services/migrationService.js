import { doc, getDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Normalizes legacy user documents so the organization features can rely on consistent fields
 * This should be called when a user logs in and their profile is missing fields.
 */
export const migrateUserProfile = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log('User document does not exist, skipping migration');
      return false;
    }

    const userData = userDoc.data();
    const updates = {};

    // Add missing fields
    if (userData.activeMode === undefined) {
      updates.activeMode = 'private';
    }
    if (userData.activeOrganizationId === undefined) {
      updates.activeOrganizationId = null;
    }
    if (userData.profileComplete === undefined) {
      // If user has displayName, profile is complete
      updates.profileComplete = userData.displayName ? true : false;
    }
    if (userData.updatedAt === undefined) {
      updates.updatedAt = new Date().toISOString();
    }

    // Migrate organizationIds field if missing
    if (userData.organizationIds === undefined) {
      // Find all organizations where user is a member or owner
      const organizationIds = [];

      // Get organizations where user is owner 
      const ownedOrgsQuery = query(
        collection(db, 'organizations'),
        where('ownerId', '==', userId)
      );
      const ownedOrgsSnapshot = await getDocs(ownedOrgsQuery);
      ownedOrgsSnapshot.forEach((doc) => {
        organizationIds.push(doc.id);
      });

      updates.organizationIds = organizationIds;
    }

    // Only update if there are changes to make 
    if (Object.keys(updates).length > 0) {
      await updateDoc(userDocRef, updates);
      console.log('User profile migrated successfully', updates);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error migrating user profile:', error);
    return false;
  }
};
