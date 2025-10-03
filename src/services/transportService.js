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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * Create a new transport
 * @param {Object} transportData - Transport data
 * @param {string} mode - 'private' or 'organization'
 * @param {string} organizationId - Organization ID (if mode is 'organization')
 * @returns {Promise<Object>} Created transport
 */
export const createTransport = async (transportData, mode = 'private', organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    const transport = {
      ...transportData,
      ownerId: user.uid,
      ownerType: mode,
      organizationId: mode === 'organization' ? organizationId : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'transports'), transport);

    return { id: docRef.id, ...transportData };
  } catch (error) {
    console.error('Error creating transport:', error);
    throw error;
  }
};

/**
 * Get all transports for current context (private or organization)
 * @param {string} mode - 'private' or 'organization'
 * @param {string} organizationId - Organization ID (if mode is 'organization')
 * @returns {Promise<Array>} List of transports
 */
export const getTransports = async (mode = 'private', organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    let q;
    if (mode === 'organization' && organizationId) {
      q = query(
        collection(db, 'transports'),
        where('ownerType', '==', 'organization'),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'transports'),
        where('ownerType', '==', 'private'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting transports:', error);
    throw error;
  }
};

/**
 * Get a single transport by ID
 * @param {string} transportId - Transport ID
 * @returns {Promise<Object>} Transport data
 */
export const getTransport = async (transportId) => {
  try {
    const docRef = doc(db, 'transports', transportId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Transport ikke fundet');
    }

    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('Error getting transport:', error);
    throw error;
  }
};

/**
 * Update transport
 * @param {string} transportId - Transport ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateTransport = async (transportId, updates) => {
  try {
    const docRef = doc(db, 'transports', transportId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating transport:', error);
    throw error;
  }
};

/**
 * Delete transport
 * @param {string} transportId - Transport ID
 * @returns {Promise<void>}
 */
export const deleteTransport = async (transportId) => {
  try {
    await deleteDoc(doc(db, 'transports', transportId));
  } catch (error) {
    console.error('Error deleting transport:', error);
    throw error;
  }
};

/**
 * Get transports by status
 * @param {string} status - Transport status (planned, active, completed, cancelled)
 * @param {string} mode - 'private' or 'organization'
 * @param {string} organizationId - Organization ID (if mode is 'organization')
 * @returns {Promise<Array>} List of transports
 */
export const getTransportsByStatus = async (status, mode = 'private', organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    let q;
    if (mode === 'organization' && organizationId) {
      q = query(
        collection(db, 'transports'),
        where('ownerType', '==', 'organization'),
        where('organizationId', '==', organizationId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'transports'),
        where('ownerType', '==', 'private'),
        where('ownerId', '==', user.uid),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting transports by status:', error);
    throw error;
  }
};
