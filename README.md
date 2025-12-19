# HorseTravel

![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat&logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth-FFCA28?style=flat&logo=firebase)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey?style=flat)

> En komplet mobilapplikation til hestetransport. Designet til stutterier, rideklubber og transportvirksomheder.


## Indhold

- [Features](#features)
- [Screenshots](#screenshots)
- [Teknisk Stack](#teknisk-stack)
- [Projektstruktur](#projektstruktur)
- [Kom i Gang](#kom-i-gang)
- [Team](#team)
- [Dokumentation](#dokumentation)
- [Firebase Collections](#firebase-collections)
- [Bidrag](#bidrag)
- [Licens](#licens)

## Teknisk Stack

### Frontend
| Teknologi | Version |
|-----------|---------|
| Expo SDK | 54 |
| React Native | 0.81 |
| React | 19 |
| NativeWind | TailwindCSS for RN |
| Lucide Icons | React Native |

### Backend & Services
| Service | Anvendelse |
|---------|------------|
| Firebase Firestore | Database |
| Firebase Auth | Email, Telefon, Google |
| Firebase Storage | Filopbevaring |
| Google Maps API | Kort og ruteplanlægning |
| Expo Location | GPS tracking |

### State Management
- React Context API (`AuthContext`, `OrganizationContext`, `TransportContext`)

## Projektstruktur

```
HorseTravel/
├── src/
│   ├── components/          # Genanvendelige UI-komponenter
│   │   ├── common/          # Delte komponenter (Button, Input, Card)
│   │   ├── documents/       # Dokumentrelaterede komponenter
│   │   ├── map/             # Kortkomponenter
│   │   └── transport/       # Transportspecifikke komponenter
│   │
│   ├── screens/             # App-skærme
│   │   ├── auth/            # Login, Signup, Telefon auth
│   │   ├── home/            # Dashboard
│   │   ├── planning/        # Transportplanlægning
│   │   ├── tracking/        # Aktiv transportovervågning
│   │   ├── fleet/           # Køretøjs- og hestestyring
│   │   └── profile/         # Brugerindstillinger
│   │
│   ├── services/            # Forretningslogik & API
│   │   ├── firebase/        # Firebase config & utilities
│   │   ├── location/        # GPS & geokodning
│   │   └── documents/       # Dokumentgenerering
│   │
│   ├── context/             # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── constants/           # Konstanter og enums
│   ├── utils/               # Hjælpefunktioner
│   ├── styles/              # Delte styles
│   ├── config/              # App-konfiguration
│   └── assets/              # Billeder, fonts, ikoner
│
├── App.js                   # Entry point
├── app.json                 # Expo-konfiguration
├── firebase.json            # Firebase-konfiguration
├── firestore.rules          # Firestore sikkerhedsregler
├── firestore.indexes.json   # Firestore indekser
└── tailwind.config.js       # TailwindCSS-konfiguration
```

## Kom i Gang

### Forudsætninger

- Node.js v16+
- npm eller yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app (til test på mobil)
- Firebase-projekt med Firestore, Auth og Storage
- Google Maps API-nøgle

### Installation

```bash
# 1. Klon repositoriet
git clone <repository-url>
cd HorseTravel

# 2. Installer dependencies
npm install

# 3. Opret .env fil med dine API-nøgler
cp .env.example .env
# Udfyld værdierne i .env

# 4. Deploy Firestore-regler
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# 5. Start udviklings-serveren
npm start
```

### Miljøvariabler

Opret en `.env` fil i rodmappen:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=din_api_nøgle
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=din_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=dit_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=din_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=dit_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=dit_app_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=din_maps_api_nøgle
```

### Kør Appen

```bash
npm run android  # Android emulator
npm run ios      # iOS simulator
npm run web      # Web browser
```

Eller scan QR-koden med Expo Go.

---

## Team

| Medlem | Ansvarsområder |
|--------|----------------|
| **Clara Lykke Bastiansen** | Organisationer, Profilopsætning, ModeSwitcher |
| **Mathias Hyllberg** | Autentificering, Auth styling, Onboarding |
| **Asbjørn Thomsen** | Maps, Ruteplanlægning, GPS tracking, Live tracking |
| **Martin Myrthue Pilkær** | Home, Transport, Fleet management, Firebase |

---

## Dokumentation

| Dokument | Beskrivelse |
|----------|-------------|
| [APP_STRUCTURE.md](./APP_STRUCTURE.md) | Detaljeret projektstruktur |
| [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md) | Databasestruktur og relationer |
| [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) | Google Maps API opsætning |

## Firebase Collections

| Collection | Beskrivelse |
|------------|-------------|
| `users` | Brugerprofiler |
| `organizations` | Virksomheds-/klubinformation |
| `vehicles` | Køretøjsregister |
| `horses` | Hesteregister |
| `transports` | Transportplaner og historik |
| `documents` | Transportdokumenter |

Se [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md) for detaljeret skema.
