/**
 * Transport Regulations Service
 *
 * Determines required documentation and compliance requirements for horse transport
 * based on distance, border crossings, and destination countries.
 *
 * Danish regulations summary:
 * - Under 65km: Passport, registration, approval certificate, authorization needed
 * - Over 65km: Above + transport document + competence certificate for all handlers
 * - Border crossing: Traces certificate required
 * - Country-specific: Additional documents for France, Sweden, Norway, Switzerland, UK
 */

/**
 * Get compliance requirements for a transport based on route information
 * @param {Object} routeInfo - Route information from mapsService
 * @param {number} distance - Distance in kilometers
 * @param {boolean} borderCrossing - Whether route crosses borders
 * @param {Array<string>} countries - Countries involved in route
 * @param {string} vehicleType - Vehicle type (e.g., 'Lastbil', 'Personbil', etc.)
 * @returns {Object} Compliance requirements object
 */
export const getComplianceRequirements = (routeInfo, distance, borderCrossing, countries = [], vehicleType = null) => {
  const requirements = {
    documents: [],
    warnings: [],
    countrySpecific: {},
  };

  // Distance in km (convert from meters if needed)
  const distanceKm = distance > 1000 ? distance / 1000 : distance;

  // Base requirements (always needed)
  requirements.documents.push({
    id: 'horse_passport',
    name: 'Hestepas',
    required: true,
    description: 'Påkrævet for alle transporter',
    category: 'base',
  });

  requirements.documents.push({
    id: 'registration',
    name: 'Registreringsattest',
    required: true,
    description: 'Påkrævet for virksomhedstransport',
    category: 'base',
  });

  requirements.documents.push({
    id: 'approval_certificate',
    name: 'Godkendelsescertifikat',
    required: true,
    description: 'Påkrævet for virksomhedstransport',
    category: 'base',
  });

  requirements.documents.push({
    id: 'authorization',
    name: 'Autorisation',
    required: true,
    description: 'Påkrævet for virksomhedstransport',
    category: 'base',
  });

  // Over 65km requirements
  if (distanceKm > 65) {
    requirements.documents.push({
      id: 'competence_certificate',
      name: 'Kompetencebevis',
      required: true,
      description: 'Påkrævet for chauffør og alle der håndterer hesten ved transport over 65 km',
      category: 'distance',
    });

    requirements.warnings.push({
      type: 'info',
      message: 'Transport over 65 km: Kompetencebevis skal medbringes for alle der kører bilen eller læsser hesten.',
    });
  } else {
    requirements.warnings.push({
      type: 'info',
      message: 'Transport under 65 km: Kompetencebevis ikke påkrævet.',
    });
  }

  // Border crossing requirements
  if (borderCrossing) {
    requirements.documents.push({
      id: 'traces_certificate',
      name: 'Traces Certifikat',
      required: true,
      description: 'Påkrævet ved grænseoverskridelse',
      category: 'border',
    });

    requirements.warnings.push({
      type: 'warning',
      message: 'Grænseoverskridelse: Husk at udfylde Traces certifikatet før afgang.',
    });
  }

  // Country-specific requirements
  const normalizedCountries = countries.map(c => c.toLowerCase());

  // France
  if (hasCountry(normalizedCountries, ['france', 'frankrig'])) {
    const isTruck = vehicleType === 'Lastbil';

    const franceDocuments = [
      {
        id: 'letter_of_authority',
        name: 'Letter of Authority',
        required: true,
        description: 'Påkrævet for transport til/gennem Frankrig',
      },
    ];

    // Only add stickers requirement for trucks
    if (isTruck) {
      franceDocuments.push({
        id: 'france_stickers',
        name: 'Franske Klistermærker',
        required: true,
        description: 'Specielle klistermærker på lastbilen (kan købes ved grænsen)',
      });
    }

    const franceWarning = isTruck
      ? 'Frankrig: Letter of Authority skal udfyldes og specielle klistermærker skal påsættes lastbilen.'
      : 'Frankrig: Letter of Authority skal udfyldes.';

    requirements.countrySpecific.france = {
      documents: franceDocuments,
      warnings: [
        {
          type: 'warning',
          message: franceWarning,
        },
      ],
    };
  }

  // Sweden
  if (hasCountry(normalizedCountries, ['sweden', 'sverige'])) {
    requirements.countrySpecific.sweden = {
      documents: [
        {
          id: 'egenforsäkran',
          name: 'Egenförsäkran (Selvforsikring)',
          required: true,
          description: 'Påkrævet for transport til Sverige',
        },
      ],
      warnings: [
        {
          type: 'info',
          message: 'Sverige: Egenförsäkran (selvforsikring) skal udfyldes.',
        },
      ],
    };
  }

  // Norway
  if (hasCountry(normalizedCountries, ['norway', 'norge'])) {
    requirements.countrySpecific.norway = {
      documents: [
        {
          id: 'customs_document',
          name: 'Tolddokument',
          required: true,
          description: 'Påkrævet for transport til Norge',
        },
      ],
      warnings: [
        {
          type: 'warning',
          message: 'Norge: Tolddokument skal udstedes og fremvises i tolden.',
        },
      ],
    };
  }

  // Switzerland or UK
  if (hasCountry(normalizedCountries, ['switzerland', 'schweiz', 'united kingdom', 'uk', 'england', 'britain'])) {
    const isUK = hasCountry(normalizedCountries, ['united kingdom', 'uk', 'england', 'britain']);
    const country = isUK ? 'UK' : 'Schweiz';

    requirements.countrySpecific[isUK ? 'uk' : 'switzerland'] = {
      documents: [
        {
          id: 'ata_carnet',
          name: 'ATA-Carnet',
          required: true,
          description: `Påkrævet for transport til ${country}`,
        },
      ],
      warnings: [
        {
          type: 'critical',
          message: `${country}: ATA-Carnet skal udfyldes hos Dansk Industri. Du skal overføre 20% af alle varers samlede værdi i depositum til ${country} for at sikre du ikke sælger varer uden at betale told. Depositum returneres efter transport.`,
        },
      ],
    };
  }

  return requirements;
};

/**
 * Check if any country in the list matches the search terms
 * @param {Array<string>} countries - List of countries (lowercase)
 * @param {Array<string>} searchTerms - Terms to search for
 * @returns {boolean}
 */
const hasCountry = (countries, searchTerms) => {
  return countries.some(country =>
    searchTerms.some(term => country.includes(term) || term.includes(country))
  );
};

/**
 * Get all required documents flattened into a single array
 * @param {Object} requirements - Requirements object from getComplianceRequirements
 * @returns {Array<Object>} Flattened array of all required documents
 */
export const getAllRequiredDocuments = (requirements) => {
  if (!requirements) return [];

  const documents = [...requirements.documents];

  // Add country-specific documents
  Object.values(requirements.countrySpecific).forEach(countryReq => {
    if (countryReq.documents) {
      documents.push(...countryReq.documents);
    }
  });

  return documents;
};

/**
 * Get all warnings flattened into a single array
 * @param {Object} requirements - Requirements object from getComplianceRequirements
 * @returns {Array<Object>} Flattened array of all warnings
 */
export const getAllWarnings = (requirements) => {
  if (!requirements) return [];

  const warnings = [...requirements.warnings];

  // Add country-specific warnings
  Object.values(requirements.countrySpecific).forEach(countryReq => {
    if (countryReq.warnings) {
      warnings.push(...countryReq.warnings);
    }
  });

  return warnings;
};

/**
 * Check if a transport is compliant (all required documents confirmed)
 * @param {Object} requirements - Requirements object
 * @param {Array<string>} confirmedDocuments - Array of confirmed document IDs
 * @returns {Object} Compliance status
 */
export const checkCompliance = (requirements, confirmedDocuments = []) => {
  const allDocuments = getAllRequiredDocuments(requirements);
  const requiredDocs = allDocuments.filter(doc => doc.required);

  const missing = requiredDocs.filter(doc => !confirmedDocuments.includes(doc.id));
  const isCompliant = missing.length === 0;

  return {
    isCompliant,
    totalRequired: requiredDocs.length,
    confirmed: confirmedDocuments.length,
    missing: missing.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
    })),
  };
};

/**
 * Get human-readable summary of requirements
 * @param {Object} requirements - Requirements object
 * @returns {string} Summary text
 */
export const getRequirementsSummary = (requirements) => {
  const allDocs = getAllRequiredDocuments(requirements);
  const allWarnings = getAllWarnings(requirements);

  let summary = `${allDocs.length} dokument(er) påkrævet`;

  if (allWarnings.length > 0) {
    const criticalWarnings = allWarnings.filter(w => w.type === 'critical').length;
    const regularWarnings = allWarnings.filter(w => w.type === 'warning').length;

    if (criticalWarnings > 0) {
      summary += `, ${criticalWarnings} kritisk(e) advarsel(er)`;
    }
    if (regularWarnings > 0) {
      summary += `, ${regularWarnings} advarsel(er)`;
    }
  }

  return summary;
};
