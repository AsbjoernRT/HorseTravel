import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {Promise<boolean>} - Returns true if confirmed, false if cancelled
 */
export const confirmAlert = (title, message) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      resolve(confirmed);
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Annuller', style: 'cancel', onPress: () => resolve(false) },
          { text: 'OK', onPress: () => resolve(true) },
        ],
        { cancelable: true, onCancelable: () => resolve(false) }
      );
    }
  });
};

/**
 * Cross-platform alert dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {Promise<void>}
 */
export const showAlert = (title, message) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      resolve();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }]);
    }
  });
};
