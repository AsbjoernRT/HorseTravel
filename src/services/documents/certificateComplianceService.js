/**
 * Certificate Compliance Service
 *
 * Maps uploaded certificates to transport compliance requirements
 * Automatically checks off requirements based on available certificates
 */

import { getCertificates } from './certificateService';

/**
 * Document type mappings between certificate types and compliance requirement IDs
 */
const CERTIFICATE_TO_REQUIREMENT_MAP = {
  // Base documents
  'Hestepas': 'horse_passport',
  'Pas': 'horse_passport',
  'Passport': 'horse_passport',

  'Registreringsattest': 'registration',
  'Registration': 'registration',
  'Reg. Attest': 'registration',

  'Godkendelsescertifikat': 'approval_certificate',
  'Approval Certificate': 'approval_certificate',
  'Godkendelse': 'approval_certificate',

  'Autorisation': 'authorization',
  'Authorization': 'authorization',

  // Distance-based
  'Kompetencebevis': 'competence_certificate',
  'Competence Certificate': 'competence_certificate',

  // Border crossing
  'Traces Certifikat': 'traces_certificate',
  'Traces Certificate': 'traces_certificate',
  'Traces': 'traces_certificate',

  // Country-specific
  'Letter of Authority': 'letter_of_authority',
  'Egenförsäkran': 'egenforsäkran',
  'Selvforsikring': 'egenforsäkran',
  'Tolddokument': 'customs_document',
  'Customs Document': 'customs_document',
  'ATA-Carnet': 'ata_carnet',
  'ATA Carnet': 'ata_carnet',
  'Franske Klistermærker': 'france_stickers',
  'French Stickers': 'france_stickers',
};

/**
 * Normalize certificate type/name for matching
 */
const normalizeCertificateName = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase();
};

/**
 * Check if a certificate matches a requirement
 */
const certificateMatchesRequirement = (certificate, requirementId) => {
  const certType = certificate.certificateType || certificate.displayName || certificate.fileName || '';
  const certName = certificate.displayName || certificate.fileName || '';
  const docType = certificate.documentType || ''; // User-selected document type

  // Also check extracted data for document type
  const extractedType = certificate.extractedData?.document_type || '';
  const extractedAuthType = certificate.extractedData?.authorisation?.type || '';

  // Check all possible sources for certificate type (prioritize documentType)
  const searchTerms = [docType, extractedType, certType, certName, extractedAuthType].filter(t => t && t.length > 0);

  console.log(`[certificateMatchesRequirement] Matching cert against ${requirementId}:`, {
    certId: certificate.id,
    documentType: docType,
    certificateType: certType,
    displayName: certName,
    extractedType: extractedType,
    extractedAuthType: extractedAuthType,
    searchTerms,
    hasExtractedData: !!certificate.extractedData
  });

  for (const term of searchTerms) {
    // Direct lookup in map
    if (CERTIFICATE_TO_REQUIREMENT_MAP[term] === requirementId) {
      console.log(`[certificateMatchesRequirement] ✓ Direct match: "${term}" -> ${requirementId}`);
      return true;
    }

    // Fuzzy matching for common variations
    const normalizedTerm = normalizeCertificateName(term);
    for (const [key, value] of Object.entries(CERTIFICATE_TO_REQUIREMENT_MAP)) {
      if (value === requirementId && normalizeCertificateName(key).includes(normalizedTerm)) {
        console.log(`[certificateMatchesRequirement] ✓ Fuzzy match: "${term}" matched "${key}" -> ${requirementId}`);
        return true;
      }
    }
  }

  console.log(`[certificateMatchesRequirement] ✗ No match for requirement ${requirementId}`);
  return false;
};

/**
 * Get all certificates for an organization (and optionally vehicle)
 */
export const getOrganizationCertificates = async (organizationId, vehicleId = null) => {
  try {
    const orgCerts = await getCertificates('organization', organizationId);

    let vehicleCerts = [];
    if (vehicleId) {
      vehicleCerts = await getCertificates('vehicle', vehicleId);
    }

    return [...orgCerts, ...vehicleCerts];
  } catch (error) {
    console.error('Error loading certificates:', error);
    return [];
  }
};

/**
 * Get all certificates for transport entities (organization, vehicle, and horses)
 *
 * @param {string} organizationId - Organization ID
 * @param {string} vehicleId - Vehicle ID (optional)
 * @param {Array<string>} horseIds - Array of horse IDs (optional)
 * @returns {Promise<Array>} All certificates from all entities
 */
export const getTransportCertificates = async (organizationId, vehicleId = null, horseIds = []) => {
  try {
    const allCertificates = [];

    // Get organization certificates
    if (organizationId) {
      const orgCerts = await getCertificates('organization', organizationId);
      console.log('[getTransportCertificates] Organization certificates:', {
        organizationId,
        count: orgCerts.length,
        certificates: orgCerts.map(c => ({
          id: c.id,
          fileName: c.fileName,
          documentType: c.documentType,
          certificateType: c.certificateType,
          displayName: c.displayName,
          expiryDate: c.expiryDate,
          hasExtractedData: !!c.extractedData,
          extractedDocType: c.extractedData?.document_type,
          extractedAuthType: c.extractedData?.authorisation?.type
        }))
      });
      allCertificates.push(...orgCerts);
    }

    // Get vehicle certificates
    if (vehicleId) {
      const vehicleCerts = await getCertificates('vehicle', vehicleId);
      console.log('[getTransportCertificates] Vehicle certificates:', {
        vehicleId,
        count: vehicleCerts.length,
        certificates: vehicleCerts.map(c => ({
          id: c.id,
          fileName: c.fileName,
          documentType: c.documentType,
          certificateType: c.certificateType,
          displayName: c.displayName,
          expiryDate: c.expiryDate,
          hasExtractedData: !!c.extractedData,
          extractedDocType: c.extractedData?.document_type,
          extractedAuthType: c.extractedData?.authorisation?.type
        }))
      });
      allCertificates.push(...vehicleCerts);
    }

    // Get horse certificates
    if (horseIds && horseIds.length > 0) {
      for (const horseId of horseIds) {
        const horseCerts = await getCertificates('horse', horseId);
        console.log('[getTransportCertificates] Horse certificates:', {
          horseId,
          count: horseCerts.length,
          certificates: horseCerts.map(c => ({
            id: c.id,
            fileName: c.fileName,
            documentType: c.documentType,
            certificateType: c.certificateType,
            displayName: c.displayName,
            expiryDate: c.expiryDate,
            hasExtractedData: !!c.extractedData,
            extractedDocType: c.extractedData?.document_type,
            extractedAuthType: c.extractedData?.authorisation?.type
          }))
        });
        allCertificates.push(...horseCerts);
      }
    }

    console.log('[getTransportCertificates] Total certificates found:', allCertificates.length);

    return allCertificates;
  } catch (error) {
    console.error('Error loading transport certificates:', error);
    return [];
  }
};

/**
 * Get certificates that are still valid (not expired)
 */
const getValidCertificates = (certificates) => {
  const now = new Date();

  return certificates.filter(cert => {
    // If no expiry date, consider it valid
    if (!cert.expiryDate && !cert.extractedData?.expiryDate) {
      return true;
    }

    const expiryDate = cert.expiryDate || cert.extractedData?.expiryDate;
    if (!expiryDate) return true;

    try {
      const expiry = new Date(expiryDate);
      return expiry > now;
    } catch (e) {
      // If we can't parse the date, consider it valid
      return true;
    }
  });
};

/**
 * Auto-check compliance requirements based on available certificates
 *
 * @param {Object} requirements - Compliance requirements from transportRegulationsService
 * @param {string} organizationId - Organization ID
 * @param {string} vehicleId - Vehicle ID (optional)
 * @param {Array<string>} horseIds - Horse IDs (optional)
 * @returns {Promise<Array<string>>} Array of requirement IDs that can be auto-confirmed
 */
export const getAutoConfirmedDocuments = async (requirements, organizationId, vehicleId = null, horseIds = []) => {
  if (!requirements) {
    return [];
  }

  try {
    console.log('[getAutoConfirmedDocuments] Starting certificate check:', {
      organizationId,
      vehicleId,
      horseIds,
      requirementsCount: requirements.documents?.length || 0
    });

    // Get all certificates for organization, vehicle, and horses
    const allCertificates = await getTransportCertificates(organizationId, vehicleId, horseIds);

    // Filter to only valid (non-expired) certificates
    const validCertificates = getValidCertificates(allCertificates);
    console.log('[getAutoConfirmedDocuments] Valid certificates:', {
      total: allCertificates.length,
      valid: validCertificates.length,
      expired: allCertificates.length - validCertificates.length
    });

    // Get all required document IDs from requirements
    const allRequiredDocs = [];
    requirements.documents.forEach(doc => allRequiredDocs.push(doc.id));

    // Add country-specific documents
    Object.values(requirements.countrySpecific || {}).forEach(countryReq => {
      if (countryReq.documents) {
        countryReq.documents.forEach(doc => allRequiredDocs.push(doc.id));
      }
    });

    console.log('[getAutoConfirmedDocuments] Required document IDs:', allRequiredDocs);

    // Find which requirements can be satisfied by existing certificates
    const autoConfirmed = [];

    for (const requirementId of allRequiredDocs) {
      console.log(`[getAutoConfirmedDocuments] Checking requirement: ${requirementId}`);

      const matchingCert = validCertificates.find(cert =>
        certificateMatchesRequirement(cert, requirementId)
      );

      if (matchingCert) {
        console.log(`[getAutoConfirmedDocuments] ✓ Match found for ${requirementId}:`, {
          certId: matchingCert.id,
          fileName: matchingCert.fileName,
          certificateType: matchingCert.certificateType,
          displayName: matchingCert.displayName
        });
        autoConfirmed.push(requirementId);
      } else {
        console.log(`[getAutoConfirmedDocuments] ✗ No match found for ${requirementId}`);
      }
    }

    console.log('[getAutoConfirmedDocuments] Results:', {
      totalRequired: allRequiredDocs.length,
      autoConfirmed: autoConfirmed.length,
      missing: allRequiredDocs.length - autoConfirmed.length
    });

    return autoConfirmed;
  } catch (error) {
    console.error('Error auto-checking documents:', error);
    return [];
  }
};

/**
 * Get certificate details for a specific requirement
 *
 * @param {string} requirementId - Requirement ID to find certificate for
 * @param {string} organizationId - Organization ID
 * @param {string} vehicleId - Vehicle ID (optional)
 * @param {Array<string>} horseIds - Horse IDs (optional)
 * @returns {Promise<Object|null>} Certificate object or null
 */
export const getCertificateForRequirement = async (requirementId, organizationId, vehicleId = null, horseIds = []) => {
  try {
    const allCertificates = await getTransportCertificates(organizationId, vehicleId, horseIds);
    const validCertificates = getValidCertificates(allCertificates);

    return validCertificates.find(cert =>
      certificateMatchesRequirement(cert, requirementId)
    ) || null;
  } catch (error) {
    console.error('Error finding certificate:', error);
    return null;
  }
};

/**
 * Get summary of certificate coverage for compliance requirements
 *
 * @param {Object} requirements - Compliance requirements
 * @param {Array<string>} confirmedDocuments - Manually confirmed document IDs
 * @param {string} organizationId - Organization ID
 * @param {string} vehicleId - Vehicle ID (optional)
 * @param {Array<string>} horseIds - Horse IDs (optional)
 * @returns {Promise<Object>} Coverage summary
 */
export const getCertificateCoverage = async (requirements, confirmedDocuments, organizationId, vehicleId = null, horseIds = []) => {
  if (!requirements) {
    return {
      total: 0,
      coveredByCertificates: 0,
      manuallyConfirmed: 0,
      missing: 0,
    };
  }

  const autoConfirmed = await getAutoConfirmedDocuments(requirements, organizationId, vehicleId, horseIds);

  // Get all required document IDs
  const allRequiredDocs = [];
  requirements.documents.forEach(doc => doc.required && allRequiredDocs.push(doc.id));

  Object.values(requirements.countrySpecific || {}).forEach(countryReq => {
    if (countryReq.documents) {
      countryReq.documents.forEach(doc => doc.required && allRequiredDocs.push(doc.id));
    }
  });

  const manualOnly = confirmedDocuments.filter(id => !autoConfirmed.includes(id));
  const covered = new Set([...autoConfirmed, ...confirmedDocuments]);
  const missing = allRequiredDocs.filter(id => !covered.has(id));

  return {
    total: allRequiredDocs.length,
    coveredByCertificates: autoConfirmed.length,
    manuallyConfirmed: manualOnly.length,
    missing: missing.length,
    autoConfirmedIds: autoConfirmed,
    missingIds: missing,
  };
};

/**
 * Suggest certificate types needed for missing requirements
 *
 * @param {Array<string>} missingRequirementIds - Missing requirement IDs
 * @returns {Array<Object>} Suggested certificate types to upload
 */
export const getSuggestedCertificates = (missingRequirementIds) => {
  const suggestions = [];

  for (const requirementId of missingRequirementIds) {
    // Find the certificate type name from the map
    const certType = Object.keys(CERTIFICATE_TO_REQUIREMENT_MAP).find(
      key => CERTIFICATE_TO_REQUIREMENT_MAP[key] === requirementId
    );

    if (certType) {
      suggestions.push({
        requirementId,
        certificateType: certType,
        description: `Upload et ${certType} certifikat`,
      });
    }
  }

  return suggestions;
};
