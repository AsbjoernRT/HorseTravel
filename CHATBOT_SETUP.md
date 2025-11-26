# Chatbot Setup Guide

This guide explains how to set up and deploy the OpenAI-powered chatbot for your Horse Travel app.

## Overview

The chatbot is implemented using:
- **Firebase Cloud Functions** - Secure backend proxy for OpenAI API
- **OpenAI GPT-4o-mini** - Cost-effective AI model
- **React Native UI** - Already integrated in the "Spørgsmål" tab

## Setup Steps

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API keys: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (you'll only see it once!)

### 2. Configure Firebase Functions

Set the OpenAI API key in Firebase Functions configuration:

```bash
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY_HERE"
```

Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key.

To verify the configuration:
```bash
firebase functions:config:get
```

### 3. Deploy Firebase Functions

Deploy the chatbot functions to Firebase:

```bash
firebase deploy --only functions
```

This will deploy two functions:
- `chatbot` - Handles chat messages
- `getChatbotUsage` - Tracks usage statistics

### 4. Test the Chatbot

1. Open your app
2. Navigate to the "Spørgsmål" tab
3. Send a test message
4. The chatbot should respond!

## Features

### Chatbot Service (`src/services/chatbotService.js`)
- Secure communication with Firebase Functions
- Context-aware system prompt for horse transport
- Error handling and rate limiting
- Usage statistics tracking

### Cloud Functions (`functions/index.js`)
- **chatbot**: Proxies requests to OpenAI API
  - Requires user authentication
  - Logs usage to Firestore
  - Handles errors gracefully

- **getChatbotUsage**: Returns usage statistics
  - Total tokens used
  - Request count
  - Recent usage history

### UI Features
- Message history with timestamps
- Loading indicators
- Usage statistics toggle
- Error handling with toast messages
- Character limit (500 chars)

## Cost Management

The chatbot uses **GPT-4o-mini** which is very cost-effective:
- ~$0.00015 per 1K input tokens
- ~$0.0006 per 1K output tokens

Usage is tracked in Firestore collection `chatbotUsage` with:
- User ID and email
- Timestamp
- Tokens used
- Model name

## Security

✅ **Secure Implementation**:
- API key stored in Firebase Functions config (server-side)
- User authentication required
- API key never exposed to client
- Rate limiting via OpenAI

❌ **Never**:
- Hardcode API keys in client code
- Store API keys in environment variables in React Native
- Commit API keys to git

## Customization

### Change AI Model

Edit `functions/index.js` line 44:
```javascript
model: 'gpt-4o-mini', // Change to 'gpt-4o' for better responses
```

### Adjust Response Length

Edit `functions/index.js` line 46:
```javascript
max_tokens: 500, // Increase for longer responses
```

### Customize System Prompt

Edit `src/services/chatbotService.js` line 13-18 to change the chatbot's behavior and context.

## Troubleshooting

### Error: "unauthenticated"
- User must be logged in to use chatbot
- Check Firebase Auth is working

### Error: "Invalid API key"
- Verify API key is set: `firebase functions:config:get`
- Redeploy functions after setting key

### Error: "Rate limit exceeded"
- OpenAI rate limits apply
- Wait a moment and try again
- Consider upgrading OpenAI plan

### Function not found
- Ensure functions are deployed: `firebase deploy --only functions`
- Check Firebase Console > Functions

## Monitoring

### View Logs
```bash
firebase functions:log
```

### View Usage in Firestore
Check the `chatbotUsage` collection in Firebase Console

### Cost Tracking
Monitor costs in OpenAI dashboard: https://platform.openai.com/usage

## Next Steps

- [ ] Set up billing alerts in OpenAI dashboard
- [ ] Configure Firestore security rules for `chatbotUsage` collection
- [ ] Add rate limiting per user (optional)
- [ ] Customize system prompt for your use case
- [ ] Add more conversational context

## Support

For issues or questions:
- OpenAI API docs: https://platform.openai.com/docs
- Firebase Functions docs: https://firebase.google.com/docs/functions
