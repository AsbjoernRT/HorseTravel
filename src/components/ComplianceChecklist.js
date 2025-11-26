import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CheckSquare, Square, AlertTriangle, Info, AlertCircle, FileCheck } from 'lucide-react-native';
import { colors } from '../styles/theme';

/**
 * ComplianceChecklist Component
 *
 * Displays a checklist of required documents and warnings for horse transport compliance
 * Supports marking documents as confirmed and displays country-specific requirements
 */
const ComplianceChecklist = ({
  requirements,
  confirmedDocuments = [],
  autoConfirmedDocuments = [],
  onToggleDocument,
  editable = true
}) => {
  const [expandedCategories, setExpandedCategories] = useState({
    base: true,
    distance: true,
    border: true,
    country: true,
  });

  if (!requirements) {
    return null;
  }

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Group documents by category
  const documentsByCategory = {
    base: requirements.documents.filter(doc => doc.category === 'base'),
    distance: requirements.documents.filter(doc => doc.category === 'distance'),
    border: requirements.documents.filter(doc => doc.category === 'border'),
  };

  // Get country-specific documents
  const countryDocuments = [];
  Object.entries(requirements.countrySpecific || {}).forEach(([country, data]) => {
    if (data.documents) {
      countryDocuments.push(...data.documents.map(doc => ({ ...doc, country })));
    }
  });

  // Get all warnings
  const allWarnings = [...requirements.warnings];
  Object.values(requirements.countrySpecific || {}).forEach(countryReq => {
    if (countryReq.warnings) {
      allWarnings.push(...countryReq.warnings);
    }
  });

  const renderDocument = (doc) => {
    const isConfirmed = confirmedDocuments.includes(doc.id);
    const isAutoConfirmed = autoConfirmedDocuments.includes(doc.id);
    const IconComponent = isConfirmed ? CheckSquare : Square;

    return (
      <TouchableOpacity
        key={doc.id}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          padding: 12,
          backgroundColor: isConfirmed ? '#e8f5e9' : colors.white,
          borderRadius: 8,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: isConfirmed ? '#4CAF50' : '#e0e0e0',
        }}
        onPress={() => editable && onToggleDocument && onToggleDocument(doc.id)}
        disabled={!editable}
      >
        <IconComponent
          size={24}
          color={isConfirmed ? '#4CAF50' : '#666'}
          strokeWidth={2}
          style={{ marginRight: 12, marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: isConfirmed ? '#2e7d32' : colors.primary,
            }}>
              {doc.name}
              {doc.required && (
                <Text style={{ color: '#d32f2f', fontSize: 14 }}> *</Text>
              )}
            </Text>
            {isAutoConfirmed && (
              <View style={{
                backgroundColor: '#e3f2fd',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}>
                <FileCheck size={12} color="#1976d2" strokeWidth={2.5} />
                <Text style={{ fontSize: 10, color: '#1976d2', fontWeight: '600' }}>
                  CERTIFIKAT
                </Text>
              </View>
            )}
          </View>
          <Text style={{
            fontSize: 13,
            color: isConfirmed ? '#558b2f' : '#666',
            lineHeight: 18,
            marginTop: 4,
          }}>
            {doc.description}
          </Text>
          {isAutoConfirmed && (
            <Text style={{
              fontSize: 11,
              color: '#1976d2',
              marginTop: 4,
              fontStyle: 'italic',
            }}>
              ✓ Auto-bekræftet fra uploadet certifikat
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategory = (title, category, documents) => {
    if (documents.length === 0) return null;

    const isExpanded = expandedCategories[category];
    const confirmedCount = documents.filter(doc => confirmedDocuments.includes(doc.id)).length;

    return (
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: colors.secondary,
            borderRadius: 8,
            marginBottom: 8,
          }}
          onPress={() => toggleCategory(category)}
        >
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {confirmedCount}/{documents.length}
            </Text>
            <Text style={{ fontSize: 18, color: colors.primary }}>
              {isExpanded ? '−' : '+'}
            </Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View>
            {documents.map(doc => renderDocument(doc))}
          </View>
        )}
      </View>
    );
  };

  const renderWarning = (warning, index) => {
    let IconComponent = Info;
    let bgColor = '#e3f2fd';
    let iconColor = '#1976d2';
    let textColor = '#1565c0';

    if (warning.type === 'warning') {
      IconComponent = AlertTriangle;
      bgColor = '#fff3cd';
      iconColor = '#f57c00';
      textColor = '#e65100';
    } else if (warning.type === 'critical') {
      IconComponent = AlertCircle;
      bgColor = '#ffebee';
      iconColor = '#d32f2f';
      textColor = '#c62828';
    }

    return (
      <View
        key={`warning-${index}`}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: bgColor,
          padding: 12,
          borderRadius: 8,
          marginBottom: 8,
          borderLeftWidth: 4,
          borderLeftColor: iconColor,
        }}
      >
        <IconComponent
          size={20}
          color={iconColor}
          strokeWidth={2}
          style={{ marginRight: 10, marginTop: 2 }}
        />
        <Text style={{
          flex: 1,
          fontSize: 13,
          color: textColor,
          lineHeight: 18,
        }}>
          {warning.message}
        </Text>
      </View>
    );
  };

  // Calculate compliance stats
  const allDocuments = [
    ...documentsByCategory.base,
    ...documentsByCategory.distance,
    ...documentsByCategory.border,
    ...countryDocuments,
  ];
  const totalRequired = allDocuments.filter(doc => doc.required).length;
  const totalConfirmed = allDocuments.filter(doc => confirmedDocuments.includes(doc.id)).length;
  const isFullyCompliant = totalConfirmed >= totalRequired;

  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isFullyCompliant ? '#4CAF50' : '#ffc107',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
          Påkrævet Dokumentation
        </Text>
        <View style={{
          backgroundColor: isFullyCompliant ? '#4CAF50' : '#ffc107',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
        }}>
          <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
            {totalConfirmed}/{totalRequired}
          </Text>
        </View>
      </View>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          {allWarnings.map((warning, index) => renderWarning(warning, index))}
        </View>
      )}

      {/* Document Categories */}
      <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
        {renderCategory('Basisdokumenter', 'base', documentsByCategory.base)}
        {renderCategory('Afstandskrav', 'distance', documentsByCategory.distance)}
        {renderCategory('Grænseoverskridelse', 'border', documentsByCategory.border)}
        {countryDocuments.length > 0 && renderCategory('Landespecifikke Krav', 'country', countryDocuments)}
      </ScrollView>

      {/* Footer info */}
      {editable && (
        <View style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}>
          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
            Tryk på hvert dokument for at markere det som bekræftet
          </Text>
        </View>
      )}

      {/* Non-compliant warning */}
      {!isFullyCompliant && totalConfirmed < totalRequired && (
        <View style={{
          backgroundColor: '#fff3cd',
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={18} color="#f57c00" strokeWidth={2} />
          <Text style={{ flex: 1, fontSize: 13, color: '#e65100', fontWeight: '600' }}>
            {totalRequired - totalConfirmed} dokument(er) mangler bekræftelse
          </Text>
        </View>
      )}
    </View>
  );
};

export default ComplianceChecklist;
