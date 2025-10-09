# HorseTravel

En komplet mobilapplikation til håndtering af hestetransport. Designet til stutterier, rideklubber og transportvirksomheder for at strømline hele processen fra planlægning til dokumentation og overvågning.

## Hvad gør vi

HorseTravel er en alt-i-én platform der hjælper med at håndtere:
- **Intelligent ruteplanlægning**: GPS-baseret lokationssporing, optimerede ruter, overholdelse af EU-transportregler og omkostningsberegninger
- **Flådestyring**: Køretøjs- og hesteregister med sporing af sundhedsdata
- **Organisationsstyring**: Multi-bruger organisationer med rollebaseret adgang
- **Dokumenthåndtering**: Digitale transportdokumenter, sundhedsattester og arkivering
- **Live tracking**: Realtidsovervågning af transporter og statusopdateringer

## Team og ansvarsområder (Godkendelsesopgave 2)

### Clara Lykke Bastiansen
- **Screens**: `OrganizationSetupScreen.js`, `OrganizationDetailsScreen.js`, `ProfileSetupScreen.js`
- **Komponenter**: `ModeSwitcher.js` (rolle- og organisationsskift i UI)
- **Context & services**: `OrganizationContext.js`, `organizationService.js`, `migrationService.js`
- **Navigation**: Konfigurering af organisationsflowet i `App.js`

### Mathias Hyllberg
- **Screens**: `LoginScreen.js`, `SignupScreen.js`, `ForgotPasswordScreen.js`, `PhoneLoginScreen.js`
- **Context & services**: `AuthContext.js`, `authService.js`
- **Styles**: Auth- og formularstyling i `loginStyles.js` samt inputmønstre i `sharedStyles.js`
- **Onboarding**: Opsætning af `ProfileSetupScreen.js` valideringer (samarbejde med Clara på context-siden)

### Asbjørn Thomsen
- **Screens**: `StartTransportScreen.js` (kort, ruteplanlægning og lokation), støtte i `TransportListScreen.js` for map-relateret status
- **Komponenter**: `RouteMapModal.js`, `LocationAutocomplete.js`, `ActiveTransportHeader.js`
- **Services & utils**: `mapsService.js`, `googleMapsLoader.js`, lokationshåndtering i `platformAlerts.js`
- **Live tracking**: GPS-integration og ruteopslag, herunder knapper til ruteopdatering i transportflowet

### Martin Myrthue Pilkær
- **Screens**: `HomeScreen.js`, `TransportListScreen.js` (liste- og statuslogik), `HorseManagementScreen.js`, `VehicleManagementScreen.js`
- **Komponenter**: `HorseCard.js`, `VehicleCard.js`, `HorseSelectionModal.js`, `VehicleSelectionModal.js`
- **Context & services**: `TransportContext.js`, `transportService.js`, `horseService.js`, `vehicleService.js`
- **Firebase & data**: `src/config/firebase.js`, `firebase.json`, `firestore.rules`, `firestore.indexes.json` samt AsyncStorage-koblinger
- **Styles**: Delte layout- og farvevariabler i `globalStyles.js` og opdateringer i `sharedStyles.js`


## Godkendelsesopgave 2 – Krav & Status

Denne iteration fokuserer på innovation, stakeholderinddragelse og en udvidelse af appens funktionalitet:

- Minimum to nye skærme (Stakeholder Feedback, Dokumentcenter) samt mindst fem skærme i alt.
- Nye interaktioner via ekstra knapper (kortfiltre, feedbackindsendelse) og udvidet navigation (stack + tabs).
- Udnytter mobilfunktioner: Map API (GPS), lokationsopslag og lagring af transportdata via Firestore/AsyncStorage.
- Iteration baseret på feedback fra første godkendelsesopgave samt nye interviews med relevante stakeholdergrupper.
- Leverancer følger feedback fra første iteration med fokus på kortfunktioner, dokumentflow og stakeholder-feedbackskærme.

## Teknisk stack

### Frontend
- **Framework**: Expo SDK 54 / React Native 0.81
- **Sprog**: JavaScript (React 19)
- **UI Styling**: NativeWind (TailwindCSS til React Native)
- **Ikoner**: Lucide React Native
- **Navigation**: React Navigation (Stack & Bottom Tabs)

### Backend & Services
- **Database**: Firebase Firestore
- **Autentificering**: Firebase Auth (Email, Telefon, Google)
- **Filopbevaring**: Firebase Storage
- **Kort**: React Native Maps + Google Maps API
- **Lokation**: Expo Location

### State Management
- React Context API (AuthContext, OrganizationContext, TransportContext)

### Yderligere biblioteker
- **Async Storage**: Datapersistering
- **Date/Time Picker**: Transportplanlægning
- **Notifications**: Expo Notifications
- **Reanimated**: Glatte animationer

## Projektstruktur

```
HorseTravel/
├── src/
│   ├── components/          # Genanvendelige UI-komponenter
│   │   ├── common/         # Delte komponenter (Button, Input, Card, osv.)
│   │   ├── documents/      # Dokumentrelaterede komponenter
│   │   ├── map/           # Kortkomponenter (MapView, RouteMap)
│   │   └── transport/     # Transportspecifikke komponenter
│   │
│   ├── screens/            # App-skærme organiseret efter funktion
│   │   ├── auth/          # Login, Signup, Telefon auth
│   │   ├── home/          # Dashboard
│   │   ├── planning/      # Transportplanlægning
│   │   ├── tracking/      # Aktiv transportovervågning
│   │   ├── fleet/         # Køretøjs- og hestestyring
│   │   ├── documents/     # Dokumenthåndtering
│   │   └── profile/       # Brugerindstillinger
│   │
│   ├── services/           # Forretningslogik & API-integrationer
│   │   ├── firebase/      # Firebase config & utilities
│   │   ├── location/      # GPS & geokodning
│   │   ├── routing/       # Ruteoptimering
│   │   ├── documents/     # Dokumentgenerering
│   │   └── notifications/ # Push-notifikationer
│   │
│   ├── context/            # React Context providers
│   │   ├── AuthContext.js
│   │   ├── OrganizationContext.js
│   │   └── TransportContext.js
│   │
│   ├── utils/              # Hjælpefunktioner
│   ├── styles/             # Delte styles
│   ├── config/             # App-konfiguration
│   └── assets/             # Billeder, fonte, ikoner
│
├── App.js                  # Entry point
├── app.json               # Expo-konfiguration
├── firebase.json          # Firebase-konfiguration
├── firestore.rules        # Firestore sikkerhedsregler
├── firestore.indexes.json # Firestore indekser
├── tailwind.config.js     # TailwindCSS-konfiguration
└── .env                   # Miljøvariabler (API-nøgler)
```

## Kom i gang

### Forudsætninger
- Node.js (v16 eller højere)
- npm eller yarn
- Expo CLI
- Expo Go app (til test på mobil)
- Firebase-projekt med Firestore, Auth og Storage aktiveret
- Google Maps API-nøgle

### Installation

1. **Klon repositoriet**
   ```bash
   git clone <repository-url>
   cd HorseTravel
   ```

2. **Installer dependencies**
   ```bash
   npm install
   ```

3. **Opsæt miljøvariabler**

   Opret en `.env`-fil i rodmappen med:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=din_api_nøgle
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=din_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=dit_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=din_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=dit_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=dit_app_id
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=din_maps_api_nøgle
   ```

4. **Deploy Firestore-regler og indekser**
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes
   ```

5. **Start udviklingsserveren**
   ```bash
   npm start
   ```

6. **Kør på din enhed**
   - Scan QR-koden med Expo Go (Android) eller Kamera-app (iOS)
   - Eller brug kommandoerne:
     ```bash
     npm run android  # Til Android emulator
     npm run ios      # Til iOS simulator
     npm run web      # Til webbrowser
     ```

## Sådan fortsætter du med at arbejde

### Nuværende status
Appen har følgende funktioner implementeret:
- ✅ Brugerautentificering (Email, Telefon, Google)
- ✅ Organisationsopsætning og -styring
- ✅ Profiloprettelse
- ✅ Køretøjsstyring (CRUD)
- ✅ Hestestyring (CRUD)
- ✅ Transportplanlægning med rutekort
- ✅ Grundlæggende dokumenthåndtering
- ✅ Firebase-integration med Firestore

### Udviklingsworkflow

1. **Tilføjelse af nye funktioner**
   - Opret komponenter i `src/components/`
   - Opret skærme i `src/screens/[funktion]/`
   - Tilføj servicelogik i `src/services/`
   - Opdater context hvis state management er nødvendig

2. **Firebase-ændringer**
   - Opdater sikkerhedsregler i `firestore.rules`
   - Opdater indekser i `firestore.indexes.json`
   - Deploy med `firebase deploy`

3. **Styling**
   - Brug NativeWind-klasser (TailwindCSS-syntaks)
   - Delte styles i `src/styles/`
   - Temakonfiguration i `tailwind.config.js`

4. **Test**
   - Kør `npm start` og test på Expo Go
   - Test på både iOS og Android platforme
   - Tjek Firebase-konsollen for dataintegritet

### Næste skridt / Roadmap

**Fase 1: Live Tracking** (I gang)
- Implementer realtids GPS-tracking under aktive transporter
- Tilføj live kortopdateringer
- ETA-beregninger og opdateringer

**Fase 2: Avanceret dokumenthåndtering**
- Internationale transportdokumentskabeloner (TRACES, sundhedsattester)
- Auto-udfyldning fra transportdata
- PDF-generering og deling

**Fase 3: Notifikationer & advarsler**
- Push-notifikationer til transportopdateringer
- Forsinkelsesadvarsler
- Pausepåmindelser baseret på EU-regler

**Fase 4: Flersprogsunderstøttelse**
- Internationalisering (i18n)
- Understøttelse af engelsk, dansk, tysk

**Fase 5: Produktionsudrulning**
- Byg standalone apps
- App Store & Play Store indsendelse
- Analytics-integration

### Retningslinjer for kodestil
- Brug funktionelle komponenter med hooks
- Hold komponenter små og fokuserede
- Brug Context API til global state
- Følg eksisterende filnavngivningskonventioner
- Tilføj kommentarer til kompleks logik
- Hold Firebase-forespørgsler i servicefiler

## Dokumentation

- **[APP_STRUCTURE.md](./APP_STRUCTURE.md)**: Detaljeret projektstruktur og Firebase-skema
- **[FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md)**: Databasestruktur og relationer
- **[GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md)**: Google Maps API opsætningsguide
- **[.claude.md](./.claude.md)**: Udviklingsretningslinjer for Claude Code

## Firebase Collections

Nøgle-collections:
- `users` - Brugerprofiler
- `organizations` - Virksomheds-/klubinformation
- `vehicles` - Køretøjsregister
- `horses` - Hesteregister
- `transports` - Transportplaner og historik
- `documents` - Transportdokumenter

Se `FIRESTORE_SCHEMA.md` for detaljeret skema.

## Licens

Privat projekt - Alle rettigheder forbeholdes

## Support

Ved spørgsmål eller problemer, kontakt udviklingsteamet.
