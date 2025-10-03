import { StyleSheet, Platform } from 'react-native';

// Brand colors
export const colors = {
  primary: '#002300',
  secondary: '#d6d1ca',
  white: '#ffffff',
  black: '#202020',
  placeholder: '#999',
};

// Shared styles used across multiple screens
export const sharedStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  containerPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 16,
  },

  // Typography
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.secondary,
  },

  // Inputs
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.black,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  // Buttons
  primaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Social buttons
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  socialButtonIcon: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.secondary,
    opacity: 0.3,
  },
  dividerText: {
    color: colors.secondary,
    fontSize: 14,
    marginHorizontal: 16,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: colors.secondary,
    fontSize: 15,
  },
  footerLink: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Helper text
  helperText: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 6,
    opacity: 0.8,
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(214, 209, 202, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
