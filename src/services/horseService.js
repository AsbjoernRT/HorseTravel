import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Create a new horse
export const createHorse = async (horseData, mode = 'private', organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // If organization mode, check permissions
    if (mode === 'organization' && organizationId) {
      const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', user.uid));
      if (!memberDoc.exists()) {
        throw new Error('Du er ikke medlem af denne organisation');
      }

      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      const orgSettings = orgDoc.data()?.settings || {};
      const memberPermissions = memberDoc.data()?.permissions || {};

      // Check if member can create horses
      if (!memberPermissions.canManageHorses && !orgSettings.allowMembersToCreateHorses) {
        throw new Error('Du har ikke tilladelse til at oprette heste i denne organisation');
      }
    }

    const horse = {
      ...horseData,
      ownerId: user.uid,
      ownerType: mode,
      organizationId: mode === 'organization' ? organizationId : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const horseRef = await addDoc(collection(db, 'horses'), horse);
    return { id: horseRef.id, ...horse };
  } catch (error) {
    console.error('Error creating horse:', error);
    throw error;
  }
};

// Get horse by ID
export const getHorse = async (horseId) => {
  try {
    const horseDoc = await getDoc(doc(db, 'horses', horseId));
    if (!horseDoc.exists()) {
      throw new Error('Hest ikke fundet');
    }
    return { id: horseDoc.id, ...horseDoc.data() };
  } catch (error) {
    console.error('Error getting horse:', error);
    throw error;
  }
};

// Get horses for current user/organization
export const getHorses = async (mode = 'private', organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    let q;
    if (mode === 'private') {
      q = query(
        collection(db, 'horses'),
        where('ownerId', '==', user.uid),
        where('ownerType', '==', 'private'),
        orderBy('createdAt', 'desc')
      );
    } else if (mode === 'organization' && organizationId) {
      q = query(
        collection(db, 'horses'),
        where('organizationId', '==', organizationId),
        where('ownerType', '==', 'organization'),
        orderBy('createdAt', 'desc')
      );
    } else {
      throw new Error('Invalid mode or missing organizationId');
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting horses:', error);
    throw error;
  }
};

// Update horse
export const updateHorse = async (horseId, updates) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Get horse to check ownership
    const horse = await getHorse(horseId);

    // Check permissions
    if (horse.ownerType === 'private') {
      if (horse.ownerId !== user.uid) {
        throw new Error('Du har ikke tilladelse til at opdatere denne hest');
      }
    } else if (horse.ownerType === 'organization') {
      const memberDoc = await getDoc(
        doc(db, 'organizations', horse.organizationId, 'members', user.uid)
      );
      if (!memberDoc.exists() || !memberDoc.data().permissions.canManageHorses) {
        throw new Error('Du har ikke tilladelse til at opdatere denne hest');
      }
    }

    await updateDoc(doc(db, 'horses', horseId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { id: horseId, ...horse, ...updates };
  } catch (error) {
    console.error('Error updating horse:', error);
    throw error;
  }
};

// Delete horse
export const deleteHorse = async (horseId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Get horse to check ownership
    const horse = await getHorse(horseId);

    // Check permissions
    if (horse.ownerType === 'private') {
      if (horse.ownerId !== user.uid) {
        throw new Error('Du har ikke tilladelse til at slette denne hest');
      }
    } else if (horse.ownerType === 'organization') {
      const memberDoc = await getDoc(
        doc(db, 'organizations', horse.organizationId, 'members', user.uid)
      );
      if (!memberDoc.exists() || !memberDoc.data().permissions.canManageHorses) {
        throw new Error('Du har ikke tilladelse til at slette denne hest');
      }
    }

    await deleteDoc(doc(db, 'horses', horseId));
    return true;
  } catch (error) {
    console.error('Error deleting horse:', error);
    throw error;
  }
};
