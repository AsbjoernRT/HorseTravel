# Horse Travel - Organization System Design

## Overview
Users can operate in two modes:
1. **Private Mode** - Individual user with their own data
2. **Organization Mode** - Part of an organization, sharing data with team members

## Firestore Data Structure

### Collections

#### 1. `users` Collection
```
users/{userId}
  - email: string
  - displayName: string
  - photoURL: string
  - provider: string (email|phone|google)
  - profileComplete: boolean
  - activeMode: string (private|organization) // Current mode
  - activeOrganizationId: string | null // Current active org
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### 2. `organizations` Collection
```
organizations/{organizationId}
  - name: string
  - description: string
  - logoURL: string | null
  - ownerId: string // User who created the org
  - createdAt: timestamp
  - updatedAt: timestamp
  - settings: {
      allowMembersToCreateVehicles: boolean
      allowMembersToCreateHorses: boolean
      allowMembersToCreateTours: boolean
    }
```

#### 3. `organizationMembers` Subcollection
```
organizations/{organizationId}/members/{userId}
  - userId: string
  - email: string
  - displayName: string
  - role: string (owner|admin|member)
  - permissions: {
      canManageMembers: boolean
      canManageVehicles: boolean
      canManageHorses: boolean
      canManageTours: boolean
    }
  - status: string (pending|active|inactive)
  - joinedAt: timestamp
  - invitedBy: string // userId
```

#### 4. `vehicles` Collection
```
vehicles/{vehicleId}
  - name: string
  - type: string (trailer|truck|van)
  - licensePlate: string
  - capacity: number // Number of horses it can carry
  - ownerId: string // User who created it
  - ownerType: string (private|organization)
  - organizationId: string | null
  - brand: string
  - model: string
  - year: number
  - notes: string
  - imageURL: string | null
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### 5. `horses` Collection
```
horses/{horseId}
  - name: string
  - breed: string
  - age: number
  - color: string
  - ownerId: string
  - ownerType: string (private|organization)
  - organizationId: string | null
  - microchipNumber: string
  - passportNumber: string
  - medicalNotes: string
  - imageURL: string | null
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### 6. `travelPlans` Collection
```
travelPlans/{travelPlanId}
  - title: string
  - description: string
  - ownerId: string
  - ownerType: string (private|organization)
  - organizationId: string | null
  - vehicleId: string
  - horseIds: array<string>
  - origin: {
      address: string
      coordinates: { lat: number, lng: number }
    }
  - destination: {
      address: string
      coordinates: { lat: number, lng: number }
    }
  - waypoints: array<{
      address: string
      coordinates: { lat: number, lng: number }
      stopDuration: number // minutes
    }>
  - departureDate: timestamp
  - estimatedArrivalDate: timestamp
  - status: string (draft|scheduled|active|completed|cancelled)
  - distance: number // kilometers
  - estimatedDuration: number // minutes
  - notes: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### 7. `tours` Collection (Active Travel Sessions)
```
tours/{tourId}
  - travelPlanId: string | null // Can be created from plan or ad-hoc
  - title: string
  - ownerId: string
  - ownerType: string (private|organization)
  - organizationId: string | null
  - vehicleId: string
  - horseIds: array<string>
  - startTime: timestamp
  - endTime: timestamp | null
  - status: string (active|paused|completed|cancelled)
  - currentLocation: {
      coordinates: { lat: number, lng: number }
      timestamp: timestamp
    }
  - route: array<{
      coordinates: { lat: number, lng: number }
      timestamp: timestamp
      speed: number
    }>
  - breaks: array<{
      startTime: timestamp
      endTime: timestamp | null
      location: { lat: number, lng: number }
      notes: string
    }>
  - totalDistance: number
  - totalDuration: number
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### 8. `invitations` Collection
```
invitations/{invitationId}
  - organizationId: string
  - organizationName: string
  - invitedEmail: string
  - invitedBy: string // userId
  - invitedByName: string
  - role: string (admin|member)
  - status: string (pending|accepted|declined|expired)
  - token: string // Unique invitation token
  - expiresAt: timestamp
  - createdAt: timestamp
  - acceptedAt: timestamp | null
```

## User Flow

### Private Mode
1. User creates vehicles, horses, travel plans, and tours
2. All data has `ownerType: 'private'` and `organizationId: null`
3. Only the user can see and manage their data

### Organization Mode
1. User creates or joins an organization
2. User switches to organization mode (`activeMode: 'organization'`)
3. When creating resources, they have `ownerType: 'organization'` and the `organizationId`
4. All organization members can see organization resources (based on permissions)

### Switching Modes
1. User can toggle between private and organization mode
2. UI shows different data based on active mode
3. User selects which organization is active if they belong to multiple

## Security Rules (Firestore)

```javascript
// Users can read/write their own profile
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Organization owners can manage their organizations
match /organizations/{orgId} {
  allow read: if isOrganizationMember(orgId);
  allow create: if request.auth != null;
  allow update, delete: if isOrganizationOwner(orgId);

  match /members/{memberId} {
    allow read: if isOrganizationMember(orgId);
    allow write: if canManageMembers(orgId);
  }
}

// Vehicles: owner or org members can read/write
match /vehicles/{vehicleId} {
  allow read: if isOwnerOrOrgMember(resource.data);
  allow create: if request.auth != null;
  allow update, delete: if isOwner(resource.data);
}

// Same rules for horses, travelPlans, tours
```

## Features to Implement

### Phase 1: Organization Management
- [ ] Create organization
- [ ] Invite members
- [ ] Manage member roles & permissions
- [ ] Switch between private/organization mode

### Phase 2: Resource Management
- [ ] Create/edit vehicles
- [ ] Create/edit horses
- [ ] View organization resources vs private resources

### Phase 3: Travel Planning
- [ ] Create travel plans
- [ ] Assign vehicles and horses
- [ ] Route planning with Google Maps
- [ ] Schedule trips

### Phase 4: Active Tours
- [ ] Start tour from travel plan or ad-hoc
- [ ] Real-time GPS tracking
- [ ] Record breaks and stops
- [ ] Complete and save tour history

## UI/UX Considerations

### Mode Switcher
- Prominent toggle in app header/drawer
- Shows current mode (Private vs Organization Name)
- Dropdown to select different organizations

### Resource Lists
- Filter by mode (show private or organization resources)
- Visual indicators for ownership
- Role-based action buttons

### Permissions
- Graceful handling of permission errors
- Clear messaging when user lacks permissions
- Request access flow for restricted actions
