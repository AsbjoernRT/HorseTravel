import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { loadGoogleMapsAPI } from '../utils/googleMapsLoader';
import { getPlaceAutocomplete } from '../services/mapsService';

// Address input that leverages Google Places autocomplete across web and native platforms.
const LocationAutocomplete = ({
  value,
  onChangeText,
  placeholder,
  style,
  onLocationSelect
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const mapsLoadedRef = useRef(false);

  // Initialize Google Places API
  useEffect(() => {
    console.log('LocationAutocomplete init - Platform:', Platform.OS, 'Already loaded:', mapsLoadedRef.current);
    console.log('Window.google exists:', !!window.google);
    console.log('Window.google.maps exists:', !!window.google?.maps);
    console.log('Window.google.maps.places exists:', !!window.google?.maps?.places);

    if (Platform.OS === 'web') {
      // Check if already loaded
      if (window.google?.maps?.places) {
        console.log('Maps API already loaded, initializing session token');
        mapsLoadedRef.current = true;
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        return;
      }

      if (!mapsLoadedRef.current) {
        console.log('Loading Google Maps API for autocomplete...');
        loadGoogleMapsAPI(['places', 'geometry']).then(() => {
          console.log('Google Maps API loaded, checking for places:', !!window.google?.maps?.places);
          if (window.google?.maps?.places) {
            mapsLoadedRef.current = true;
            // Create a new session token for billing optimization
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            console.log('AutocompleteSessionToken created, mapsLoaded set to true');
          } else {
            console.error('Google Maps loaded but places library not found');
          }
        }).catch(error => {
          console.error('Failed to load Google Maps API:', error);
        });
      }
    }
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      console.log('fetchSuggestions called with value:', value, 'length:', value.length, 'focused:', isFocused);

      // Only fetch if input is focused
      if (!isFocused) {
        console.log('Input not focused, skipping autocomplete');
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (value.length < 3) {
        console.log('Value too short, skipping autocomplete');
        setSuggestions([]);
        return;
      }

      console.log('Starting autocomplete fetch...');
      setLoading(true);
      try {
        console.log('Platform:', Platform.OS, 'Maps loaded:', mapsLoadedRef.current);
        if (Platform.OS === 'web' && mapsLoadedRef.current) {
          // Use new AutocompleteSuggestion API for web
          const request = {
            input: value,
            sessionToken: sessionTokenRef.current,
            includedPrimaryTypes: ['geocode'], // Only addresses, not businesses
          };

          console.log('Autocomplete request:', request);

          const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

          console.log('Full autocomplete response:', response);
          console.log('Response type:', typeof response);
          console.log('Response keys:', Object.keys(response || {}));

          const autocompleteSuggestions = response?.suggestions;

          console.log('Suggestions:', autocompleteSuggestions);
          console.log('Suggestions length:', autocompleteSuggestions?.length);

          if (autocompleteSuggestions && autocompleteSuggestions.length > 0) {
            console.log('First suggestion:', autocompleteSuggestions[0]);
            console.log('First prediction:', autocompleteSuggestions[0]?.placePrediction);

            const results = autocompleteSuggestions.map(suggestion => {
              const prediction = suggestion.placePrediction;
              console.log('Processing prediction:', prediction);

              // Safely access nested properties - use text property which has toString()
              const placeId = prediction?.placeId || prediction?.place_id || '';
              const fullText = prediction?.text?.text || prediction?.text?.toString() || prediction?.description || '';
              const mainText = prediction?.mainText?.text || prediction?.mainText?.toString() ||
                              prediction?.structured_formatting?.main_text ||
                              fullText;
              const secondaryText = prediction?.secondaryText?.text || prediction?.secondaryText?.toString() ||
                                   prediction?.structured_formatting?.secondary_text || '';

              return {
                placeId,
                description: fullText || 'Unknown location',
                mainText: mainText || 'Unknown location',
                secondaryText: secondaryText || '',
              };
            });
            console.log('Processed results:', results);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
          } else {
            console.log('No suggestions found');
            setSuggestions([]);
          }
          setLoading(false);
        } else {
          // Use REST API for native platforms (iOS/Android)
          console.log('Using REST API for autocomplete on', Platform.OS);
          const results = await getPlaceAutocomplete(value);
          console.log('REST API results:', results);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching autocomplete:', error);
        setSuggestions([]);
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [value, isFocused]);

  const handleSelectSuggestion = (suggestion) => {
    onChangeText(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);

    // Regenerate session token after selection (for billing optimization)
    if (Platform.OS === 'web' && window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }

    if (onLocationSelect) {
      onLocationSelect(suggestion);
    }
  };

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <View>
        <TextInput
          ref={inputRef}
          style={style}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay blur to allow suggestion click to register
            setTimeout(() => {
              setIsFocused(false);
              setShowSuggestions(false);
            }, 200);
          }}
          autoComplete="off"
          autoCorrect={false}
        />
        {loading && (
          <View style={{
            position: 'absolute',
            right: 12,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
          }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: colors.white,
            borderRadius: 8,
            marginTop: 4,
            maxHeight: 200,
            borderWidth: 1,
            borderColor: '#e0e0e0',
            ...(Platform.OS === 'web' ? {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            } : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }),
            zIndex: 100,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.placeId}
                style={{
                  flexDirection: 'row',
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f0f0f0',
                  alignItems: 'center',
                }}
                onPress={() => handleSelectSuggestion(item)}
              >
                <MapPin size={16} color="#666" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                    {item.mainText}
                  </Text>
                  {item.secondaryText && (
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {item.secondaryText}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default LocationAutocomplete;
