import * as Location from 'expo-location';

// You'll need to add this to your .env file
// For Routes API, use a backend/unrestricted API key (not platform-specific)
const GOOGLE_MAPS_API_KEY = process.env.WEB_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

/**
 * Get user's current location
 */
export const getCurrentLocation = async () => {
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
};

/**
 * Convert address to coordinates (Geocoding)
 */
export const geocodeAddress = async (address) => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeId: result.place_id,
      };
    } else {
      throw new Error(`Geocoding failed: ${data.status}`);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
};

/**
 * Convert coordinates to address (Reverse Geocoding)
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return {
        formattedAddress: data.results[0].formatted_address,
        addressComponents: data.results[0].address_components,
      };
    } else {
      throw new Error(`Reverse geocoding failed: ${data.status}`);
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
};

/**
 * Get route information between two locations using Routes API
 * Includes: distance, duration, border crossings, traffic, and route polyline
 */
export const getDirections = async (origin, destination) => {
  try {
    // Prepare origin and destination
    const originData = typeof origin === 'string'
      ? { address: origin }
      : { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } };

    const destData = typeof destination === 'string'
      ? { address: destination }
      : { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } };

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const requestBody = {
      origin: originData,
      destination: destData,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      routeModifiers: {
        avoidFerries: true, // Safer for horse transport
        avoidHighways: false,
        avoidTolls: false
      },
      units: 'METRIC',
      languageCode: 'da' // Danish
    };

    console.log('Routes API request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        // Request only needed fields to reduce costs
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps,routes.legs.localizedValues'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Routes API response status:', response.status, response.statusText);

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.error('Routes API response:', JSON.stringify(data, null, 2));
      throw new Error(`No routes found: ${data.error?.message || 'Unknown error'}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Detect border crossings by parsing step instructions
    const borderCrossings = detectBorderCrossings(leg.steps);

    // Convert duration string (e.g., "7200s") to seconds
    const durationSeconds = parseInt(route.duration.replace('s', ''));
    const staticDurationSeconds = parseInt(route.staticDuration.replace('s', ''));

    // Format duration as text
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours} time${hours > 1 ? 'r' : ''} ${minutes} min`;
      }
      return `${minutes} min`;
    };

    return {
      distance: {
        text: `${(route.distanceMeters / 1000).toFixed(1)} km`,
        value: route.distanceMeters, // in meters
        km: (route.distanceMeters / 1000).toFixed(1)
      },
      duration: {
        text: formatDuration(durationSeconds),
        value: durationSeconds, // in seconds
        withTraffic: true
      },
      durationWithoutTraffic: {
        text: formatDuration(staticDurationSeconds),
        value: staticDurationSeconds
      },
      trafficDelay: {
        text: formatDuration(durationSeconds - staticDurationSeconds),
        value: durationSeconds - staticDurationSeconds
      },
      startAddress: leg.localizedValues?.distance?.text || 'Start location',
      endAddress: leg.localizedValues?.duration?.text || 'End location',
      borderCrossing: borderCrossings.length > 0,
      countries: borderCrossings,
      polyline: route.polyline.encodedPolyline,
      steps: leg.steps.map(step => ({
        instruction: step.navigationInstruction?.instructions || '',
        distance: step.distanceMeters,
        duration: step.staticDuration
      }))
    };
  } catch (error) {
    console.error('Error getting directions:', error);
    throw error;
  }
};

/**
 * Detect border crossings from route steps
 */
const detectBorderCrossings = (steps) => {
  const crossings = new Set();

  steps.forEach(step => {
    const instruction = step.navigationInstruction?.instructions || '';

    // Look for "Entering [Country]" pattern
    if (instruction.includes('Entering ')) {
      const match = instruction.match(/Entering (.+?)(?:\.|$)/);
      if (match) {
        crossings.add(match[1]);
      }
    }

    // Also check for country names in maneuvers
    const commonCountries = ['Denmark', 'Sverige', 'Norway', 'Germany', 'Tyskland', 'Poland', 'Polen'];
    commonCountries.forEach(country => {
      if (instruction.includes(country)) {
        crossings.add(country);
      }
    });
  });

  return Array.from(crossings);
};

/**
 * Extract country from address
 */
const getCountryFromAddress = async (address) => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const addressComponents = data.results[0].address_components;
      const countryComponent = addressComponents.find(
        component => component.types.includes('country')
      );
      return countryComponent?.long_name;
    }
    return null;
  } catch (error) {
    console.error('Error getting country from address:', error);
    return null;
  }
};

/**
 * Get autocomplete suggestions for address input
 */
export const getPlaceAutocomplete = async (input) => {
  try {
    const encodedInput = encodeURIComponent(input);
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedInput}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.predictions.map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting place autocomplete:', error);
    return [];
  }
};

/**
 * Calculate estimated time considering traffic
 */
export const getDirectionsWithTraffic = async (origin, destination, departureTime = 'now') => {
  try {
    const originStr = typeof origin === 'string'
      ? encodeURIComponent(origin)
      : `${origin.latitude},${origin.longitude}`;

    const destStr = typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.latitude},${destination.longitude}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&departure_time=${departureTime}&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      const leg = data.routes[0].legs[0];

      return {
        normalDuration: leg.duration.text,
        durationInTraffic: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting directions with traffic:', error);
    return null;
  }
};
