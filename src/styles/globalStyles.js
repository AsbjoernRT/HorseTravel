import { StyleSheet } from 'react-native';

// Brand colors
const colors = {
  primary: '#002300', // Green (main menu)
  gray: '#d6d1ca', // Gray (general background)
  white: '#ffffff', // White (details/surface)
  black: '#202020', // Black (text)
  background: '#d6d1ca', // Gray background
  surface: '#ffffff', // White for cards/details
  text: '#202020', // Black text
  textSecondary: '#666666',
  border: '#cccccc',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 100,
    paddingBottom: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItem: {
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  profileContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  profileInfo: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
});

export { colors };
