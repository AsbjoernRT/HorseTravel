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

// Create a new vehicle
export const createVehicle = async (vehicleData, mode = 'private', organizationId = null) => {
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

      // Check if member can create vehicles
      if (!memberPermissions.canManageVehicles && !orgSettings.allowMembersToCreateVehicles) {
        throw new Error('Du har ikke tilladelse til at oprette køretøjer i denne organisation');
      }
    }

    const vehicle = {
      ...vehicleData,
      ownerId: user.uid,
      ownerType: mode,
      organizationId: mode === 'organization' ? organizationId : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const vehicleRef = await addDoc(collection(db, 'vehicles'), vehicle);
    return { id: vehicleRef.id, ...vehicle };
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

// Get vehicle by ID
export const getVehicle = async (vehicleId) => {
  try {
    const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
    if (!vehicleDoc.exists()) {
      throw new Error('Køretøj ikke fundet');
    }
    return { id: vehicleDoc.id, ...vehicleDoc.data() };
  } catch (error) {
    console.error('Error getting vehicle:', error);
    throw error;
  }
};

// Get vehicles for current user/organization
export const getVehicles = async (mode = 'private', organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    let q;
    if (mode === 'private') {
      q = query(
        collection(db, 'vehicles'),
        where('ownerId', '==', user.uid),
        where('ownerType', '==', 'private'),
        orderBy('createdAt', 'desc')
      );
    } else if (mode === 'organization' && organizationId) {
      q = query(
        collection(db, 'vehicles'),
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
    console.error('Error getting vehicles:', error);
    throw error;
  }
};

// Update vehicle
export const updateVehicle = async (vehicleId, updates) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Get vehicle to check ownership
    const vehicle = await getVehicle(vehicleId);

    // Check permissions
    if (vehicle.ownerType === 'private') {
      if (vehicle.ownerId !== user.uid) {
        throw new Error('Du har ikke tilladelse til at opdatere dette køretøj');
      }
    } else if (vehicle.ownerType === 'organization') {
      const memberDoc = await getDoc(
        doc(db, 'organizations', vehicle.organizationId, 'members', user.uid)
      );
      if (!memberDoc.exists() || !memberDoc.data().permissions.canManageVehicles) {
        throw new Error('Du har ikke tilladelse til at opdatere dette køretøj');
      }
    }

    await updateDoc(doc(db, 'vehicles', vehicleId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { id: vehicleId, ...vehicle, ...updates };
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

// Delete vehicle
export const deleteVehicle = async (vehicleId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Get vehicle to check ownership
    const vehicle = await getVehicle(vehicleId);

    // Check permissions
    if (vehicle.ownerType === 'private') {
      if (vehicle.ownerId !== user.uid) {
        throw new Error('Du har ikke tilladelse til at slette dette køretøj');
      }
    } else if (vehicle.ownerType === 'organization') {
      const memberDoc = await getDoc(
        doc(db, 'organizations', vehicle.organizationId, 'members', user.uid)
      );
      if (!memberDoc.exists() || !memberDoc.data().permissions.canManageVehicles) {
        throw new Error('Du har ikke tilladelse til at slette dette køretøj');
      }
    }

    await deleteDoc(doc(db, 'vehicles', vehicleId));
    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};
