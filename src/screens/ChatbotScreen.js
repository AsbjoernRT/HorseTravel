import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send, MessageCircle } from 'lucide-react-native';
import { theme, colors } from '../styles/theme';
import Toast from 'react-native-toast-message';

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hej! Jeg er din transport assistent. Stil mig spørgsmål om heste transport, regler, eller brug af appen.',
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

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
      // TODO: Replace with actual API call to your chatbot/OpenAI
      // For now, simulate a response
      setTimeout(() => {
        const botResponse = {
          id: Date.now() + 1,
          text: 'Dette er en placeholder respons. Integrer med OpenAI eller din egen chatbot API for at få rigtige svar.',
          isBot: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke sende besked',
      });
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.secondary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.isBot ? 'flex-start' : 'flex-end',
              maxWidth: '80%',
              marginBottom: 12,
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
                    Transport Assistent
                  </Text>
                </View>
              )}
              <Text style={{
                fontSize: 15,
                color: message.isBot ? colors.black : colors.white,
                lineHeight: 20,
              }}>
                {message.text}
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
          </View>
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
  );
};

export default ChatbotScreen;
