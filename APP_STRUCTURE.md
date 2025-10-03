# HorseTravel App Structure

## Tech Stack
- **Framework**: Expo (React Native)
- **Language**: JavaScript
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Maps**: React Native Maps / Google Maps API
- **Navigation**: React Navigation

---

## Folder Structure

```
HorseTravel/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Card.js
│   │   │   └── Header.js
│   │   ├── transport/
│   │   │   ├── VehicleCard.js
│   │   │   ├── HorseCard.js
│   │   │   └── TransportStatus.js
│   │   ├── map/
│   │   │   ├── RouteMap.js
│   │   │   ├── LocationMarker.js
│   │   │   └── BorderCrossingInfo.js
│   │   └── documents/
│   │       ├── DocumentCard.js
│   │       ├── CertificateForm.js
│   │       └── DocumentViewer.js
│   │
│   ├── screens/              # App screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── home/
│   │   │   └── HomeScreen.js
│   │   ├── planning/
│   │   │   ├── NewTransportScreen.js
│   │   │   ├── RouteMapScreen.js
│   │   │   └── CostCalculationScreen.js
│   │   ├── fleet/
│   │   │   ├── VehicleListScreen.js
│   │   │   ├── VehicleDetailScreen.js
│   │   │   ├── HorseListScreen.js
│   │   │   └── HorseDetailScreen.js
│   │   ├── tracking/
│   │   │   ├── LiveTrackingScreen.js
│   │   │   ├── TransportListScreen.js
│   │   │   └── TransportDetailScreen.js
│   │   ├── documents/
│   │   │   ├── DocumentListScreen.js
│   │   │   ├── CreateDocumentScreen.js
│   │   │   └── DocumentArchiveScreen.js
│   │   └── profile/
│   │       ├── ProfileScreen.js
│   │       └── SettingsScreen.js
│   │
│   ├── navigation/           # Navigation configuration
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   └── MainTabNavigator.js
│   │
│   ├── services/             # Business logic & API calls
│   │   ├── firebase/
│   │   │   ├── config.js
│   │   │   ├── auth.js
│   │   │   ├── firestore.js
│   │   │   └── storage.js
│   │   ├── location/
│   │   │   ├── gps.js
│   │   │   └── geocoding.js
│   │   ├── routing/
│   │   │   ├── routeOptimization.js
│   │   │   ├── costCalculation.js
│   │   │   └── euRegulations.js
│   │   ├── documents/
│   │   │   ├── documentGenerator.js
│   │   │   └── templates.js
│   │   └── notifications/
│   │       └── pushNotifications.js
│   │
│   ├── store/                # State management (Context API or Redux)
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   ├── TransportContext.js
│   │   │   └── FleetContext.js
│   │   └── reducers/
│   │
│   ├── utils/                # Utility functions
│   │   ├── validation.js
│   │   ├── formatters.js
│   │   ├── constants.js
│   │   └── helpers.js
│   │
│   ├── assets/               # Images, fonts, icons
│   │   ├── images/
│   │   ├── fonts/
│   │   └── icons/
│   │
│   └── config/               # App configuration
│       ├── theme.js
│       └── environment.js
│
├── App.js                    # Entry point
├── app.json                  # Expo configuration
├── package.json
├── firebase.json
└── .env                      # Environment variables
```

---

## Firebase Collections Structure

```
users/
  └── {userId}
      ├── email
      ├── name
      ├── role (stud_farm, riding_club, transport_company)
      ├── company
      └── createdAt

vehicles/
  └── {vehicleId}
      ├── userId
      ├── licensePlate
      ├── type (car, truck, trailer)
      ├── capacity
      ├── registrationInfo
      └── createdAt

horses/
  └── {horseId}
      ├── userId
      ├── name
      ├── horseId (chip/passport)
      ├── healthData
      ├── passportInfo
      └── createdAt

transports/
  └── {transportId}
      ├── userId
      ├── vehicleId
      ├── horseIds[]
      ├── status (planned, active, completed)
      ├── route
      │   ├── origin
      │   ├── destination
      │   ├── waypoints[]
      │   └── distance
      ├── schedule
      │   ├── startTime
      │   ├── estimatedArrival
      │   └── breaks[]
      ├── costs
      │   ├── fuel
      │   ├── tolls
      │   └── total
      ├── currentLocation
      │   ├── lat
      │   └── lng
      └── createdAt

documents/
  └── {documentId}
      ├── transportId
      ├── type (health_certificate, logbook, traces, customs)
      ├── country
      ├── data{}
      ├── fileUrl
      └── createdAt

alerts/
  └── {alertId}
      ├── transportId
      ├── type (delay, route_change, pause_needed)
      ├── message
      ├── severity
      └── timestamp
```

---

## Key Features by Screen

### 1. Home Screen
- Dashboard overview
- Active transports count
- Upcoming transports
- Quick actions (New Transport, View Fleet)

### 2. New Transport Screen
- Select vehicle
- Select horses
- Set origin/destination
- View optimized route on map
- EU break suggestions
- Cost estimation
- Save/Start transport

### 3. Route Map Screen
- Interactive map
- Route visualization
- Border crossing markers
- Rest stop suggestions
- Country-specific regulations overlay

### 4. Live Tracking Screen
- Real-time GPS tracking
- Multiple transport monitoring
- Driver status
- ETA updates
- Alert notifications

### 5. Fleet Management
- Vehicle list with details
- Horse registry
- Add/edit vehicles and horses
- Health data tracking

### 6. Document Management
- Create documents (TRACES, health certificates)
- Auto-fill from transport data
- Country-specific templates
- Digital archive with search
- PDF export

---

## Core Libraries & Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "firebase": "^10.7.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-maps": "^1.10.0",
    "expo-location": "~16.5.0",
    "expo-notifications": "~0.27.0",
    "react-native-pdf": "^6.7.0",
    "expo-document-picker": "~11.10.0",
    "expo-file-system": "~16.0.0",
    "react-native-dotenv": "^3.4.0"
  }
}
```

---

## Navigation Flow

```
AuthNavigator (if not logged in)
├── Login Screen
└── Register Screen

MainTabNavigator (if logged in)
├── Home Tab
│   └── Home Screen
│       ├── → Transport Detail
│       └── → New Transport
│
├── Planning Tab
│   ├── New Transport Screen
│   ├── → Route Map Screen
│   └── → Cost Calculation
│
├── Tracking Tab
│   ├── Transport List Screen
│   ├── → Live Tracking Screen
│   └── → Transport Detail Screen
│
├── Fleet Tab
│   ├── Vehicle List Screen
│   │   └── → Vehicle Detail Screen
│   └── Horse List Screen
│       └── → Horse Detail Screen
│
└── Documents Tab
    ├── Document List Screen
    ├── → Create Document Screen
    └── → Document Archive Screen
```

---

## State Management Strategy

Using **React Context API** for simplicity:

- **AuthContext**: User authentication state
- **TransportContext**: Active/planned transports
- **FleetContext**: Vehicles and horses
- **DocumentContext**: Documents and templates

---

## Development Phases

### Phase 1: Core Setup
- Firebase configuration
- Authentication (login/register)
- Basic navigation structure

### Phase 2: Fleet Management
- Vehicle CRUD operations
- Horse registry
- Firebase integration

### Phase 3: Transport Planning
- Route planning with maps
- GPS integration
- Cost calculation
- EU regulations logic

### Phase 4: Live Tracking
- Real-time location updates
- Transport monitoring
- Alert system

### Phase 5: Document Management
- Document templates
- Auto-fill functionality
- PDF generation
- Archive system

### Phase 6: Polish & Testing
- UI/UX refinement
- Performance optimization
- Testing on iOS/Android
