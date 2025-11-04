# Certificate Upload Fix Summary

## Problem
The certificate service was trying to use `@react-native-firebase/storage` which requires native modules and doesn't work with Expo managed workflow.

## Solution
Updated the certificate service to use the web Firebase SDK (`firebase/storage` and `firebase/firestore`) which is already configured in your project and works with Expo.

## Changes Made

### 1. Updated `src/services/documents/certificateService.js`
- Changed imports from React Native Firebase to web Firebase SDK
- Updated all functions to use web SDK methods:
  - `uploadCertificate()` - Uses `ref()`, `uploadBytes()`, `getDownloadURL()`
  - `getCertificates()` - Uses `query()`, `collection()`, `where()`, `orderBy()`, `getDocs()`
  - `deleteCertificate()` - Uses `getDoc()`, `deleteObject()`, `deleteDoc()`
  - `updateCertificateMetadata()` - Uses `updateDoc()`

### 2. Key Differences

#### React Native Firebase (OLD - doesn't work with Expo)
```javascript
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';

const reference = storage().ref(path);
await reference.putFile(file.uri);
```

#### Web Firebase SDK (NEW - works with Expo)
```javascript
import { storage, db } from '../../config/firebase';
import { ref, uploadBytes } from 'firebase/storage';

const response = await fetch(file.uri);
const blob = await response.blob();
const storageRef = ref(storage, path);
await uploadBytes(storageRef, blob);
```

## Why This Works
1. Expo uses managed workflow - can't use native modules without ejecting
2. Web Firebase SDK works in React Native through JavaScript bridge
3. Your project already uses web Firebase SDK for auth and firestore
4. File URIs are converted to blobs for upload compatibility

## Testing
After these changes, the certificate upload should work without the native module error.

Test by:
1. Opening a vehicle or organization
2. Clicking the certificate/upload button
3. Selecting "Take Photo", "Choose Image", or "Upload PDF"
4. Verifying the upload succeeds

## Note
The `@react-native-firebase/*` packages in package.json are not being used and could be removed, but they won't cause issues if left there.

## Security
The Firebase Storage and Firestore security rules are still in place and working as configured in:
- `storage.rules`
- `firestore.rules`

Deploy them with:
```bash
firebase deploy --only storage:rules,firestore:rules
```
