import { StyleSheet, Platform } from 'react-native';

// Brand colors
export const colors = {
  primary: '#002300',
  secondary: '#f2f2f2',
  background: '#f2f2f2',
  white: '#ffffff',
  black: '#202020',
  placeholder: '#999',
  textSecondary: '#666666',
  border: '#cccccc',
};

// Common styles used across the app
export const theme = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  containerPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: 20,
    paddingTop: 100,
    paddingBottom: 100,
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
    color: colors.black,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.secondary,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.black,
    textAlign: 'center',
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
    backgroundColor: Platform.OS === 'web' ? colors.secondary : colors.primary,
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
    color: Platform.OS === 'web' ? colors.primary : colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
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

  // List items
  listItem: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },

  // Profile
  profileContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.secondary,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 10,
  },
  profileInfo: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
});
