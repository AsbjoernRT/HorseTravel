# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HorseTravel is a mobile application for managing horse transportation logistics. Built with Expo (React Native), it's designed for studs, riding clubs, and transport companies to streamline planning, tracking, and documentation of horse transports.

## Technology Stack

**Frontend:**
- Expo SDK 54 / React Native 0.81
- React 19
- JavaScript (no TypeScript)
- NativeWind (TailwindCSS for React Native)
- Lucide React Native (icons)
- React Navigation (Stack + Bottom Tabs)

**Backend & Services:**
- Firebase Firestore (database)
- Firebase Auth (Email, Phone, Google)
- Firebase Storage (file uploads)
- React Native Maps + Google Maps API
- Expo Location (GPS tracking)

**State Management:**
- React Context API (`AuthContext`, `OrganizationContext`, `TransportContext`)

## Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web

# Deploy Firebase rules and indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# Clear Expo cache (if experiencing issues)
expo start -c
```

## Architecture Overview

### Context Providers (Global State)

Three main context providers wrap the entire app in `App.js`:

1. **AuthContext** (`src/context/AuthContext.js`)
   - Manages Firebase authentication state
   - Automatically fetches user profile from Firestore on auth changes
   - Runs migration service to update legacy data
   - Determines if user needs profile setup (phone auth without name)
   - Provides: `user`, `userProfile`, `loading`, `needsProfileSetup`

2. **OrganizationContext** (`src/context/OrganizationContext.js`)
   - Manages private vs organization mode switching
   - Loads user's organizations and restores last active mode
   - Provides permission checking based on active role
   - Provides: `organizations`, `activeMode`, `activeOrganization`, `switchMode()`, `hasPermission()`, `getCurrentContext()`

3. **TransportContext** (`src/context/TransportContext.js`)
   - Lightweight in-memory state for active transport sessions
   - Tracks active transport, completed transports, and real-time updates
   - Provides: `activeTransport`, `startTransport()`, `stopTransport()`, `updateTransport()`

### Navigation Flow

The app uses a conditional navigation structure based on auth state:

```
RootNavigator (conditionally renders based on auth state)
├─ AuthStack (if !user)
│  ├─ Login
│  ├─ Signup
│  ├─ ForgotPassword
│  └─ PhoneLogin
│
├─ ProfileSetupStack (if user && needsProfileSetup)
│  └─ ProfileSetup
│
└─ MainStack (if user && !needsProfileSetup)
   ├─ MainTabs (Bottom Tabs)
   │  ├─ Home (HomeScreen)
   │  ├─ VehicleManagement
   │  ├─ HorseManagement
   │  └─ TransportList
   │
   └─ Modal Screens (Stack)
      ├─ OrganizationSetup
      ├─ OrganizationDetails
      ├─ StartTransport
      └─ TransportDetails
```

**Important:** `ActiveTransportHeader` is rendered globally in `MainStack` header to show active transport status across all screens.

### Service Layer Architecture

Services in `src/services/` handle all Firebase operations and business logic:

- **authService.js**: Firebase Auth operations (signup, signin, phone auth, Google OAuth)
- **organizationService.js**: Organization CRUD, member management, invitations, join-by-code
- **vehicleService.js**: Vehicle CRUD operations (scoped by private/organization mode)
- **horseService.js**: Horse CRUD operations (scoped by private/organization mode)
- **transportService.js**: Transport planning and tracking operations
- **migrationService.js**: Handles data migrations for existing users
- **mapsService.js**: Google Maps integration for route planning and geocoding

**Key Pattern:** All services use `auth.currentUser` to identify the user and check `userProfile.activeMode` and `userProfile.activeOrganizationId` to scope data access.

### Data Scoping: Private vs Organization Mode

Resources (vehicles, horses, transports) can be owned in two modes:

**Private Mode:**
```javascript
{
  ownerType: 'private',
  ownerId: userId,
  organizationId: null
}
```

**Organization Mode:**
```javascript
{
  ownerType: 'organization',
  ownerId: userId,           // Creator
  organizationId: orgId
}
```

**Firestore Security Rules** enforce:
- Private resources: only owner can access
- Organization resources: all members can read, permission-based write access
- Rules check organization membership via `organizations/{orgId}/members/{userId}` subcollection

### Organization System

Users can create or join organizations and switch between private/organization contexts:

**Organization Structure:**
```
organizations/{orgId}
  - name, description, ownerId, organizationCode (for joining)
  - settings: { allowMembersToCreateVehicles, allowMembersToCreateHorses, allowMembersToCreateTours }

  /members/{userId} (subcollection)
    - role: 'owner' | 'admin' | 'member'
    - permissions: { canManageMembers, canManageVehicles, canManageHorses, canManageTours }
    - status: 'pending' | 'active' | 'inactive'
```

**User Profile includes:**
```javascript
users/{userId}
  - activeMode: 'private' | 'organization'
  - activeOrganizationId: string | null
  - organizationIds: array<string>  // All orgs user is member of
```

### Key Firebase Collections

- `users` - User profiles (email, displayName, provider, activeMode, activeOrganizationId)
- `organizations` - Organization documents with settings
- `organizations/{id}/members` - Member subcollection with roles and permissions
- `vehicles` - Vehicle registry (ownerType, ownerId, organizationId)
- `horses` - Horse registry (ownerType, ownerId, organizationId)
- `transports` - Transport plans and tracking (ownerType, ownerId, organizationId)
- `documents` - Transport documents and certificates
- `invitations` - Pending organization invitations

## Common Development Tasks

### Adding a New Screen

1. Create screen file in `src/screens/` with appropriate category folder
2. Import and add to navigation in `App.js` (either in MainTabs or MainStack)
3. Use relevant contexts: `useAuth()`, `useOrganization()`, `useTransport()`
4. Call service functions from `src/services/` for Firebase operations

### Creating Resources (Vehicles, Horses, Transports)

Always scope resources by current organization context:

```javascript
import { useOrganization } from '../context/OrganizationContext';

const { getCurrentContext } = useOrganization();
const context = getCurrentContext(); // { mode: 'private'|'organization', organizationId }

const vehicleData = {
  name,
  type,
  ownerType: context.mode,
  ownerId: auth.currentUser.uid,
  organizationId: context.organizationId,
  // ... other fields
};

await createVehicle(vehicleData);
```

### Checking Permissions

Use `hasPermission()` from OrganizationContext:

```javascript
const { hasPermission } = useOrganization();

if (!hasPermission('canManageVehicles')) {
  // Show error or disable UI
  return;
}
```

### Working with Firebase

- All Firebase operations should be in service files, not components
- Use `serverTimestamp()` for createdAt/updatedAt fields
- Handle errors with try/catch and show user-friendly messages
- Keep Firestore queries scoped by user/organization for security
- Update `firestore.rules` when adding new collections or changing access patterns

### Environment Variables

Required in `.env` file (never commit this file):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Access in code via `process.env.EXPO_PUBLIC_*`

## Code Style Guidelines

- Use functional components with hooks (no class components)
- Keep components small and focused (extract reusable components to `src/components/`)
- Use NativeWind classes for styling (TailwindCSS syntax)
- All async operations should use async/await with try/catch
- Service functions should throw errors with Danish user-friendly messages
- Follow existing naming conventions (camelCase for functions/variables, PascalCase for components)

## Team Responsibilities

See README.md for detailed team member responsibilities per screen/module.

**Key areas:**
- **Clara**: Organizations, profile setup, mode switcher
- **Mathias**: Authentication flows and styling
- **Asbjørn**: Maps, route planning, GPS tracking
- **Martin**: Home screen, transport management, fleet management, Firebase integration

## Migration Service

`migrationService.js` runs automatically on auth state changes to update legacy user profiles. When adding new required fields to user profiles, add migration logic here.

## Important Notes

- Phone auth users start with `profileComplete: false` and are redirected to ProfileSetupScreen
- Google/Email auth users have `profileComplete: true` by default
- Organization invitations expire after 7 days
- Organization codes are 6-character alphanumeric (uppercase)
- Firestore security rules enforce all access control - never rely on client-side checks alone
- The app uses AsyncStorage for local data persistence in addition to Firestore
- Map functionality requires valid Google Maps API key with Maps SDK, Places API, and Directions API enabled

## Testing

- Test on both iOS and Android via Expo Go app
- Verify organization permissions work correctly (owner, admin, member roles)
- Test mode switching between private and organization contexts
- Verify Firebase security rules prevent unauthorized access
- Test offline behavior (AsyncStorage should cache critical data)

## Debugging Tips

- **Firebase errors**: Check `.env` configuration and Firebase console
- **Map not showing**: Verify Google Maps API key and enabled APIs
- **GPS not working**: Check location permissions in `app.json`
- **Auth issues**: Clear app data and test fresh signup flow
- **Context not updating**: Ensure components are wrapped in correct provider
- **Expo errors**: Clear cache with `expo start -c`

## Additional Documentation

- **APP_STRUCTURE.md**: Detailed folder structure
- **FIRESTORE_SCHEMA.md**: Database schema and security rules
- **ORGANIZATION_DESIGN.md**: Organization system design document
- **GOOGLE_MAPS_SETUP.md**: Google Maps API setup guide
