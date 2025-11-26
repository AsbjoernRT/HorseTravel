import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, MessageCircle, TrendingUp } from 'lucide-react-native';
import { theme, colors } from '../styles/theme';
import Toast from 'react-native-toast-message';
import chatbotService from '../services/chatbotService';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';

const ChatbotScreen = () => {
  const { currentUser } = useAuth();
  const { activeMode, activeOrganization } = useOrganization();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hej! Jeg er Transporta din transportassistent. Stil mig spørgsmål om hestetransport, regler, eller brug af appen.',
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [showUsage, setShowUsage] = useState(false);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    // Load usage statistics
    loadUsage();

    // Animate welcome message
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadUsage = async () => {
    try {
      const result = await chatbotService.getUsage();
      if (result.success) {
        setUsage(result);
      }
    } catch (error) {
      // Silently fail - usage stats are optional
      console.log('Usage stats not available yet');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Prepare messages for API (exclude first welcome message)
      const apiMessages = messages
        .slice(1) // Skip welcome message
        .map(msg => ({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.text,
        }));

      // Add current user message
      apiMessages.push({
        role: 'user',
        content: userMessage.text,
      });

      // Call chatbot service with context
      const result = await chatbotService.sendMessage(apiMessages, {
        activeMode,
        activeOrganizationId: activeOrganization?.id,
      });

      if (result.success) {
        const botResponse = {
          id: Date.now() + 1,
          text: result.message,
          isBot: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);

        // Refresh usage stats
        loadUsage();
      } else {
        // Handle error
        const errorMessage = {
          id: Date.now() + 1,
          text: `Fejl: ${result.error}`,
          isBot: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);

        Toast.show({
          type: 'error',
          text1: 'Fejl',
          text2: result.error,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke sende besked',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.secondary }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Usage Stats Header */}
        {showUsage && usage && (
          <View style={{
            backgroundColor: colors.white,
            padding: 12,
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TrendingUp size={16} color={colors.primary} strokeWidth={2} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginLeft: 6 }}>
                Brug statistik
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Anmodninger: {usage.requestCount}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Tokens brugt: {usage.totalTokens.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
        >
        {messages.map((message, idx) => (
          <Animated.View
            key={message.id}
            style={{
              alignSelf: message.isBot ? 'flex-start' : 'flex-end',
              maxWidth: '80%',
              marginBottom: 12,
              opacity: idx === 0 ? fadeAnim : 1,
              transform: idx === 0 ? [{ scale: scaleAnim }] : [],
            }}
          >
            <View
              style={{
                backgroundColor: message.isBot ? colors.white : colors.primary,
                padding: 14,
                borderRadius: 16,
                borderBottomLeftRadius: message.isBot ? 4 : 16,
                borderBottomRightRadius: message.isBot ? 16 : 4,
              }}
            >
              {message.isBot && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MessageCircle size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, marginLeft: 6 }}>
                   Transporta
                  </Text>
                </View>
              )}
              <Text style={{
                fontSize: 15,
                color: message.isBot ? colors.black : colors.white,
                lineHeight: 20,
              }}>
                {message.text.split(/(\*\*.*?\*\*)/).map((part, index) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Text key={index} style={{ fontWeight: 'bold' }}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  return part;
                })}
              </Text>
            </View>
            <Text style={{
              fontSize: 11,
              color: colors.textSecondary,
              marginTop: 4,
              marginLeft: message.isBot ? 0 : 'auto',
              marginRight: message.isBot ? 'auto' : 0,
            }}>
              {message.timestamp.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Animated.View>
        ))}
        {loading && (
          <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
            <View style={{
              backgroundColor: colors.white,
              padding: 14,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Skriver...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={{
        padding: 16,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.secondary,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.black,
            }}
            placeholder="Stil et spørgsmål..."
            placeholderTextColor={colors.placeholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Send size={20} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatbotScreen;
