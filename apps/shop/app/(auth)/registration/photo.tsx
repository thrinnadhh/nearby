/**
 * Photo Screen (Step 2 of 5) — Shop photo upload to R2 (public bucket)
 * Image picker + preview + upload progress
 * On success: navigate to kyc.tsx
 */

import { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useRegistration } from '@/hooks/useRegistration';
import { uploadFileToR2, parseFile } from '@/services/file-upload';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PhotoScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { shopId, formData, setField, updatePhoto, loading, error, setError } =
    useRegistration();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePickImage = useCallback(async () => {
    setError(null);
    setUploadError(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        logger.info('Image selected', { uri: asset.uri });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to pick image';
      setUploadError(message);
      logger.error('Image picker failed', { error: message });
    }
  }, [setError]);

  const handleCameraCapture = useCallback(async () => {
    setError(null);
    setUploadError(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera permission denied');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        logger.info('Photo captured', { uri: asset.uri });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to capture photo';
      setUploadError(message);
      logger.error('Camera capture failed', { error: message });
    }
  }, [setError]);

  const handleUploadPhoto = useCallback(async () => {
    if (!selectedImage || !shopId) {
      setUploadError('Please select an image first');
      return;
    }

    setError(null);
    setUploadError(null);
    setUploading(true);

    try {
      logger.info('Uploading photo', { shopId, imageUri: selectedImage });

      // Parse and validate file
      const fileInfo = await parseFile(selectedImage);
      logger.info('File validated', { fileName: fileInfo.name, size: fileInfo.size });

      // Upload to R2 (product bucket for shop photos)
      const uploadResponse = await uploadFileToR2(fileInfo, 'product', (progress) => {
        setUploadProgress(progress);
      });

      logger.info('Photo uploaded to R2', {
        shopId,
        url: uploadResponse.url,
      });

      // Update shop with photo URL
      await updatePhoto(uploadResponse.url);

      logger.info('Shop photo updated', { shopId });

      // Navigate to next step
      router.push('(auth)/registration/kyc');
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Upload failed';
      setUploadError(message);
      logger.error('Photo upload failed', { error: message, shopId });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [selectedImage, shopId, updatePhoto, router, setError]);

  const handleSkip = useCallback(() => {
    // Users can skip photo for now (can be added later)
    router.push('(auth)/registration/kyc');
  }, [router]);

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Add a shop photo</Text>
          <Text style={styles.subtitle}>
            A good photo helps customers find and trust your shop
          </Text>

          {/* Photo Preview */}
          {selectedImage || formData.photoUrl ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImage || formData.photoUrl }}
                style={styles.preview}
                resizeMode="cover"
              />

              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={colors.white} />
                  <Text style={styles.uploadingText}>
                    Uploading... {Math.round(uploadProgress)}%
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons
                name="camera"
                size={56}
                color={colors.textTertiary}
              />
              <Text style={styles.placeholderText}>
                No photo selected yet
              </Text>
            </View>
          )}

          {/* Error message */}
          {(error || uploadError) && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error || uploadError}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePickImage}
              disabled={uploading}
            >
              <MaterialCommunityIcons
                name="image"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCameraCapture}
              disabled={uploading}
            >
              <MaterialCommunityIcons
                name="camera"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Upload button */}
          {selectedImage && (
            <PrimaryButton
              label={uploading ? 'Uploading...' : 'Upload Photo'}
              onPress={handleUploadPhoto}
              loading={uploading}
              disabled={uploading || !isConnected}
              size="lg"
              style={styles.btn}
            />
          )}

          {/* Skip button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={uploading || loading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },

  content: {
    flex: 1,
    padding: spacing.lg,
  },

  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  previewContainer: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: 300,
    backgroundColor: colors.surfaceSecondary,
  },

  preview: {
    width: '100%',
    height: '100%',
  },

  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.black}80`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadingText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.white,
    marginTop: spacing.md,
  },

  placeholderContainer: {
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },

  placeholderText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },

  errorBox: {
    flexDirection: 'row',
    backgroundColor: `${colors.error}15`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginLeft: spacing.md,
    flex: 1,
  },

  buttonsContainer: {
    marginBottom: spacing.lg,
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },

  secondaryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    marginLeft: spacing.md,
  },

  btn: {
    marginBottom: spacing.md,
  },

  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  skipButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
});
