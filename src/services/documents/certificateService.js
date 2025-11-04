import { storage, db } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, getDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

/**
 * Uploads a certificate file to Firebase Storage and stores metadata in Firestore
 * @param {Object} file - File object with uri, name, type, size
 * @param {string} entityType - 'organization' or 'vehicle'
 * @param {string} entityId - ID of the organization or vehicle
 * @param {Object} metadata - Additional metadata (certificateType, expiryDate, etc.)
 * @returns {Promise<Object>} Certificate document with download URL
 */
export const uploadCertificate = async (file, entityType, entityId, metadata = {}) => {
  try {
    if (!file || !file.uri) {
      throw new Error('Invalid file');
    }

    if (!entityType || !entityId) {
      throw new Error('Entity type and ID are required');
    }

    // Create a unique file path
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storagePath = `certificates/${entityType}/${entityId}/${fileName}`;

    // Convert URI to blob for upload
    const response = await fetch(file.uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, {
      contentType: file.type || file.mimeType || 'application/octet-stream',
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Save metadata to Firestore
    const certificateData = {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || file.mimeType,
      storagePath,
      downloadURL,
      entityType,
      entityId,
      uploadedAt: serverTimestamp(),
      ...metadata,
    };

    const docRef = await addDoc(collection(db, 'certificates'), certificateData);

    return {
      id: docRef.id,
      ...certificateData,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error('Error uploading certificate:', error);
    throw new Error(`Upload fejlede: ${error.message}`);
  }
};

/**
 * Gets all certificates for an entity
 * @param {string} entityType - 'organization' or 'vehicle'
 * @param {string} entityId - ID of the organization or vehicle
 * @returns {Promise<Array>} Array of certificate documents
 */
export const getCertificates = async (entityType, entityId) => {
  try {
    const q = query(
      collection(db, 'certificates'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('uploadedAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      uploadedAt: docSnap.data().uploadedAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error getting certificates:', error);
    throw error;
  }
};

/**
 * Deletes a certificate file and its metadata
 * @param {string} certificateId - ID of the certificate document
 * @returns {Promise<void>}
 */
export const deleteCertificate = async (certificateId) => {
  try {
    // Get certificate data
    const docRef = doc(db, 'certificates', certificateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Certificate not found');
    }

    const certificateData = docSnap.data();
    const { storagePath } = certificateData;

    // Delete from Storage
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }

    // Delete from Firestore
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting certificate:', error);
    throw new Error(`Sletning fejlede: ${error.message}`);
  }
};

/**
 * Updates certificate metadata
 * @param {string} certificateId - ID of the certificate document
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateCertificateMetadata = async (certificateId, updates) => {
  try {
    const docRef = doc(db, 'certificates', certificateId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating certificate:', error);
    throw error;
  }
};
