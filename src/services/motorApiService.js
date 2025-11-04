import { MOTOR_API_KEY } from '@env';

const MOTOR_API_BASE_URL = 'https://v1.motorapi.dk/vehicles';

/**
 * Fetch vehicle information from motorapi.dk by license plate
 * @param {string} licensePlate - Danish license plate (e.g., "AB12345")
 * @returns {Promise<Object>} Vehicle data including make, model, and other details
 */
export const fetchVehicleFromRegistry = async (licensePlate) => {
  try {
    // Check if API key is loaded
    if (!MOTOR_API_KEY) {
      console.error('MOTOR_API_KEY is not defined');
      throw new Error('API nøgle mangler. Genstart appen.');
    }

    // Remove spaces and convert to uppercase
    const cleanedPlate = licensePlate.replace(/\s+/g, '').toUpperCase();

    console.log('Fetching vehicle from motorapi.dk:', cleanedPlate);
    console.log('API URL:', `${MOTOR_API_BASE_URL}/${cleanedPlate}`);
    console.log('API Key exists:', !!MOTOR_API_KEY);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${MOTOR_API_BASE_URL}/${cleanedPlate}`, {
      method: 'GET',
      headers: {
        'X-AUTH-TOKEN': MOTOR_API_KEY,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('Response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Køretøj ikke fundet i registeret');
      } else if (response.status === 401) {
        throw new Error('API nøgle ugyldig');
      } else if (response.status === 403) {
        throw new Error('Ingen adgang til API');
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API fejl: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Vehicle data received:', data);

    // Extract relevant vehicle information
    return {
      licensePlate: data.registration_number || licensePlate,
      make: data.make || '',
      model: data.model || '',
      variant: data.variant || '',
      vin: data.vin || null,

      // Registration and dates
      firstRegistration: data.first_registration || null,
      status: data.status || null,
      statusDate: data.status_date || null,

      // Vehicle type and specifications
      vehicleType: data.type || null,
      chassisType: data.chassis_type || null,
      modelType: data.model_type || null,
      use: data.use || null,

      // Engine
      fuelType: data.fuel_type || null,
      enginePower: data.engine_power || null,
      engineVolume: data.engine_volume || null,
      engineCylinders: data.engine_cylinders || null,
      isHybrid: data.is_hybrid || false,
      hybridType: data.hybrid_type || null,

      // Physical characteristics
      doors: data.doors || null,
      seats: data.seats || null,
      color: data.color || null,

      // Weight information (important for transport!)
      ownWeight: data.own_weight || null,
      cerbWeight: data.cerb_weight || null,
      totalWeight: data.total_weight || null,

      // Axles and coupling
      axels: data.axels || null,
      pullingAxels: data.pulling_axels || null,
      coupling: data.coupling || false,

      // Trailer capacity
      trailerMaxWeightNoBrakes: data.trailer_maxweight_nobrakes || null,
      trailerMaxWeightWithBrakes: data.trailer_maxweight_withbrakes || null,

      // MOT information
      motInfo: data.mot_info ? {
        type: data.mot_info.type || null,
        date: data.mot_info.date || null,
        result: data.mot_info.result || null,
        status: data.mot_info.status || null,
        mileage: data.mot_info.mileage || null,
      } : null,

      // Leasing
      isLeasing: data.is_leasing || false,
      leasingFrom: data.leasing_from || null,
      leasingTo: data.leasing_to || null,

      // Other
      vehicleId: data.vehicle_id || null,
      registrationZipcode: data.registration_zipcode || null,
    };
  } catch (error) {
    console.error('Error fetching vehicle from MotorAPI:', error);

    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Forespørgsel timeout - prøv igen');
    }

    if (error.message.includes('Network request failed')) {
      throw new Error('Netværksfejl - tjek din internetforbindelse');
    }

    throw error;
  }
};

/**
 * Format vehicle data for display
 * @param {Object} vehicleData - Raw vehicle data from API
 * @returns {string} Formatted vehicle description
 */
export const formatVehicleInfo = (vehicleData) => {
  if (!vehicleData) return '';

  const parts = [vehicleData.make, vehicleData.model];

  if (vehicleData.variant) {
    parts.push(vehicleData.variant);
  }

  if (vehicleData.year) {
    parts.push(`(${vehicleData.year})`);
  }

  return parts.filter(Boolean).join(' ');
};
