/**
 * KYC Screen (Step 3 of 5) — Upload 3 KYC documents to R2 (private bucket)
 * Aadhaar, GST certificate, Bank account proof
 * Batch upload with progress tracking
 * On success: navigate to review.tsx
 */

import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useRegistration } from '@/hooks/useRegistration';
import { uploadFileToR2, parseFile } from '@/services/file-upload';
import { DocumentUploadCard } from '@/components/registration/DocumentUploadCard';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type DocumentType = 'aadhaar' | 'gst' | 'bank';

interface DocumentUploadState {
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  progress: number;
  signedUrl: string | null;
}

export default function KYCScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { shopId, formData, setField, submitKYC, loading, error, setError } =
    useRegistration();

  const [documents, setDocuments] = useState<
    Record<DocumentType, DocumentUploadState>
  >({
    aadhaar: {
      uri: formData.aadhaarUrl || '',
      uploading: false,
      uploaded: !!formData.aadhaarUrl,
      error: null,
      progress: 0,
      signedUrl: null,
    },
    gst: {
      uri: formData.gstUrl || '',
      uploading: false,
      uploaded: !!formData.gstUrl,
      error: null,
      progress: 0,
      signedUrl: null,
    },
    bank: {
      uri: formData.bankUrl || '',
      uploading: false,
      uploaded: !!formData.bankUrl,
      error: null,
      progress: 0,
      signedUrl: null,
    },
  });

  const allUploaded =
    documents.aadhaar.uploaded &&
    documents.gst.uploaded &&
    documents.bank.uploaded;

  const isUploading = Object.values(documents).some((doc) => doc.uploading);

  const handlePickDocument = useCallback(
    async (docType: DocumentType) => {
      setError(null);

      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];

          setDocuments((prev) => ({
            ...prev,
            [docType]: {
              ...prev[docType],
              uri: asset.uri,
              uploading: true,
              error: null,
              progress: 0,
            },
          }));

          logger.info('Document selected', {
            docType,
            uri: asset.uri,
            name: asset.name,
          });

          // Upload immediately
          await handleUploadDocument(docType, asset.uri);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to pick document';
        logger.error('Document picker failed', { error: message, docType });

        setDocuments((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            error: message,
            uploading: false,
          },
        }));
      }
    },
    [setError]
  );

  const handleUploadDocument = useCallback(
    async (docType: DocumentType, fileUri: string) => {
      if (!shopId) {
        setDocuments((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            error: 'Shop ID not found',
            uploading: false,
          },
        }));
        return;
      }

      try {
        logger.info('Uploading KYC document', { shopId, docType });

        // Parse and validate file
        const fileInfo = await parseFile(fileUri);
        logger.info('Document validated', {
          docType,
          fileName: fileInfo.name,
          size: fileInfo.size,
        });

        // Upload to R2 (kyc private bucket)
        const uploadResponse = await uploadFileToR2(fileInfo, 'kyc', (progress) => {
          setDocuments((prev) => ({
            ...prev,
            [docType]: {
              ...prev[docType],
              progress,
            },
          }));
        });

        logger.info('KYC document uploaded', {
          shopId,
          docType,
          url: uploadResponse.url,
        });

        setDocuments((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            uploaded: true,
            uploading: false,
            progress: 100,
            error: null,
            signedUrl: uploadResponse.signedUrl,
          },
        }));

        // Update form data
        if (docType === 'aadhaar') {
          setField('aadhaarUrl', uploadResponse.url);
        } else if (docType === 'gst') {
          setField('gstUrl', uploadResponse.url);
        } else if (docType === 'bank') {
          setField('bankUrl', uploadResponse.url);
        }
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Upload failed';

        logger.error('Document upload failed', {
          error: message,
          docType,
          shopId,
        });

        setDocuments((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            error: message,
            uploading: false,
          },
        }));
      }
    },
    [shopId, setField]
  );

  const handleSubmitKYC = useCallback(async () => {
    if (!allUploaded) {
      setError('Please upload all three documents');
      return;
    }

    setError(null);

    try {
      logger.info('Submitting KYC documents', { shopId });

      await submitKYC({
        aadhaarUrl: documents.aadhaar.uri,
        aadhaarSignedUrl: documents.aadhaar.signedUrl || documents.aadhaar.uri,
        gstUrl: documents.gst.uri,
        gstSignedUrl: documents.gst.signedUrl || documents.gst.uri,
        bankUrl: documents.bank.uri,
        bankSignedUrl: documents.bank.signedUrl || documents.bank.uri,
      });

      logger.info('KYC documents submitted', { shopId });

      // Navigate to next step
      router.push('(auth)/registration/review');
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Submission failed';
      setError(message);
      logger.error('KYC submission failed', { error: message, shopId });
    }
  }, [allUploaded, submitKYC, shopId, documents, router, setError]);

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Upload KYC Documents</Text>
          <Text style={styles.subtitle}>
            We need these documents to verify your shop and process payments
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Document upload cards */}
          <DocumentUploadCard
            label="Aadhaar Card"
            docType="aadhaar"
            onPick={handlePickDocument}
            uploading={documents.aadhaar.uploading}
            error={documents.aadhaar.error || undefined}
            uploaded={documents.aadhaar.uploaded}
            uploadProgress={documents.aadhaar.progress}
            previewUrl={documents.aadhaar.uri}
          />

          <DocumentUploadCard
            label="GST Certificate"
            docType="gst"
            onPick={handlePickDocument}
            uploading={documents.gst.uploading}
            error={documents.gst.error || undefined}
            uploaded={documents.gst.uploaded}
            uploadProgress={documents.gst.progress}
            previewUrl={documents.gst.uri}
          />

          <DocumentUploadCard
            label="Bank Account Proof"
            docType="bank"
            onPick={handlePickDocument}
            uploading={documents.bank.uploading}
            error={documents.bank.error || undefined}
            uploaded={documents.bank.uploaded}
            uploadProgress={documents.bank.progress}
            previewUrl={documents.bank.uri}
          />

          {/* Information box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={colors.info}
            />
            <Text style={styles.infoText}>
              Documents must be clear, readable, and less than 10MB each
            </Text>
          </View>

          {/* Submit button */}
          <PrimaryButton
            label={
              loading ? 'Submitting...' : 'Next: Review Information'
            }
            onPress={handleSubmitKYC}
            loading={loading || isUploading}
            disabled={loading || isUploading || !allUploaded || !isConnected}
            size="lg"
            style={styles.btn}
          />
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

  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${colors.info}15`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },

  infoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.info,
    marginLeft: spacing.md,
    flex: 1,
  },

  btn: {
    marginTop: spacing.lg,
  },
});
