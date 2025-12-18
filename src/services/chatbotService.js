import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../config/firebase";

const functions = getFunctions(app);

/**
 * Service for interacting with the chatbot
 */
class ChatbotService {
  constructor() {
    this.chatbotFunction = httpsCallable(functions, "chatbot");
    this.getUsageFunction = httpsCallable(functions, "getChatbotUsage");

    // System prompt for horse transport context
    this.systemPrompt = `Du er en hjælpsom assistent for en hestetransport-applikation HorseTravel og dit navn er Transporta.
Du hjælper brugerne med spørgsmål om transport af heste, håndtering af deres hesteinformationer, sporing af transporter og brugen af appens funktioner.
Vær imødekommende og professionel, og hav fokus på hestetransport og dyrevelfærd.
Hvis du bliver spurgt om emner uden for hestetransport, så henled venligt samtalen på relevante emner.`;
  }

  /**
   * Send a message to the chatbot
   * @param {Array} messages - Array of message objects {role: 'user'|'assistant', content: string}
   * @param {Object} options - Optional configuration
   * @param {string} options.customSystemPrompt - Optional custom system prompt
   * @param {string} options.activeMode - 'private' or 'organization'
   * @param {string} options.activeOrganizationId - Organization ID if in organization mode
   * @returns {Promise<Object>} Response with message and usage info
   */
  async sendMessage(messages, options = {}) {
    const { customSystemPrompt, activeMode, activeOrganizationId } = options;
    try {
      const result = await this.chatbotFunction({
        messages,
        systemPrompt: customSystemPrompt || this.systemPrompt,
        activeMode,
        activeOrganizationId,
      });

      return {
        success: true,
        message: result.data.message,
        usage: result.data.usage,
      };
    } catch (error) {
      console.error("Chatbot error:", error);

      // Handle specific error codes
      if (error.code === "unauthenticated") {
        return {
          success: false,
          error: "You must be logged in to use the chatbot",
          code: "AUTH_REQUIRED",
        };
      }

      if (error.code === "resource-exhausted") {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again in a moment.",
          code: "RATE_LIMIT",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to get chatbot response",
        code: "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Get chatbot usage statistics for the current user
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsage() {
    try {
      const result = await this.getUsageFunction();
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      console.error("Error fetching usage:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch usage statistics",
      };
    }
  }

  /**
   * Format messages for display in the chat UI
   * @param {Array} messages - Raw message array
   * @returns {Array} Formatted messages with id and timestamp
   */
  formatMessages(messages) {
    return messages.map((msg, index) => ({
      id: `msg-${index}-${Date.now()}`,
      ...msg,
      timestamp: new Date(),
    }));
  }
}

export default new ChatbotService();
