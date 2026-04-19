/**
 * VehiclePhotoScreen — Capture/upload vehicle photo (Task 13.6)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useRegistration } from '@/hooks/useRegistration';
import logger from '@/utils/logger';

interface VehiclePhotoScreenProps {
  onNext: (photoUri: string) => void;
  onBack?: () => void;
}

export function VehiclePhotoScreen({ onNext, onBack }: VehiclePhotoScreenProps) {
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
      logger.error('Failed to pick image', { error: err instanceof Error ? err.message : String(err) });
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
      logger.error('Failed to take photo', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleContinue = () => {
    if (photoUri) {
      logger.info('Proceeding with vehicle photo');
      onNext(photoUri);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vehicle Photo</Text>
      <Text style={styles.subtitle}>Upload a clear photo of your vehicle</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} testID="vehicle-photo-preview" />
          <TouchableOpacity
            style={styles.changeButton}
            onPress={handlePickImage}
            disabled={isLoading}
            testID="change-photo-button"
          >
            <MaterialIcons name="edit" size={20} color="#007AFF" />
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
          style={[styles.optionButton, isLoading ? styles.optionButtonDisabled : {}]}
          onPress={handleTakePhoto}
          disabled={isLoading}
          testID="take-photo-button"
        >
          <MaterialIcons name="camera-alt" size={24} color="#007AFF" />
          <Text style={styles.optionButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, isLoading ? styles.optionButtonDisabled : {}]}
          onPress={handlePickImage}
          disabled={isLoading}
          testID="pick-photo-button"
        >
          <MaterialIcons name="photo-library" size={24} color="#007AFF" />
          <Text style={styles.optionButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Photo Requirements:</Text>
        <Text style={styles.helpText}>• Clear view of vehicle front/side</Text>
        <Text style={styles.helpText}>• License plate visible</Text>
        <Text style={styles.helpText}>• Good lighting</Text>
        <Text style={styles.helpText}>• JPG or PNG format</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, !photoUri || isLoading ? styles.buttonDisabled : styles.buttonEnabled]}
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

        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={isLoading}
            testID="back-button"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
message: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
    previewContainer: {
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  changeButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 40,
    marginBottom: 20,
  },
  placeholderText: {
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  helpContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  helpTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#ff3333',
    marginBottom: 12,
    fontSize: 12,
    textAlign: 'center',
  },
});
