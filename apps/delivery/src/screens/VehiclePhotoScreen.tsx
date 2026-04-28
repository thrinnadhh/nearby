/**
 * VehiclePhotoScreen — Capture/upload vehicle photo (Task 13.6)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRegistration } from '@/hooks/useRegistration';
import logger from '@/utils/logger';

type VehiclePhotoScreenProps = NativeStackScreenProps<any, 'VehiclePhoto'>;

export function VehiclePhotoScreen({ navigation }: VehiclePhotoScreenProps) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { isLoading, error } = useRegistration();

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        logger.info('Vehicle photo selected', { uri: uri.slice(-20) });
      }
    } catch (err) {
      logger.error('Failed to pick image', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        logger.warn('Camera permission denied');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        logger.info('Vehicle photo captured', { uri: uri.slice(-20) });
      }
    } catch (err) {
      logger.error('Failed to take photo', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleContinue = () => {
    if (photoUri) {
      logger.info('Proceeding with vehicle photo');
      navigation.navigate('BankDetails');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Vehicle Photo</Text>
        <Text style={styles.subtitle}>Upload a clear photo of your vehicle</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {photoUri ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: photoUri }}
              style={styles.preview}
              testID="vehicle-photo-preview"
            />
            <TouchableOpacity
              style={styles.changeButton}
              onPress={handlePickImage}
              disabled={isLoading}
              testID="change-photo-button"
            >
              <MaterialIcons name="edit" size={20} color="#2196F3" />
              <Text style={styles.changeButtonText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="directions-car" size={64} color="#ccc" />
            <Text style={styles.placeholderText}>No photo selected</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              isLoading ? styles.optionButtonDisabled : {},
            ]}
            onPress={handleTakePhoto}
            disabled={isLoading}
            testID="take-photo-button"
          >
            <MaterialIcons name="camera-alt" size={24} color="#2196F3" />
            <Text style={styles.optionButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              isLoading ? styles.optionButtonDisabled : {},
            ]}
            onPress={handlePickImage}
            disabled={isLoading}
            testID="pick-photo-button"
          >
            <MaterialIcons name="image" size={24} color="#2196F3" />
            <Text style={styles.optionButtonText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              !photoUri || isLoading ? styles.buttonDisabled : styles.buttonEnabled,
            ]}
            onPress={handleContinue}
            disabled={!photoUri || isLoading}
            testID="continue-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
            testID="back-button"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  previewContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  changeButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#2196F3',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
