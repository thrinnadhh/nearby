/**
 * MonthlyStatementScreen for Task 12.9
 * Monthly statement PDF generation and sharing
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStatementGenerator } from '@/hooks/useStatementGenerator';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';

export default function MonthlyStatementScreen() {
  const shopId = useAuthStore((s) => s.shopId);
  const {
    loading,
    error,
    pdfUrl,
    fileName,
    generatePdf,
    downloadPdf,
    sharePdf,
    reset,
  } = useStatementGenerator();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<boolean>(false);
  const [expandedYear, setExpandedYear] = useState<boolean>(false);

  const handleGenerateStatement = useCallback(async () => {
    logger.info('Generating statement', {
      month: selectedMonth + 1,
      year: selectedYear,
    });
    await generatePdf(selectedMonth + 1, selectedYear);
  }, [generatePdf, selectedMonth, selectedYear]);

  const handleDownload = useCallback(async () => {
    logger.info('Downloading statement', {
      month: selectedMonth + 1,
      year: selectedYear,
    });
    await downloadPdf(selectedMonth + 1, selectedYear);

    Alert.alert(
      'Success',
      'Statement downloaded successfully',
      [{ text: 'OK' }],
      { cancelable: false }
    );
  }, [downloadPdf, selectedMonth, selectedYear]);

  const handleShare = useCallback(async () => {
    logger.info('Sharing statement', {
      month: selectedMonth + 1,
      year: selectedYear,
    });
    await sharePdf(selectedMonth + 1, selectedYear);
  }, [sharePdf, selectedMonth, selectedYear]);

  const canGeneratePDF = useMemo(() => {
    const now = new Date();
    const selectedDate = new Date(selectedYear, selectedMonth, 1);
    return selectedDate <= now;
  }, [selectedMonth, selectedYear]);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const years = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = [];
    for (let y = 2020; y <= currentYear; y++) {
      years.push(y);
    }
    return years.reverse();
  }, []);

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name='error' size={48} color='#EF4444' />
          <Text style={styles.emptyStateText}>Shop ID not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Statement</Text>
        <Text style={styles.headerSubtitle}>Generate and share your earnings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorBanner}>
            <MaterialIcons name='error' size={20} color='#DC2626' />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Month/Year Selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Select Period</Text>

          {/* Month Picker */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerLabel}>
              <Text style={styles.pickerLabelText}>Month</Text>
            </View>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setExpandedMonth(!expandedMonth)}
              testID='month-picker'
            >
              <Text style={styles.pickerButtonText}>
                {monthNames[selectedMonth]}
              </Text>
              <MaterialIcons
                name={expandedMonth ? 'expand-less' : 'expand-more'}
                size={24}
                color='#6B7280'
              />
            </TouchableOpacity>

            {expandedMonth && (
              <View style={styles.dropdownMenu}>
                {monthNames.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.dropdownItem,
                      index === selectedMonth && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedMonth(index);
                      setExpandedMonth(false);
                    }}
                    testID={`month-option-${index}`}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        index === selectedMonth && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Year Picker */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerLabel}>
              <Text style={styles.pickerLabelText}>Year</Text>
            </View>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setExpandedYear(!expandedYear)}
              testID='year-picker'
            >
              <Text style={styles.pickerButtonText}>{selectedYear}</Text>
              <MaterialIcons
                name={expandedYear ? 'expand-less' : 'expand-more'}
                size={24}
                color='#6B7280'
              />
            </TouchableOpacity>

            {expandedYear && (
              <View style={styles.dropdownMenu}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.dropdownItem,
                      year === selectedYear && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                      setExpandedYear(false);
                    }}
                    testID={`year-option-${year}`}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        year === selectedYear && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {!pdfUrl ? (
          <TouchableOpacity
            style={[styles.generateButton, !canGeneratePDF && styles.buttonDisabled]}
            onPress={handleGenerateStatement}
            disabled={!canGeneratePDF || loading}
            testID='generate-button'
          >
            {loading ? (
              <ActivityIndicator size='small' color='#FFFFFF' />
            ) : (
              <>
                <MaterialIcons name='description' size={20} color='#FFFFFF' />
                <Text style={styles.generateButtonText}>
                  {loading ? 'Generating...' : 'Generate PDF'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.successCard}>
              <MaterialIcons name='check-circle' size={48} color='#10B981' />
              <Text style={styles.successTitle}>Statement Ready</Text>
              <Text style={styles.successSubtitle}>
                {monthNames[selectedMonth]} {selectedYear}
              </Text>
            </View>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownload}
                disabled={loading}
                testID='download-button'
              >
                {loading ? (
                  <ActivityIndicator size='small' color='#3B82F6' />
                ) : (
                  <>
                    <MaterialIcons name='download' size={20} color='#3B82F6' />
                    <Text style={styles.actionButtonText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
                disabled={loading}
                testID='share-button'
              >
                {loading ? (
                  <ActivityIndicator size='small' color='#3B82F6' />
                ) : (
                  <>
                    <MaterialIcons name='share' size={20} color='#3B82F6' />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.generateNewButton}
              onPress={() => {
                reset();
                setSelectedMonth(new Date().getMonth());
                setSelectedYear(new Date().getFullYear());
              }}
              testID='generate-new-button'
            >
              <MaterialIcons name='add' size={20} color='#3B82F6' />
              <Text style={styles.generateNewButtonText}>Generate New</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialIcons name='info' size={20} color='#3B82F6' />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Statement Details</Text>
            <Text style={styles.infoText}>
              Statements show your gross revenue, commissions, and net earnings for the selected month.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  selectorCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    marginBottom: 8,
  },
  pickerLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    zIndex: 10,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#111827',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#4ADE80',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  generateNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    gap: 6,
  },
  generateNewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
});
