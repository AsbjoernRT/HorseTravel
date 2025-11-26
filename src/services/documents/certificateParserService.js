import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../config/firebase';
import * as ImageManipulator from 'expo-image-manipulator';

const functions = getFunctions(app);

/**
 * Extracts certificate data from an image using Firebase Cloud Function
 * Automatically detects if it's a company or vehicle certificate
 * @param {string} imageUri - URI of the certificate image
 * @param {string} entityType - 'organization' or 'vehicle' to determine which extraction to use
 * @returns {Promise<Object>} Parsed certificate data
 */
export const extractCertificateData = async (imageUri, entityType = 'organization') => {
  try {
    console.log('[certificateParser] Starting extraction for:', imageUri);
    console.log('[certificateParser] Entity type:', entityType);

    // Compress and resize image before processing
    const compressedUri = await compressImage(imageUri);
    console.log('[certificateParser] Image compressed:', compressedUri);

    // Convert image to base64
    const base64Image = await imageUriToBase64(compressedUri);
    console.log('[certificateParser] Image converted to base64, length:', base64Image.length);

    // Determine which function to call based on entity type
    const functionName = entityType === 'vehicle' ? 'extractVehicleCertificate' : 'extractCertificate';
    console.log('[certificateParser] Calling Firebase Cloud Function:', functionName);

    // Call the appropriate Firebase Cloud Function with timeout
    const extractFunction = httpsCallable(functions, functionName, {
      timeout: 240000, // 4 minute timeout (Cloud Function has 5 minutes)
    });

    console.log('[certificateParser] Function callable created, sending request...');

    const result = await extractFunction({ imageBase64: base64Image });

    console.log('[certificateParser] Received response from Cloud Function');
    console.log('[certificateParser] Parsed data:', result.data);

    return result.data;
  } catch (error) {
    console.error('[certificateParser] Error extracting certificate data:', error);
    console.error('[certificateParser] Error code:', error.code);
    console.error('[certificateParser] Error message:', error.message);
    console.error('[certificateParser] Error details:', error.details);

    if (error.code === 'deadline-exceeded') {
      throw new Error('Billedet er for stort - prøv venligst med et mindre billede');
    } else if (error.code === 'not-found') {
      throw new Error('Cloud Function ikke fundet - kontakt support');
    } else if (error.code === 'internal') {
      throw new Error('AI analyse fejlede - prøv igen eller upload manuelt');
    } else {
      throw new Error(`Ekstraktion fejlede: ${error.message}`);
    }
  }
};

/**
 * Compress and resize image to reduce file size and improve processing speed
 * @param {string} uri - Image URI
 * @returns {Promise<string>} Compressed image URI
 */
const compressImage = async (uri) => {
  try {
    console.log('[certificateParser] Compressing image...');

    // Resize to max 1536x1536 (good balance between quality and size)
    // GPT-4 Vision works well with images up to 2048x2048, but smaller is faster
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 1536, // Max width
          },
        },
      ],
      {
        compress: 0.8, // High quality JPEG compression
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[certificateParser] Image compressed successfully');
    return result.uri;
  } catch (error) {
    console.error('[certificateParser] Error compressing image:', error);
    // If compression fails, return original URI
    console.warn('[certificateParser] Using original image without compression');
    return uri;
  }
};

/**
 * Convert image URI to base64
 * @param {string} uri - Image URI
 * @returns {Promise<string>} Base64 encoded image
 */
const imageUriToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Runs OCR using Firebase Cloud Function (OpenAI Vision API)
 * @param {string} uri - Image URI to process
 * @returns {Promise<{ text: string }>}
 */
export const runLocalCertificateOcr = async (uri) => {
  if (!uri) {
    throw new Error('Image URI is required for OCR');
  }

  try {
    console.log('[certificateParser][OCR] Running cloud OCR on:', uri);

    // Compress image
    const compressedUri = await compressImage(uri);

    // Convert to base64
    const base64Image = await imageUriToBase64(compressedUri);

    // Call Firebase Cloud Function
    const extractTextFunction = httpsCallable(functions, 'extractTextFromImage', {
      timeout: 60000, // 1 minute timeout
    });

    const result = await extractTextFunction({ imageBase64: base64Image });

    console.log('[certificateParser][OCR] OCR completed, text length:', result.data.text?.length);

    return {
      text: result.data.text || '',
      raw: result.data,
    };
  } catch (error) {
    console.error('[certificateParser][OCR] Cloud OCR failed:', error);
    throw error;
  }
};

/**
 * Validates the extracted certificate data
 * @param {Object} data - Extracted certificate data
 * @returns {Object} Validation result with isValid and errors
 */
export const validateCertificateData = (data) => {
  const errors = [];

  // Check required fields
  if (!data.company?.name) {
    errors.push('Company name is required');
  }

  if (!data.authorisation?.authorisation_number) {
    errors.push('Authorization number is required');
  }

  if (!data.authorisation?.journey_type || !['TYPE_1', 'TYPE_2'].includes(data.authorisation.journey_type)) {
    errors.push('Valid journey type (TYPE_1 or TYPE_2) is required');
  }

  // Validate dates
  if (data.authorisation?.issue_date && !isValidDate(data.authorisation.issue_date)) {
    errors.push('Invalid issue date format (expected YYYY-MM-DD)');
  }

  if (data.authorisation?.expiry_date && !isValidDate(data.authorisation.expiry_date)) {
    errors.push('Invalid expiry date format (expected YYYY-MM-DD)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a date string is in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean}
 */
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};
