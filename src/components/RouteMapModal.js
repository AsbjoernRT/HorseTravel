import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../styles/sharedStyles';
import { loadGoogleMapsAPI } from '../utils/googleMapsLoader';

// On-demand modal that previews the planned Google Maps route and highlights border crossings.
const RouteMapModal = ({ visible, onClose, routeInfo, fromLocation, toLocation }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!visible || !routeInfo || Platform.OS !== 'web') return;

    // Initialize Google Maps on web
    const initMap = () => {
      console.log('initMap called');
      console.log('window.google:', !!window.google);
      console.log('window.google.maps:', !!window.google?.maps);
      console.log('geometry.encoding:', !!window.google?.maps?.geometry?.encoding);
      console.log('mapContainerRef.current:', mapContainerRef.current);

      if (!window.google || !window.google.maps || !window.google.maps.geometry || !window.google.maps.geometry.encoding || !mapContainerRef.current) {
        console.log('initMap early return - not ready');
        return;
      }

      console.log('Creating map with polyline:', routeInfo.polyline);

      // Decode polyline
      const decodedPath = window.google.maps.geometry.encoding.decodePath(routeInfo.polyline);
      console.log('Decoded path points:', decodedPath.length);

      // Create map
      const map = new window.google.maps.Map(mapContainerRef.current, {
        zoom: 7,
        mapTypeId: 'roadmap',
      });

      mapRef.current = map;

      // Draw route polyline
      const routePath = new window.google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: colors.primary,
        strokeOpacity: 1.0,
        strokeWeight: 4,
      });

      routePath.setMap(map);

      // Add start marker
      new window.google.maps.Marker({
        position: decodedPath[0],
        map: map,
        title: 'Start',
        label: 'A',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      });

      // Add end marker
      new window.google.maps.Marker({
        position: decodedPath[decodedPath.length - 1],
        map: map,
        title: 'Destination',
        label: 'B',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
      });

      // Fit bounds to show entire route
      const bounds = new window.google.maps.LatLngBounds();
      decodedPath.forEach(point => bounds.extend(point));
      map.fitBounds(bounds);
    };

    // Load Google Maps API using centralized loader
    loadGoogleMapsAPI(['places', 'geometry']).then(initMap).catch(error => {
      console.error('Failed to load Google Maps API:', error);
    });
  }, [visible, routeInfo]);

  if (!routeInfo) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        {/* Header */}
        <View style={{
          backgroundColor: colors.white,
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 15,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
              Rute Oversigt
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
              {routeInfo.distance.text} • {routeInfo.duration.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <X size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Map */}
        {Platform.OS === 'web' ? (
          <div
            ref={mapContainerRef}
            style={{ flex: 1, width: '100%', height: '100%' }}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
              Kort kun tilgængelig på web for nu.
            </Text>
            <Text style={{ fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' }}>
              Native app kort kommer snart.
            </Text>
          </View>
        )}

        {/* Info Footer */}
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}>
          {routeInfo.borderCrossing && (
            <View style={{
              backgroundColor: '#fff3cd',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#ffc107',
            }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#856404', marginBottom: 4 }}>
                ⚠️ Grænseoverskridelse
              </Text>
              <Text style={{ fontSize: 11, color: '#856404' }}>
                Lande: {routeInfo.countries.join(', ')}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Afstand</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                {routeInfo.distance.text}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#e0e0e0' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Estimeret tid</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                {routeInfo.duration.text}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RouteMapModal;
