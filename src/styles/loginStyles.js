import { StyleSheet } from 'react-native';
import { colors } from './theme';

export const loginStyles = StyleSheet.create({
  forgotText: {
    color: colors.black,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  // Error box styles
  errorBox: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorHelpText: {
    color: colors.black,
    fontSize: 14,
    marginBottom: 4,
  },
  errorResetLink: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
