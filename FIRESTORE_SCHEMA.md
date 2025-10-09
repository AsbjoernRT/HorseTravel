# Firestore Database Schema

> Overview of core collections, field semantics, and security rules used by the HorseTravel app.

## Collections Overview

### users
```javascript
users/{userId}
{
  email: string,
  name: string,
  role: string, // 'stud_farm', 'riding_club', 'transport_company'
  company: string,
  phone: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### vehicles
```javascript
vehicles/{vehicleId}
{
  userId: string,
  licensePlate: string,
  type: string, // 'car', 'truck', 'trailer'
  capacity: number, // antal heste
  brand: string,
  model: string,
  year: number,
  registrationInfo: {
    registrationNumber: string,
    vin: string,
    country: string
  },
  status: string, // 'active', 'inactive', 'maintenance'
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### horses
```javascript
horses/{horseId}
{
  userId: string,
  name: string,
  chipId: string, // chip nummer
  passportNumber: string,
  breed: string,
  dateOfBirth: timestamp,
  sex: string, // 'stallion', 'mare', 'gelding'
  color: string,
  healthData: {
    vaccinations: [
      {
        type: string,
        date: timestamp,
        expiryDate: timestamp,
        veterinarian: string
      }
    ],
    lastVetCheck: timestamp,
    medicalNotes: string
  },
  ownerInfo: {
    name: string,
    phone: string,
    email: string
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### transports
```javascript
transports/{transportId}
{
  userId: string,
  vehicleId: string,
  horseIds: [string],
  driverId: string,
  status: string, // 'planned', 'active', 'completed', 'cancelled'

  route: {
    origin: {
      address: string,
      lat: number,
      lng: number,
      country: string
    },
    destination: {
      address: string,
      lat: number,
      lng: number,
      country: string
    },
    waypoints: [
      {
        address: string,
        lat: number,
        lng: number,
        type: string, // 'border_crossing', 'rest_stop', 'fuel'
        estimatedArrival: timestamp
      }
    ],
    distance: number, // km
    estimatedDuration: number // minutes
  },

  schedule: {
    startTime: timestamp,
    estimatedArrival: timestamp,
    actualStartTime: timestamp,
    actualArrival: timestamp,
    breaks: [
      {
        startTime: timestamp,
        endTime: timestamp,
        location: {
          lat: number,
          lng: number
        },
        duration: number, // minutes
        type: string // 'mandatory', 'optional'
      }
    ]
  },

  costs: {
    fuelCost: number,
    tollCost: number,
    otherCosts: number,
    totalCost: number,
    currency: string // 'DKK', 'EUR'
  },

  tracking: {
    currentLocation: {
      lat: number,
      lng: number,
      timestamp: timestamp
    },
    locationHistory: [
      {
        lat: number,
        lng: number,
        timestamp: timestamp
      }
    ]
  },

  createdAt: timestamp,
  updatedAt: timestamp
}
```

### documents
```javascript
documents/{documentId}
{
  transportId: string,
  userId: string,
  type: string, // 'health_certificate', 'logbook', 'traces', 'customs', 'passport'

  country: string, // hvilket land dokumentet er til

  data: {
    // Dynamisk baseret på dokumenttype
    // Eksempel for health certificate:
    horseIds: [string],
    veterinarianName: string,
    veterinarianLicense: string,
    issueDate: timestamp,
    expiryDate: timestamp,
    healthStatus: string,
    vaccinations: [object],

    // Eksempel for TRACES:
    tracesNumber: string,
    destinationCountry: string,
    borderCrossingPoint: string,

    // Eksempel for logbook:
    departureTime: timestamp,
    arrivalTime: timestamp,
    breaks: [object],
    driverSignature: string
  },

  fileUrl: string, // PDF i Firebase Storage
  status: string, // 'draft', 'completed', 'submitted', 'approved'

  createdAt: timestamp,
  updatedAt: timestamp
}
```

### alerts
```javascript
alerts/{alertId}
{
  transportId: string,
  userId: string,
  type: string, // 'delay', 'route_change', 'pause_needed', 'border_crossing', 'emergency'
  severity: string, // 'low', 'medium', 'high', 'critical'

  message: string,
  description: string,

  location: {
    lat: number,
    lng: number
  },

  isRead: boolean,
  isResolved: boolean,

  createdAt: timestamp,
  resolvedAt: timestamp
}
```

### notifications
```javascript
notifications/{notificationId}
{
  userId: string,
  transportId: string,
  type: string, // 'transport_started', 'transport_completed', 'document_created', 'alert'

  title: string,
  message: string,

  data: object, // ekstra data afhængig af type

  isRead: boolean,

  createdAt: timestamp
}
```

## Indexes

### Recommended Composite Indexes

```javascript
// transports collection
{
  fields: [
    { fieldPath: "userId", order: "ASCENDING" },
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}

// documents collection
{
  fields: [
    { fieldPath: "transportId", order: "ASCENDING" },
    { fieldPath: "type", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}

// alerts collection
{
  fields: [
    { fieldPath: "userId", order: "ASCENDING" },
    { fieldPath: "isRead", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```

## Security Rules Preview

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Vehicles
    match /vehicles/{vehicleId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Horses
    match /horses/{horseId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Transports
    match /transports/{transportId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Documents
    match /documents/{documentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Alerts
    match /alerts/{alertId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }
  }
}
```

## Setup Instructions

1. Gå til Firebase Console → Firestore Database
2. Opret database i production mode
3. Kopiér security rules fra ovenstående
4. Firestore vil automatisk oprette collections når første dokument oprettes
5. Indexes oprettes automatisk når du kører queries der kræver dem
