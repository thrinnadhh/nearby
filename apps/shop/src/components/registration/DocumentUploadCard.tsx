/**
 * DocumentUploadCard — Reusable component for uploading KYC documents
 * Shows file picker, preview (if image), size, and upload status
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';

type DocumentType = 'aadhaar' | 'gst' | 'bank';

interface Props {
  label: string;
  docType: DocumentType;
  onPick: (docType: DocumentType) => void;
  uploading: boolean;
  error?: string;
  uploaded: boolean;
  uploadProgress?: number;
  previewUrl?: string;
}

const DOCUMENT_ICONS: Record<DocumentType, string> = {
  aadhaar: 'card-account-details',
  gst: 'file-document',
  bank: 'bank',
};

export function DocumentUploadCard({
  label,
  docType,
  onPick,
  uploading,
  error,
  uploaded,
  uploadProgress = 0,
  previewUrl,
}: Props) {
  const isImage = previewUrl && previewUrl.endsWith('.jpg') || previewUrl?.endsWith('.png');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {uploaded && (
          <View style={styles.uploadedBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.uploadedText}>Uploaded</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.uploadBox,
          error && styles.uploadBoxError,
          uploaded && styles.uploadBoxUploaded,
        ]}
        onPress={() => onPick(docType)}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.uploadingText}>
              Uploading... {Math.round(uploadProgress)}%
            </Text>
          </View>
        ) : previewUrl && isImage ? (
          <Image
            source={{ uri: previewUrl }}
            style={styles.preview}
            resizeMode="cover"
          />
        ) : previewUrl ? (
          <View style={styles.documentPreview}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={48}
              color={colors.error}
            />
            <Text style={styles.documentName} numberOfLines={1}>
              {previewUrl.split('/').pop()}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name={DOCUMENT_ICONS[docType]}
              size={40}
              color={colors.primary}
            />
            <Text style={styles.emptyText}>
              {uploaded ? 'Document uploaded' : 'Tap to select document'}
            </Text>
            {!uploaded && (
              <Text style={styles.emptySubtext}>JPG, PNG, or PDF</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={14}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {previewUrl && !error && (
        <Text style={styles.fileInfo}>
          File selected • {previewUrl.split('/').pop()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  label: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.success}20`,
    borderRadius: borderRadius.full,
  },

  uploadedText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.success,
    marginLeft: spacing.xs,
  },

  uploadBox: {
    minHeight: 120,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderStyle: 'dashed',
  },

  uploadBoxError: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}10`,
  },

  uploadBoxUploaded: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },

  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadingText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },

  emptySubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  preview: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.lg,
  },

  documentPreview: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  documentName: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  errorText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginLeft: spacing.xs,
    flex: 1,
  },

  fileInfo: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
