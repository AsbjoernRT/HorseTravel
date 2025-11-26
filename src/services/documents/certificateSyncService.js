import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Syncs extracted vehicle certificate data to vehicle profile
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} extractedData - Extracted vehicle certificate data
 * @returns {Promise<void>}
 */
export const syncCertificateToVehicle = async (vehicleId, extractedData) => {
  try {
    console.log('[certificateSync] Syncing vehicle certificate data to vehicle:', vehicleId);

    if (!extractedData) {
      console.log('[certificateSync] No extracted data to sync');
      return;
    }

    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      console.warn('[certificateSync] Vehicle not found');
      return;
    }

    const updateData = {
      'vehicleCertificate': {
        ...extractedData,
        lastUpdated: serverTimestamp(),
        source: 'ai_extraction',
      },
      updatedAt: serverTimestamp(),
    };

    // Also update direct vehicle fields if available
    if (extractedData.vehicle) {
      if (extractedData.vehicle.registration_number) {
        updateData.licensePlate = extractedData.vehicle.registration_number;
      }
      if (extractedData.vehicle.vin) {
        updateData.vin = extractedData.vehicle.vin;
      }
      if (extractedData.vehicle.make) {
        updateData.make = extractedData.vehicle.make;
      }
      if (extractedData.vehicle.model) {
        updateData.model = extractedData.vehicle.model;
      }
    }

    await updateDoc(vehicleRef, updateData);

    console.log('[certificateSync] Vehicle certificate data synced successfully');
  } catch (error) {
    console.error('[certificateSync] Error syncing vehicle certificate data:', error);
    throw error;
  }
};

/**
 * Syncs extracted certificate data to organization profile
 * @param {string} organizationId - Organization ID
 * @param {Object} extractedData - Extracted certificate data
 * @returns {Promise<void>}
 */
export const syncCertificateToOrganization = async (organizationId, extractedData) => {
  try {
    console.log('[certificateSync] Syncing data to organization:', organizationId);

    if (!extractedData) {
      console.log('[certificateSync] No extracted data to sync');
      return;
    }

    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      console.warn('[certificateSync] Organization not found');
      return;
    }

    const updateData = {
      'companyAuthorization': {
        ...extractedData,
        lastUpdated: serverTimestamp(),
        source: 'ai_extraction',
      },
      updatedAt: serverTimestamp(),
    };

    // Also store in a separate authorizations subcollection for history
    const authRef = doc(db, 'organizations', organizationId, 'authorizations', extractedData.authorisation?.authorisation_number || `auth_${Date.now()}`);

    await Promise.all([
      updateDoc(orgRef, updateData),
      updateDoc(authRef, {
        ...extractedData,
        createdAt: serverTimestamp(),
        status: 'active',
      }).catch(async (error) => {
        // If document doesn't exist, create it
        if (error.code === 'not-found') {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(authRef, {
            ...extractedData,
            createdAt: serverTimestamp(),
            status: 'active',
          });
        } else {
          throw error;
        }
      }),
    ]);

    console.log('[certificateSync] Successfully synced to organization');

    // Check for expiry warnings
    if (extractedData.authorisation?.expiry_date) {
      const expiryDate = new Date(extractedData.authorisation.expiry_date);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
        console.warn(`[certificateSync] Authorization expires in ${daysUntilExpiry} days!`);
      } else if (daysUntilExpiry <= 0) {
        console.error('[certificateSync] Authorization has expired!');
      }
    }
  } catch (error) {
    console.error('[certificateSync] Error syncing to organization:', error);
    // Don't throw - syncing is optional
  }
};

/**
 * Gets organization authorization data
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object|null>}
 */
export const getOrganizationAuthorization = async (organizationId) => {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      return null;
    }

    return orgDoc.data().companyAuthorization || null;
  } catch (error) {
    console.error('[certificateSync] Error getting authorization:', error);
    return null;
  }
};

/**
 * Gets all authorizations for an organization (history)
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>}
 */
export const getOrganizationAuthorizationHistory = async (organizationId) => {
  try {
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore');

    const authsRef = collection(db, 'organizations', organizationId, 'authorizations');
    const q = query(authsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastUpdated: doc.data().lastUpdated?.toDate(),
    }));
  } catch (error) {
    console.error('[certificateSync] Error getting authorization history:', error);
    return [];
  }
};

/**
 * Validates if authorization is still valid
 * @param {Object} authorization - Authorization data
 * @returns {Object} Validation result
 */
export const validateAuthorization = (authorization) => {
  const warnings = [];
  const errors = [];

  if (!authorization) {
    errors.push('No authorization data found');
    return { isValid: false, warnings, errors };
  }

  // Check expiry date
  if (authorization.authorisation?.expiry_date) {
    const expiryDate = new Date(authorization.authorisation.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      errors.push('Authorization has expired');
    } else if (daysUntilExpiry < 30) {
      warnings.push(`Authorization expires in ${daysUntilExpiry} days`);
    } else if (daysUntilExpiry < 90) {
      warnings.push(`Authorization expires in ${daysUntilExpiry} days (consider renewal)`);
    }
  } else {
    warnings.push('No expiry date found in authorization');
  }

  // Check required fields
  if (!authorization.authorisation?.authorisation_number) {
    errors.push('Missing authorization number');
  }

  if (!authorization.authorisation?.journey_type) {
    warnings.push('Journey type not specified');
  }

  if (!authorization.company?.name) {
    warnings.push('Company name not found');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    daysUntilExpiry: authorization.authorisation?.expiry_date
      ? Math.floor((new Date(authorization.authorisation.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null,
  };
};
