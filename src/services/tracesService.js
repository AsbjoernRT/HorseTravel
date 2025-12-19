/**
 * TRACES Service
 * Simulerer oprettelse af EU TRACES dokumenter ved internationale hestetransporter
 */

// Landekode mapping
const COUNTRY_CODES = {
  'denmark': 'DK',
  'danmark': 'DK',
  'germany': 'DE',
  'tyskland': 'DE',
  'sweden': 'SE',
  'sverige': 'SE',
  'norway': 'NO',
  'norge': 'NO',
  'france': 'FR',
  'frankrig': 'FR',
  'netherlands': 'NL',
  'holland': 'NL',
  'belgium': 'BE',
  'belgien': 'BE',
  'poland': 'PL',
  'polen': 'PL',
  'austria': 'AT',
  'østrig': 'AT',
  'switzerland': 'CH',
  'schweiz': 'CH',
  'italy': 'IT',
  'italien': 'IT',
  'spain': 'ES',
  'spanien': 'ES',
  'united kingdom': 'GB',
  'uk': 'GB',
  'england': 'GB',
};

/**
 * Delay utility
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Genererer et realistisk TRACES reference nummer
 * Format: TRACES.[LANDSKODE].[ÅR].[7-cifret sekvens]
 *
 * @param {string} originCountry - Oprindelsesland (f.eks. "Denmark")
 * @returns {string} Genereret TRACES reference nummer
 */
export const generateTRACESNumber = (originCountry = 'Denmark') => {
  const normalizedCountry = originCountry.toLowerCase();
  const countryCode = COUNTRY_CODES[normalizedCountry] || 'EU';
  const year = new Date().getFullYear();
  const sequence = Math.floor(1000000 + Math.random() * 9000000); // 7 cifre

  return `TRACES.${countryCode}.${year}.${sequence.toString().padStart(7, '0')}`;
};

/**
 * Simulerer TRACES registreringsprocessen med kunstige forsinkelser
 *
 * @param {Function} onStepChange - Callback for step-opdateringer (1, 2, 3)
 * @param {string} originCountry - Oprindelsesland for TRACES nummer
 * @returns {Promise<string>} Genereret TRACES nummer
 */
export const simulateTRACESRegistration = async (onStepChange, originCountry = 'Denmark') => {
  // Step 1: Opretter transport
  onStepChange(1);
  await delay(500);

  // Step 2: EU Registrering (2-3 sekunder for realisme)
  onStepChange(2);
  await delay(2000 + Math.random() * 1000);

  // Generer TRACES nummer
  const tracesNumber = generateTRACESNumber(originCountry);

  // Step 3: Færdig
  onStepChange(3);

  return tracesNumber;
};
