import React from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { CheckCircle, Circle, Globe } from 'lucide-react-native';
import { colors } from '../../styles/theme';

const STEPS = [
  { id: 1, label: 'Opretter transport...' },
  { id: 2, label: 'Registrerer TRACES hos EU...' },
  { id: 3, label: 'Færdig!' },
];

const TRACESCreationModal = ({ visible, currentStep, tracesNumber, countries }) => {
  const renderStep = (step, index) => {
    const isCompleted = currentStep > step.id;
    const isActive = currentStep === step.id;
    const isPending = currentStep < step.id;

    return (
      <View key={step.id} style={styles.stepContainer}>
        {/* Step row */}
        <View style={styles.stepRow}>
          {/* Icon */}
          <View
            style={[
              styles.stepIcon,
              isCompleted && styles.stepIconCompleted,
              isActive && styles.stepIconActive,
              isPending && styles.stepIconPending,
            ]}
          >
            {isCompleted ? (
              <CheckCircle size={20} color="#fff" strokeWidth={2.5} />
            ) : isActive ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Circle size={20} color="#999" strokeWidth={2} />
            )}
          </View>

          {/* Label */}
          <Text
            style={[
              styles.stepLabel,
              (isActive || isCompleted) && styles.stepLabelActive,
              isPending && styles.stepLabelPending,
            ]}
          >
            {step.label}
          </Text>
        </View>

        {/* Connector line */}
        {index < STEPS.length - 1 && (
          <View style={[styles.connector, isCompleted && styles.connectorCompleted]} />
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header with EU icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Globe size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.title}>EU TRACES Registrering</Text>
            {countries && countries.length > 0 && (
              <Text style={styles.subtitle}>Rute: {countries.join(' → ')}</Text>
            )}
          </View>

          {/* Step indicator */}
          <View style={styles.stepsContainer}>
            {STEPS.map((step, index) => renderStep(step, index))}
          </View>

          {/* TRACES number display (when completed) */}
          {currentStep === 3 && tracesNumber && (
            <View style={styles.tracesBox}>
              <Text style={styles.tracesLabel}>TRACES Reference:</Text>
              <Text style={styles.tracesNumber}>{tracesNumber}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepContainer: {
    marginBottom: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepIconActive: {
    backgroundColor: colors.primary,
  },
  stepIconPending: {
    backgroundColor: '#e0e0e0',
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#999',
  },
  stepLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  stepLabelPending: {
    color: '#999',
  },
  connector: {
    width: 2,
    height: 16,
    backgroundColor: '#e0e0e0',
    marginLeft: 15,
    marginTop: 4,
    marginBottom: 4,
  },
  connectorCompleted: {
    backgroundColor: '#4CAF50',
  },
  tracesBox: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  tracesLabel: {
    fontSize: 12,
    color: '#2e7d32',
    marginBottom: 4,
  },
  tracesNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b5e20',
    fontFamily: 'monospace',
  },
});

export default TRACESCreationModal;
