import { storage, db, auth } from '../../config/firebase';
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

    // Prepare custom metadata for Storage
    const customMetadata = {
      entityType,
      entityId,
      uploadedBy: auth.currentUser?.uid || 'unknown',
      certificateType: metadata.certificateType || 'unknown',
    };

    // Add extracted data summary to metadata (Storage has size limits, so only key info)
    if (metadata.extractedData) {
      customMetadata.hasExtractedData = 'true';
      customMetadata.companyName = metadata.extractedData.company?.name || '';
      customMetadata.authNumber = metadata.extractedData.authorisation?.authorisation_number || '';
      customMetadata.journeyType = metadata.extractedData.authorisation?.journey_type || '';
      customMetadata.expiryDate = metadata.extractedData.authorisation?.expiry_date || '';
      customMetadata.issueDate = metadata.extractedData.authorisation?.issue_date || '';
    }

    // Upload to Firebase Storage with metadata
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, {
      contentType: file.type || file.mimeType || 'application/octet-stream',
      customMetadata,
    });

    console.log('[certificateService] Uploaded with custom metadata:', customMetadata);

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
      uploadedBy: auth.currentUser?.uid,
      ...metadata,
    };

    console.log('[certificateService] Saving certificate to Firestore:', {
      fileName: file.name,
      entityType,
      entityId,
      hasExtractedData: !!metadata.extractedData,
    });

    const docRef = await addDoc(collection(db, 'certificates'), certificateData);

    console.log('[certificateService] Certificate saved with ID:', docRef.id);

    if (metadata.extractedData) {
      console.log('[certificateService] Extracted data stored:', {
        company: metadata.extractedData.company?.name,
        authNumber: metadata.extractedData.authorisation?.authorisation_number,
        expiryDate: metadata.extractedData.authorisation?.expiry_date,
      });
    }

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

/**
 * Updates certificate with extracted data
 * @param {string} certificateId - ID of the certificate document
 * @param {Object} data - Extracted certificate data and metadata
 * @returns {Promise<void>}
 */
export const updateCertificateData = async (certificateId, data) => {
  try {
    const docRef = doc(db, 'certificates', certificateId);

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    console.log('[certificateService] Certificate data updated:', {
      id: certificateId,
      hasExtractedData: data.hasExtractedData,
      extractionMethod: data.extractionMethod,
      certificateType: data.certificateType,
    });
  } catch (error) {
    console.error('Error updating certificate data:', error);
    throw new Error(`Kunne ikke opdatere certifikatdata: ${error.message}`);
  }
};
