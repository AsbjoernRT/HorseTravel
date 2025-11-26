# Knowledge Documents Guide

This guide explains how to add knowledge documents that the AI chatbot can retrieve and use to answer questions.

## Overview

The chatbot now supports **function calling** and can:
- ✅ Fetch user's horses (private + organization)
- ✅ Fetch user's vehicles (private + organization)
- ✅ Fetch active transports
- ✅ Fetch transport history
- ✅ Retrieve knowledge documents about regulations

## How It Works

When users ask questions, the AI automatically:
1. Detects what information is needed
2. Calls the appropriate functions to fetch data
3. Uses the real data to provide accurate, personalized answers

### Example Conversations:

**User:** "Hvilke heste har jeg?"
**AI:** *Calls `get_user_horses()`* → "Du har 3 heste: Bella (Privat), Thunder (Organisation), og Storm (Privat)."

**User:** "Har jeg nogen aktive transporter?"
**AI:** *Calls `get_active_transports()`* → "Ja, du har 1 aktiv transport fra København til Aarhus med Bella."

## Adding Knowledge Documents

Knowledge documents allow the AI to answer questions about regulations, rules, and best practices.

### Firestore Structure

Add documents to the `knowledgeDocuments` collection:

```javascript
{
  title: "Transportregler for Heste i Danmark",
  topics: ["transport_regulations", "danish_law", "documentation"],
  content: "Complete text content of the document...",
  source: "Fødevarestyrelsen",
  lastUpdated: Timestamp
}
```

### Field Descriptions:

- **`title`** - Document title (shown to users)
- **`topics`** - Array of lowercase topics for search (e.g., ["transport_regulations", "animal_welfare"])
- **`content`** - Full text content (can be long)
- **`source`** - Where the information came from
- **`lastUpdated`** - Timestamp of last update

### Adding via Firebase Console:

1. Go to Firebase Console → Firestore
2. Create collection: `knowledgeDocuments`
3. Add a new document with the structure above

### Adding via Script:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function addKnowledgeDocument() {
  await db.collection('knowledgeDocuments').add({
    title: "Krav til Hestetransport over 8 Timer",
    topics: ["transport_regulations", "long_distance", "rest_periods"],
    content: `
      Ved transport af heste over 8 timer skal følgende krav overholdes:

      1. Hvileperioder: Mindst 1 times hvile efter hver 8. time
      2. Vand: Adgang til frisk vand mindst hver 4. time
      3. Foder: Passende foder tilgængeligt
      4. Dokumentation: Transportdokumentation skal medbringes
      5. Certificering: Chauffør skal have certifikat til lang transport

      Læs mere: https://www.foedevarestyrelsen.dk
    `,
    source: "Fødevarestyrelsen - Transportforordningen",
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Knowledge document added!');
}

addKnowledgeDocument();
```

## Common Topics to Use:

- `transport_regulations` - General transport rules
- `animal_welfare` - Animal welfare requirements
- `documentation` - Required paperwork
- `long_distance` - Long distance transport rules
- `rest_periods` - Rest and break requirements
- `vehicle_requirements` - Vehicle specifications
- `driver_certification` - Driver requirements
- `emergency_procedures` - What to do in emergencies
- `temperature_requirements` - Temperature control
- `border_crossing` - International transport

## Best Practices:

1. **Keep content focused** - One topic per document
2. **Use clear language** - Write in Danish for Danish users
3. **Include sources** - Always cite official sources
4. **Update regularly** - Mark `lastUpdated` when changing
5. **Multiple topics** - Add multiple relevant topics to improve search

## Example Documents to Add:

### 1. Basic Transport Requirements
```javascript
{
  title: "Grundlæggende Krav til Hestetransport",
  topics: ["transport_regulations", "basic_requirements"],
  content: "All basic transport requirements...",
  source: "Fødevarestyrelsen",
  lastUpdated: Timestamp
}
```

### 2. Vehicle Requirements
```javascript
{
  title: "Krav til Hestetrailere og Transportkøretøjer",
  topics: ["vehicle_requirements", "safety", "equipment"],
  content: "Vehicle specifications and requirements...",
  source: "Transportforordningen",
  lastUpdated: Timestamp
}
```

### 3. Health Documentation
```javascript
{
  title: "Påkrævet Sundhedsdokumentation",
  topics: ["documentation", "health_certificates", "veterinary"],
  content: "Required health certificates and documents...",
  source: "Fødevarestyrelsen",
  lastUpdated: Timestamp
}
```

## Testing

After adding documents, test the chatbot:

**User:** "Hvad er kravene til transport over 8 timer?"
**AI:** *Calls `get_knowledge_document("long_distance")`* → Returns the relevant document content

## Monitoring

Check Firebase Functions logs to see which functions are being called:

```bash
firebase functions:log
```

Look for log entries like:
```
Executing tool: get_knowledge_document { topic: 'transport_regulations' }
```

## Future Enhancements

Potential improvements:
- [ ] Vector embeddings for better search
- [ ] Multi-document retrieval
- [ ] User feedback on answer quality
- [ ] Automatic document updates from external sources
- [ ] Support for PDF uploads

## Support

The AI automatically calls the appropriate functions based on user questions. No changes needed to the frontend!
