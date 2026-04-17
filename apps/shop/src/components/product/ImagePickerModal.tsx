/**
 * ImagePickerModal component
 * Provides camera and gallery options for selecting product images
 * Handles image compression before returning
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { IMAGE_CONSTRAINTS, getImageSizeWarning } from '@/utils/productValidation';
import logger from '@/utils/logger';

interface ImagePickerModalProps {
  visible: boolean;
  onImageSelected: (image: {
    uri: string;
    name: string;
    type: string;
    size: number;
  }) => void;
  onClose: () => void;
}

/**
 * ImagePickerModal — handle image selection from camera or gallery
 */
export function ImagePickerModal({
  visible,
  onImageSelected,
  onClose,
}: ImagePickerModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Request camera permission
   */
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to take photos. Please enable it in settings.'
        );
        return false;
      }
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Camera permission request failed', { error: errorMsg });
      Alert.alert('Error', 'Failed to request camera permission');
      return false;
    }
  };

  /**
   * Request library permission
   */
  const requestLibraryPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission',
          'Photo library access is required to select images. Please enable it in settings.'
        );
        return false;
      }
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Library permission request failed', { error: errorMsg });
      Alert.alert('Error', 'Failed to request library permission');
      return false;
    }
  };

  /**
   * Compress image to target quality and size
   * Returns compressed image URI and original size
   */
  const compressImage = async (
    imageUri: string
  ): Promise<{ uri: string; size: number } | null> => {
    try {
      let result = imageUri;
      let quality = IMAGE_CONSTRAINTS.TARGET_QUALITY;

      // Try compression with quality reduction if needed
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            result,
            [
              {
                resize: {
                  width: IMAGE_CONSTRAINTS.MAX_WIDTH,
                  height: IMAGE_CONSTRAINTS.MAX_HEIGHT,
                },
              },
            ],
            {
              compress: quality / 100,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          // Get file size
          const response = await fetch(manipulatedImage.uri);
          const blob = await response.blob();
          const size = blob.size;

          logger.info('Image compressed', {
            originalUri: imageUri,
            compressedUri: manipulatedImage.uri,
            quality,
            size,
            targetSize: IMAGE_CONSTRAINTS.TARGET_SIZE,
          });

          return {
            uri: manipulatedImage.uri,
            size,
          };
        } catch (err) {
          // If compression fails, try lower quality
          quality = Math.max(quality - 20, 50);
          attempts++;

          if (attempts >= maxAttempts) {
            throw err;
          }
        }
      }

      logger.warn('Could not compress image to target size, returning original');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return {
        uri: imageUri,
        size: blob.size,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Image compression failed', { error: errorMsg });
      Alert.alert('Error', 'Failed to process image. Please try another.');
      return null;
    }
  };

  /**
   * Handle camera selection
   */
  const handleCameraPress = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      setIsProcessing(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        logger.info('Camera cancelled by user');
        setIsProcessing(false);
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'image.jpg';

      logger.info('Camera image selected', {
        fileName,
        width: asset.width,
        height: asset.height,
      });

      // Compress image
      const compressed = await compressImage(asset.uri);
      if (!compressed) {
        setIsProcessing(false);
        return;
      }

      // Check for size warning
      const sizeWarning = getImageSizeWarning(compressed.size);
      if (sizeWarning) {
        logger.warn('Image size warning', { warning: sizeWarning });
      }

      onImageSelected({
        uri: compressed.uri,
        name: fileName,
        type: 'image/jpeg',
        size: compressed.size,
      });

      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Camera picker error', { error: errorMsg });
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle gallery selection
   */
  const handleGalleryPress = async () => {
    try {
      const hasPermission = await requestLibraryPermission();
      if (!hasPermission) {
        return;
      }

      setIsProcessing(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        logger.info('Gallery cancelled by user');
        setIsProcessing(false);
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'image.jpg';

      logger.info('Gallery image selected', {
        fileName,
        width: asset.width,
        height: asset.height,
      });

      // Compress image
      const compressed = await compressImage(asset.uri);
      if (!compressed) {
        setIsProcessing(false);
        return;
      }

      // Check for size warning
      const sizeWarning = getImageSizeWarning(compressed.size);
      if (sizeWarning) {
        logger.warn('Image size warning', { warning: sizeWarning });
      }

      onImageSelected({
        uri: compressed.uri,
        name: fileName,
        type: 'image/jpeg',
        size: compressed.size,
      });

      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Gallery picker error', { error: errorMsg });
      Alert.alert('Error', 'Failed to select image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        disabled={isProcessing}
      >
        {/* Modal content */}
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Header */}
            <Text style={styles.title}>Select Product Image</Text>
            <Text style={styles.subtitle}>Choose from camera or gallery</Text>

            {/* Camera button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleCameraPress}
              disabled={isProcessing}
              testID="image-picker-camera"
            >
              <MaterialCommunityIcons
                name="camera"
                size={32}
                color={colors.primary}
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Take a Photo</Text>
              <Text style={styles.buttonSubtext}>Use your camera</Text>
            </TouchableOpacity>

            {/* Gallery button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleGalleryPress}
              disabled={isProcessing}
              testID="image-picker-gallery"
            >
              <MaterialCommunityIcons
                name="image-multiple"
                size={32}
                color={colors.primary}
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Choose from Gallery</Text>
              <Text style={styles.buttonSubtext}>Select from your photos</Text>
            </TouchableOpacity>

            {/* Cancel button */}
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
              disabled={isProcessing}
              testID="image-picker-cancel"
            >
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>

            {/* Processing indicator */}
            {isProcessing && (
              <View style={styles.processing}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>Processing image...</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: spacing.md,
  },
  buttonText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  buttonSubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.lg + 40,
  },
  buttonCancel: {
    backgroundColor: colors.surfaceSecondary,
  },
  buttonTextCancel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  processing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  processingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
});
