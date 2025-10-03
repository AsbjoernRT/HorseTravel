# Google Maps API Setup

## 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Directions API**
   - **Geocoding API**
   - **Places API**
   - **Distance Matrix API** (optional)

4. Go to "Credentials" and create an API key
5. Restrict the API key (recommended):
   - Set application restrictions (HTTP referrers for web, etc.)
   - Set API restrictions to only the enabled APIs above

## 2. Add API Key to Your Project

Add to your `.env` file:
```
GOOGLE_MAPS_API_KEY=your_api_key_here
```

## 3. Features Available

### Current Location
```javascript
import { getCurrentLocation } from './src/services/mapsService';

const location = await getCurrentLocation();
// Returns: { latitude, longitude }
```

### Address to Coordinates (Geocoding)
```javascript
import { geocodeAddress } from './src/services/mapsService';

const result = await geocodeAddress('Copenhagen, Denmark');
// Returns: { formattedAddress, latitude, longitude, placeId }
```

### Coordinates to Address (Reverse Geocoding)
```javascript
import { reverseGeocode } from './src/services/mapsService';

const result = await reverseGeocode(55.6761, 12.5683);
// Returns: { formattedAddress, addressComponents }
```

### Get Directions with Route Info
```javascript
import { getDirections } from './src/services/mapsService';

const route = await getDirections('Copenhagen', 'Hamburg');
// Returns:
// {
//   distance: { text: '350 km', value: 350000 },
//   duration: { text: '3 hours 45 mins', value: 13500 },
//   startAddress: 'Copenhagen, Denmark',
//   endAddress: 'Hamburg, Germany',
//   borderCrossing: true,
//   countries: ['Denmark', 'Germany'],
//   polyline: '...',
//   steps: [...]
// }
```

### Autocomplete for Address Input
```javascript
import { getPlaceAutocomplete } from './src/services/mapsService';

const suggestions = await getPlaceAutocomplete('Copen');
// Returns array of suggestions with descriptions
```

### Get Directions with Traffic
```javascript
import { getDirectionsWithTraffic } from './src/services/mapsService';

const traffic = await getDirectionsWithTraffic('Copenhagen', 'Hamburg');
// Returns: { normalDuration, durationInTraffic }
```

## 4. Integration in StartTransportScreen

The maps service can be integrated to:
- Auto-fill user's current location when they click a "Use Current Location" button
- Validate and format addresses as users type
- Show distance and estimated time before creating transport
- Detect if route crosses international borders (important for horse transport regulations)
- Display route on a map

## 5. Pricing

Google Maps Platform has a free tier:
- $200 free credit per month
- Geocoding: $5 per 1000 requests (after free tier)
- Directions: $5 per 1000 requests (after free tier)
- Places Autocomplete: $2.83 per 1000 requests (after free tier)

For typical usage (few transports per day), you'll likely stay within the free tier.

## 6. Important Notes

- **Border Crossings**: When transporting horses across borders, you need additional documentation (health certificates, customs, etc.). The app will warn you when a route crosses borders.
- **Accuracy**: GPS coordinates are accurate to within a few meters
- **Offline**: Location services work offline, but geocoding and directions require internet
