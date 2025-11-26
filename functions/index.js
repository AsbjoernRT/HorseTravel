const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();

// Set functions region to europe-west1
const regionalFunctions = functions.region('europe-west1');

// Lazy initialize OpenAI client
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in .env file');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Helper function to get user's organization memberships
 */
async function getUserOrganizations(userId) {
  const db = admin.firestore();
  const orgsSnapshot = await db
    .collection('organizationMembers')
    .where('userId', '==', userId)
    .get();

  return orgsSnapshot.docs.map(doc => doc.data().organizationId);
}

/**
 * Tool: Get user's horses (context-aware: private OR organization only)
 */
async function getUserHorses(userId, activeMode, activeOrganizationId) {
  const db = admin.firestore();
  const horses = [];

  if (activeMode === 'private') {
    // Get only private horses
    const privateHorses = await db
      .collection('horses')
      .where('ownerId', '==', userId)
      .where('ownerType', '==', 'private')
      .get();

    privateHorses.forEach(doc => {
      const data = doc.data();
      horses.push({
        id: doc.id,
        name: data.name || 'Unavngivet',
        type: 'Privat',
        chipNumber: data.chipNumber,
        passport: data.passport,
        breed: data.breed,
        color: data.color,
        notes: data.notes,
      });
    });
  } else if (activeMode === 'organization' && activeOrganizationId) {
    // Get only this organization's horses
    const orgHorses = await db
      .collection('horses')
      .where('organizationId', '==', activeOrganizationId)
      .where('ownerType', '==', 'organization')
      .get();

    orgHorses.forEach(doc => {
      const data = doc.data();
      horses.push({
        id: doc.id,
        name: data.name || 'Unavngivet',
        type: 'Organisation',
        chipNumber: data.chipNumber,
        passport: data.passport,
        breed: data.breed,
        color: data.color,
        notes: data.notes,
      });
    });
  }

  return horses;
}

/**
 * Tool: Get user's vehicles (context-aware: private OR organization only)
 */
async function getUserVehicles(userId, activeMode, activeOrganizationId) {
  const db = admin.firestore();
  const vehicles = [];

  if (activeMode === 'private') {
    // Get only private vehicles
    const privateVehicles = await db
      .collection('vehicles')
      .where('ownerId', '==', userId)
      .where('ownerType', '==', 'private')
      .get();

    privateVehicles.forEach(doc => {
      const data = doc.data();
      vehicles.push({
        id: doc.id,
        type: 'Privat',
        licensePlate: data.licensePlate,
        make: data.make,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
        notes: data.notes,
      });
    });
  } else if (activeMode === 'organization' && activeOrganizationId) {
    // Get only this organization's vehicles
    const orgVehicles = await db
      .collection('vehicles')
      .where('organizationId', '==', activeOrganizationId)
      .where('ownerType', '==', 'organization')
      .get();

    orgVehicles.forEach(doc => {
      const data = doc.data();
      vehicles.push({
        id: doc.id,
        type: 'Organisation',
        licensePlate: data.licensePlate,
        make: data.make,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
        notes: data.notes,
      });
    });
  }

  return vehicles;
}

/**
 * Tool: Get user's active transports (context-aware)
 */
async function getActiveTransports(userId, activeMode, activeOrganizationId) {
  const db = admin.firestore();
  const transports = [];

  if (activeMode === 'private') {
    // Get only private active transports
    const privateTransports = await db
      .collection('transports')
      .where('ownerId', '==', userId)
      .where('ownerType', '==', 'private')
      .where('status', 'in', ['pending', 'in_progress'])
      .get();

    privateTransports.forEach(doc => {
      const data = doc.data();
      transports.push({
        id: doc.id,
        type: 'Privat',
        status: data.status,
        startLocation: data.fromLocation || data.startLocation,
        endLocation: data.toLocation || data.endLocation,
        startTime: data.actualStartTime || data.startTime,
        horsesCount: data.horseCount || data.horses?.length || 0,
        horseNames: data.horseNames || [],
        horseIds: data.horseIds || [],
        vehicleName: data.vehicleName,
        trailerName: data.trailerName,
      });
    });
  } else if (activeMode === 'organization' && activeOrganizationId) {
    // Get only this organization's active transports
    const orgTransports = await db
      .collection('transports')
      .where('organizationId', '==', activeOrganizationId)
      .where('ownerType', '==', 'organization')
      .where('status', 'in', ['pending', 'in_progress'])
      .get();

    orgTransports.forEach(doc => {
      const data = doc.data();
      transports.push({
        id: doc.id,
        type: 'Organisation',
        status: data.status,
        startLocation: data.fromLocation || data.startLocation,
        endLocation: data.toLocation || data.endLocation,
        startTime: data.actualStartTime || data.startTime,
        horsesCount: data.horseCount || data.horses?.length || 0,
        horseNames: data.horseNames || [],
        horseIds: data.horseIds || [],
        vehicleName: data.vehicleName,
        trailerName: data.trailerName,
      });
    });
  }

  return transports;
}

/**
 * Tool: Get user's transport history (context-aware)
 */
async function getTransportHistory(userId, activeMode, activeOrganizationId, limit = 10) {
  const db = admin.firestore();
  const transports = [];

  if (activeMode === 'private') {
    // Get only private completed transports
    const privateTransports = await db
      .collection('transports')
      .where('ownerId', '==', userId)
      .where('ownerType', '==', 'private')
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    privateTransports.forEach(doc => {
      const data = doc.data();
      transports.push({
        id: doc.id,
        type: 'Privat',
        status: data.status,
        startLocation: data.fromLocation || data.startLocation,
        endLocation: data.toLocation || data.endLocation,
        completedAt: data.actualEndTime || data.endTime,
        horsesCount: data.horseCount || data.horses?.length || 0,
        horseNames: data.horseNames || [],
        horseIds: data.horseIds || [],
        distance: data.routeInfo?.distanceText || data.distance,
        vehicleName: data.vehicleName,
        trailerName: data.trailerName,
      });
    });
  } else if (activeMode === 'organization' && activeOrganizationId) {
    // Get only this organization's completed transports
    const orgTransports = await db
      .collection('transports')
      .where('organizationId', '==', activeOrganizationId)
      .where('ownerType', '==', 'organization')
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    orgTransports.forEach(doc => {
      const data = doc.data();
      transports.push({
        id: doc.id,
        type: 'Organisation',
        status: data.status,
        startLocation: data.fromLocation || data.startLocation,
        endLocation: data.toLocation || data.endLocation,
        completedAt: data.actualEndTime || data.endTime,
        horsesCount: data.horseCount || data.horses?.length || 0,
        horseNames: data.horseNames || [],
        horseIds: data.horseIds || [],
        distance: data.routeInfo?.distanceText || data.distance,
        vehicleName: data.vehicleName,
        trailerName: data.trailerName,
      });
    });
  }

  return transports;
}

/**
 * Tool: Get knowledge document
 */
async function getKnowledgeDocument(topic) {
  const db = admin.firestore();

  // Search for knowledge documents by topic
  const docsSnapshot = await db
    .collection('knowledgeDocuments')
    .where('topics', 'array-contains', topic.toLowerCase())
    .limit(1)
    .get();

  if (docsSnapshot.empty) {
    return { found: false, message: 'Ingen dokumenter fundet for dette emne.' };
  }

  const doc = docsSnapshot.docs[0].data();
  return {
    found: true,
    title: doc.title,
    content: doc.content,
    source: doc.source,
    lastUpdated: doc.lastUpdated,
  };
}

/**
 * Execute tool calls with context
 */
async function executeToolCall(toolName, args, userId, activeMode, activeOrganizationId) {
  switch (toolName) {
    case 'get_user_horses':
      return await getUserHorses(userId, activeMode, activeOrganizationId);

    case 'get_user_vehicles':
      return await getUserVehicles(userId, activeMode, activeOrganizationId);

    case 'get_active_transports':
      return await getActiveTransports(userId, activeMode, activeOrganizationId);

    case 'get_transport_history':
      return await getTransportHistory(userId, activeMode, activeOrganizationId, args.limit || 10);

    case 'get_knowledge_document':
      return await getKnowledgeDocument(args.topic);

    default:
      return { error: 'Unknown tool' };
  }
}

// Define available tools for OpenAI
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_user_horses',
      description: 'Get all horses owned by the user (both private and from organizations they belong to)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_vehicles',
      description: 'Get all vehicles owned by the user (both private and from organizations)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_active_transports',
      description: 'Get all active transports (pending or in progress) for the user',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transport_history',
      description: 'Get completed transport history for the user',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of transports to return (default 10)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_knowledge_document',
      description: 'Search and retrieve knowledge documents about horse transport regulations, rules, and best practices',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The topic to search for (e.g., "transport_regulations", "animal_welfare", "documentation")',
          },
        },
        required: ['topic'],
      },
    },
  },
];

/**
 * Cloud Function to handle chatbot requests with function calling
 * This proxies requests to OpenAI API while keeping the API key secure
 */
exports.chatbot = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use chatbot'
    );
  }

  const { messages, systemPrompt, activeMode, activeOrganizationId } = data;
  const userId = context.auth.uid;

  // Validate input
  if (!messages || !Array.isArray(messages)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Messages array is required'
    );
  }

  // Default to private mode if not specified
  const userMode = activeMode || 'private';
  const userOrgId = activeOrganizationId || null;

  try {
    // Build messages array with system prompt if provided
    const allMessages = [];

    if (systemPrompt) {
      allMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    allMessages.push(...messages);

    const openai = getOpenAI();
    let totalTokens = 0;

    // Initial API call with tools
    let completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 1000,
      temperature: 0.7,
    });

    totalTokens += completion.usage.total_tokens;

    // Handle function calls (may need multiple iterations)
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (completion.choices[0].finish_reason === 'tool_calls' && iterations < maxIterations) {
      const toolCalls = completion.choices[0].message.tool_calls;

      // Add assistant message with tool calls to conversation
      allMessages.push(completion.choices[0].message);

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`Executing tool: ${functionName}`, functionArgs, `Mode: ${userMode}`);

        // Execute the tool with context
        const toolResult = await executeToolCall(functionName, functionArgs, userId, userMode, userOrgId);

        console.log(`Tool result for ${functionName}:`, JSON.stringify(toolResult).substring(0, 500));

        // Add tool response to messages
        allMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Call API again with tool results
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: allMessages,
        tools: tools,
        tool_choice: 'auto',
        max_tokens: 1000,
        temperature: 0.7,
      });

      totalTokens += completion.usage.total_tokens;
      iterations++;
    }

    // Log usage
    const db = admin.firestore();
    await db.collection('chatbotUsage').add({
      userId: context.auth.uid,
      userEmail: context.auth.token.email || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      tokensUsed: totalTokens,
      model: completion.model,
      toolCallsUsed: iterations > 0,
    });

    // Return the final response
    return {
      message: completion.choices[0].message.content,
      usage: { total_tokens: totalTokens },
      toolsUsed: iterations > 0,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);

    if (error.status === 429) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Rate limit exceeded. Please try again later.'
      );
    }

    if (error.status === 401) {
      throw new functions.https.HttpsError(
        'internal',
        'Invalid API key configuration'
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to process chatbot request: ' + error.message
    );
  }
});

/**
 * Cloud Function to get chatbot usage statistics for a user
 */
exports.getChatbotUsage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection('chatbotUsage')
      .where('userId', '==', context.auth.uid)
      .orderBy('timestamp', 'desc')
      .limit(30)
      .get();

    const usage = [];
    let totalTokens = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      usage.push({
        id: doc.id,
        timestamp: data.timestamp,
        tokensUsed: data.tokensUsed,
        model: data.model,
      });
      totalTokens += data.tokensUsed;
    });

    return {
      usage,
      totalTokens,
      requestCount: usage.length,
    };
  } catch (error) {
    console.error('Error fetching usage:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch usage statistics'
    );
  }
});

// JSON Schema for Vehicle Certificate
const vehicleCertificateSchema = {
  type: 'object',
  properties: {
    vehicle_certificate_id: { type: 'string' },
    vehicle: {
      type: 'object',
      properties: {
        registration_number: { type: 'string' },
        vin: { type: 'string' },
        make: { type: 'string' },
        model: { type: ['string', 'null'] },
      },
      required: ['registration_number', 'vin', 'make'],
      additionalProperties: false,
    },
    certificate: {
      type: 'object',
      properties: {
        certificate_number: { type: 'string' },
        issue_date: { type: 'string' },
        expiry_date: { type: 'string' },
        animal_categories: { type: 'array', items: { type: 'string' } },
        transport_mode: { type: 'string' },
        area_per_deck_m2: {
          type: 'object',
          properties: {
            deck_1: { type: ['number', 'null'] },
            deck_2: { type: ['number', 'null'] },
            deck_3: { type: ['number', 'null'] },
          },
          required: ['deck_1', 'deck_2', 'deck_3'],
          additionalProperties: false,
        },
        has_satellite_navigation_system: { type: 'boolean' },
      },
      required: [
        'certificate_number',
        'issue_date',
        'expiry_date',
        'animal_categories',
        'transport_mode',
        'area_per_deck_m2',
        'has_satellite_navigation_system',
      ],
      additionalProperties: false,
    },
    issuing_body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' },
        contact: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['phone', 'email'],
          additionalProperties: false,
        },
        location_of_issue: { type: 'string' },
        official_name: { type: 'string' },
      },
      required: ['name', 'address', 'contact', 'location_of_issue'],
      additionalProperties: false,
    },
    meta: {
      type: 'object',
      properties: {
        document_language: { type: 'string' },
        notes: { type: ['string', 'null'] },
      },
      required: ['document_language'],
      additionalProperties: false,
    },
  },
  required: [
    'vehicle_certificate_id',
    'vehicle',
    'certificate',
    'issuing_body',
    'meta',
  ],
  additionalProperties: false,
};

// JSON Schema for Company Authorisation Certificate
const companyAuthorisationSchema = {
  type: 'object',
  properties: {
    company_authorisation_id: { type: 'string' },
    company: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            postal_code: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['street', 'postal_code', 'city', 'country'],
          additionalProperties: false,
        },
        contact: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['phone', 'email'],
          additionalProperties: false,
        },
      },
      required: ['name', 'address', 'contact'],
      additionalProperties: false,
    },
    authorisation: {
      type: 'object',
      properties: {
        authorisation_number: { type: 'string' },
        journey_type: { type: 'string', enum: ['TYPE_1', 'TYPE_2'] },
        animal_categories: { type: 'array', items: { type: 'string' } },
        transport_modes: { type: 'array', items: { type: 'string' } },
        issue_date: { type: 'string' },
        expiry_date: { type: 'string' },
      },
      required: [
        'authorisation_number',
        'journey_type',
        'animal_categories',
        'transport_modes',
        'issue_date',
        'expiry_date',
      ],
      additionalProperties: false,
    },
    issuing_authority: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' },
        contact: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            fax: { type: ['string', 'null'] },
            email: { type: 'string' },
          },
          required: ['phone', 'email'],
          additionalProperties: false,
        },
        official_name: { type: 'string' },
      },
      required: ['name', 'address', 'contact'],
      additionalProperties: false,
    },
    meta: {
      type: 'object',
      properties: {
        document_language: { type: 'string' },
        notes: { type: ['string', 'null'] },
      },
      required: ['document_language'],
      additionalProperties: false,
    },
  },
  required: [
    'company_authorisation_id',
    'company',
    'authorisation',
    'issuing_authority',
    'meta',
  ],
  additionalProperties: false,
};

/**
 * Extract certificate data from image using OpenAI Vision with Structured Outputs
 * Increased timeout and memory for processing large images
 */
exports.extractCertificate = regionalFunctions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to extract certificate data'
    );
  }

  const { imageBase64 } = data;

  if (!imageBase64) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Image base64 data is required'
    );
  }

  try {
    const openai = getOpenAI();

    console.log('Calling OpenAI Vision API with Structured Outputs...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06', // Required for structured outputs
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'company_authorisation',
          strict: true,
          schema: companyAuthorisationSchema,
        },
      },
      messages: [
        {
          role: 'system',
          content: `You extract data from official EU/DK transport company authorisation certificates for animals.

Extract all information exactly as it appears. For dates, use YYYY-MM-DD format.
For journey_type: "TYPE_1" means up to 8 hours, "TYPE_2" means over 8 hours.
If a field is not visible or not applicable, use empty string for strings, empty arrays for arrays, or null where allowed.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all data from this animal transport company authorisation certificate.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'auto', // Auto detail: high for large images, low for small (faster)
              },
            },
          ],
        },
      ],
      temperature: 0, // Deterministic output for data extraction
    });

    console.log('Received response from OpenAI');

    // With structured outputs, the response is guaranteed to be valid JSON matching the schema
    const parsedData = JSON.parse(response.choices[0].message.content);
    console.log('Successfully extracted certificate data:', {
      company: parsedData.company?.name,
      authNumber: parsedData.authorisation?.authorisation_number,
      expiryDate: parsedData.authorisation?.expiry_date,
    });

    return parsedData;
  } catch (error) {
    console.error('Error extracting certificate:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to extract certificate data: ${error.message}`
    );
  }
});

/**
 * Extract text from image using OpenAI Vision (OCR)
 * Simple OCR for general document text extraction
 */
exports.extractTextFromImage = regionalFunctions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to extract text'
    );
  }

  const { imageBase64 } = data;

  if (!imageBase64) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Image base64 data is required'
    );
  }

  try {
    const openai = getOpenAI();

    console.log('Calling OpenAI Vision API for OCR...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract all visible text from the image exactly as it appears. Include all text, numbers, dates, and labels. Preserve the layout and structure as much as possible.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    });

    const extractedText = response.choices[0].message.content;
    console.log('Successfully extracted text, length:', extractedText.length);

    return { text: extractedText, success: true };
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to extract text: ${error.message}`
    );
  }
});

/**
 * Extract vehicle certificate data from image using OpenAI Vision with Structured Outputs
 * Supports vehicle registration certificates for animal transport
 */
exports.extractVehicleCertificate = regionalFunctions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to extract certificate data'
    );
  }

  const { imageBase64 } = data;

  if (!imageBase64) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Image base64 data is required'
    );
  }

  try {
    const openai = getOpenAI();

    console.log('Calling OpenAI Vision API for vehicle certificate with Structured Outputs...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06', // Required for structured outputs
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'vehicle_certificate',
          strict: true,
          schema: vehicleCertificateSchema,
        },
      },
      messages: [
        {
          role: 'system',
          content: `You extract data from official EU/DK vehicle registration certificates for animal transport.

Extract all information exactly as it appears. For dates, use YYYY-MM-DD format.
For area_per_deck_m2, extract the deck area in square meters. If a deck doesn't exist, use null.
For has_satellite_navigation_system, use true if the document indicates GPS/satellite navigation is present, false otherwise.
If a field is not visible or not applicable, use empty string for strings, empty arrays for arrays, null where allowed, or false for booleans.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all data from this vehicle registration certificate for animal transport.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'auto', // Auto detail: high for large images, low for small (faster)
              },
            },
          ],
        },
      ],
      temperature: 0, // Deterministic output for data extraction
    });

    console.log('Received response from OpenAI');

    // With structured outputs, the response is guaranteed to be valid JSON matching the schema
    const parsedData = JSON.parse(response.choices[0].message.content);
    console.log('Successfully extracted vehicle certificate data:', {
      vehicle: parsedData.vehicle?.registration_number,
      certNumber: parsedData.certificate?.certificate_number,
      expiryDate: parsedData.certificate?.expiry_date,
    });

    return parsedData;
  } catch (error) {
    console.error('Error extracting vehicle certificate:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to extract vehicle certificate data: ${error.message}`
    );
  }
});
