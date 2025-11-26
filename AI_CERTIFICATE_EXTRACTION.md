# AI Certificate Extraction

This feature uses OpenAI's Vision API (GPT-4o) to automatically extract data from transport authorization certificate images.

## Setup

1. **Get an OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Create an API key from the API Keys section
   - Make sure you have credits available

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key:
     ```
     EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-key-here
     ```

3. **Restart Expo**
   - Stop the development server
   - Clear cache: `npx expo start -c`

## Usage

### In Organization Details Screen

The AI extraction is automatically enabled when you upload a certificate image:

```javascript
<CertificateUploader
  entityType="organization"
  entityId={organizationId}
  enableAIExtraction={true}  // Enable AI extraction
/>
```

### Extracted Data Structure

The AI extracts the following information:

```json
{
  "company_authorisation_id": "unique ID",
  "company": {
    "name": "Company Name",
    "address": {
      "street": "Street Address",
      "postal_code": "12345",
      "city": "City",
      "country": "Country"
    },
    "contact": {
      "phone": "+45 12345678",
      "email": "contact@company.com"
    }
  },
  "authorisation": {
    "authorisation_number": "AUTH-12345",
    "journey_type": "TYPE_1",  // TYPE_1 (≤8h) or TYPE_2 (>8h)
    "animal_categories": ["Horses"],
    "transport_modes": ["Road"],
    "issue_date": "2024-01-01",
    "expiry_date": "2025-01-01"
  },
  "issuing_authority": {
    "name": "Authority Name",
    "address": "Authority Address",
    "contact": {
      "phone": "+45 87654321",
      "fax": null,
      "email": "authority@gov.dk"
    },
    "official_name": "Official Name"
  },
  "meta": {
    "document_language": "da",
    "notes": "Additional notes"
  }
}
```

## How It Works

1. **User uploads an image** (JPEG, PNG, HEIC, etc.)
2. **Image is converted to base64** for API transmission
3. **OpenAI Vision API analyzes** the certificate
4. **Structured data is extracted** and validated
5. **Data is stored** with the certificate in Firestore

## Flow

```
┌─────────────────┐
│  User uploads   │
│  certificate    │
│     image       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Convert to      │
│ base64          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call OpenAI     │
│ Vision API      │
│ (gpt-4o)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse & Validate│
│ JSON response   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upload to       │
│ Firebase with   │
│ extracted data  │
└─────────────────┘
```

## Error Handling

- **If AI extraction fails**: The file is still uploaded, but without extracted data
- **If validation fails**: A warning is shown, but the upload continues
- **Partial extraction**: User is notified to check the data

## Cost Considerations

- **OpenAI Vision API pricing** (as of 2024):
  - Input: ~$0.01 per image
  - Output: ~$0.03 per 1K tokens

- **Estimated cost per certificate**: $0.02 - $0.05

## Security Note

⚠️ **IMPORTANT**: Currently, the OpenAI API is called directly from the client with `dangerouslyAllowBrowser: true`.

**For production**, you should:
1. Move the OpenAI API calls to a Cloud Function
2. Call the Cloud Function from the app
3. Keep the API key secure on the backend

Example Cloud Function:
```javascript
// functions/extractCertificate.js
const functions = require('firebase-functions');
const OpenAI = require('openai');

exports.extractCertificate = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const openai = new OpenAI({ apiKey: functions.config().openai.key });

  // Call OpenAI API securely from backend
  const response = await openai.chat.completions.create({...});

  return response;
});
```

## Supported Document Types

- ✅ JPEG/JPG images
- ✅ PNG images
- ✅ HEIC/HEIF images (iOS)
- ❌ PDF (not yet supported for AI extraction, but can be uploaded)

## Future Enhancements

- [ ] Support PDF extraction
- [ ] Multi-page document handling
- [ ] Confidence scores for extracted fields
- [ ] Manual correction UI for extracted data
- [ ] Batch processing
- [ ] Custom training for specific certificate formats
