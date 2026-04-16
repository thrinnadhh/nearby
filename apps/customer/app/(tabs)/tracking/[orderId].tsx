import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/location';
import { getOrder } from '@/services/orders';
import { connectSocket, disconnectSocket, onGpsUpdate } from '@/services/socket';
import { paise } from '@/utils/currency';

/**
 * Order Tracking Screen (Task 9.4)
 * 
 * Displays real-time delivery partner location, ETA, and order status
 * 
 * Features:
 * - Real-time delivery partner GPS tracking via Socket.IO
 * - ETA countdown and distance calculation
 * - Delivery partner info (name, vehicle, rating)
 * - OTP verification when delivered
 * - Contact delivery partner button
 * - Order status timeline
 */

interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  rating: number;
  total_deliveries: number;
}

interface GpsLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { deliveryAddress, deliveryCoords } = useLocationStore();
  const { setActiveOrder } = useOrdersStore();

  const socketRef = useRef<any>(null);

  // Order & tracking state
  const [order, setOrder] = useState<any>(null);
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartner | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<GpsLocation | null>(null);
  const [eta, setEta] = useState<number | null>(null); // in seconds
  const [distance, setDistance] = useState<number | null>(null); // in km
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    try {
      if (!orderId || !token) return;

      const data = await getOrder(orderId);
      setOrder(data);

      // Setup delivery partner info
      if (data.delivery_partner) {
        setDeliveryPartner(data.delivery_partner);
      }

      // Setup ETA and distance
      if (data.delivery_eta_seconds) {
        setEta(data.delivery_eta_seconds);
      }

      if (data.delivery_distance_km) {
        setDistance(data.delivery_distance_km);
      }

      if (data.order_status === 'delivered' && data.delivery_otp) {
        setShowOtpModal(true);
      }

      setError(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch tracking';
      setError(message);
      console.error('Tracking error:', message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  // Initial load
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Socket.IO setup for real-time GPS tracking
  useEffect(() => {
    if (!orderId || !token) return;

    try {
      socketRef.current = connectSocket(token);
      
      // Join order room for tracking
      socketRef.current?.emit('join_order_room', { orderId });

      // Listen for GPS updates from delivery partner
      const handleGpsUpdate = (data: any) => {
        if (data.orderId === orderId) {
          setPartnerLocation({
            lat: data.lat,
            lng: data.lng,
            timestamp: data.timestamp || Date.now(),
          });

          // Update ETA and distance if provided
          if (data.eta_seconds !== undefined) {
            setEta(data.eta_seconds);
          }

          if (data.distance_km !== undefined) {
            setDistance(data.distance_km);
          }
        }
      };

      socketRef.current?.on('gps_update', handleGpsUpdate);

      return () => {
        socketRef.current?.off('gps_update', handleGpsUpdate);
        socketRef.current?.emit('leave_order_room', { orderId });
      };
    } catch (err: any) {
      console.error('Socket.IO error:', err?.message);
    }
  }, [orderId, token]);

  // ETA countdown effect
  useEffect(() => {
    if (eta === null || eta <= 0) return;

    const interval = setInterval(() => {
      setEta(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [eta]);

  const formatEta = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return 'Arriving soon';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleContactPartner = () => {
    if (!deliveryPartner?.phone) {
      Alert.alert('Contact Information Unavailable', 'Unable to dial delivery partner');
      return;
    }

    const phoneUrl = `tel:${deliveryPartner.phone}`;
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
      })
      .catch(err => console.error('Phone error:', err));
  };

  const handleShareLocation = () => {
    if (!partnerLocation) {
      Alert.alert('Location Not Available', 'Delivery partner location is not available yet');
      return;
    }

    const shareUrl = `https://maps.google.com/maps?q=${partnerLocation.lat},${partnerLocation.lng}`;
    Linking.openURL(shareUrl).catch(err => console.error('Share error:', err));
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length !== 6) {
      setOtpError('OTP must be 6 digits');
      return;
    }

    setVerifyingOtp(true);
    try {
      // TODO: Verify OTP with backend
      // POST /api/v1/orders/{orderId}/delivery-otp/verify
      if (otpInput === order?.delivery_otp) {
        setOtpError(null);
        setShowOtpModal(false);
        
        // Navigate to delivery-confirmed screen for review prompt (Task 9.10)
        // This replaces the tracking screen and shows delivery confirmation + 5-star rating
        router.replace(`/(tabs)/delivery-confirmed/${orderId}`);
      } else {
        setOtpError('Invalid OTP');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Track Order</Text>
            <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                setError(null);
                setIsLoading(true);
                fetchOrderDetails();
              }}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Partner Info */}
        {deliveryPartner && (
          <View style={styles.partnerSection}>
            <View style={styles.partnerCard}>
              <View style={styles.partnerHeader}>
                <View>
                  <Text style={styles.partnerName}>{deliveryPartner.name}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingStars}>⭐ {deliveryPartner.rating.toFixed(1)}</Text>
                    <Text style={styles.deliveriesCount}>
                      • {deliveryPartner.total_deliveries} deliveries
                    </Text>
                  </View>
                </View>
              </View>

              {/* Vehicle Info */}
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleLabel}>🚗 {deliveryPartner.vehicle_type}</Text>
                <Text style={styles.vehicleNumber}>{deliveryPartner.vehicle_number}</Text>
              </View>

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleContactPartner}
                >
                  <Text style={styles.actionButtonText}>📞 Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShareLocation}
                >
                  <Text style={styles.actionButtonText}>📍 Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ETA & Distance Section */}
        <View style={styles.etaSection}>
          <View style={styles.etaCard}>
            <View style={styles.etaLeft}>
              <Text style={styles.etaTime}>{formatEta(eta)}</Text>
              <Text style={styles.etaLabel}>Estimated arrival</Text>
            </View>

            {distance !== null && (
              <View style={styles.distanceBox}>
                <Text style={styles.distanceValue}>{distance.toFixed(1)}</Text>
                <Text style={styles.distanceLabel}>km away</Text>
              </View>
            )}
          </View>
        </View>

        {/* Current Location Status */}
        {partnerLocation && (
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Live Location</Text>
            <View style={styles.locationCard}>
              <Text style={styles.locationIndicator}>● Live</Text>
              <Text style={styles.coordinates}>
                📍 {partnerLocation.lat.toFixed(4)}, {partnerLocation.lng.toFixed(4)}
              </Text>
              <Text style={styles.locationTime}>
                Updated {Math.floor((Date.now() - partnerLocation.timestamp) / 1000)}s ago
              </Text>
            </View>
          </View>
        )}

        {/* Order Status Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <StatusTimeline order={order} />
        </View>

        {/* Delivery Address */}
        {order?.delivery_address && (
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressText}>{order.delivery_address}</Text>
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <View style={styles.summaryCard}>
            <SummaryRow label="Order ID" value={order.id} />
            <SummaryRow
              label="Items"
              value={`${order.order_items?.length || 0} item${order.order_items?.length !== 1 ? 's' : ''}`}
              border
            />
            <SummaryRow
              label="Total"
              value={paise(order.total_amount)}
              border
              bold
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Contact our support team if you face any issues with your delivery.
          </Text>
        </View>
      </ScrollView>

      {/* OTP Modal */}
      {showOtpModal && (
        <OtpModal
          orderId={orderId!}
          otp={order?.delivery_otp}
          onInput={setOtpInput}
          onSubmit={handleVerifyOtp}
          error={otpError}
          isLoading={verifyingOtp}
          otpValue={otpInput}
        />
      )}
    </SafeAreaView>
  );
}

// OTP Modal Component
function OtpModal({
  orderId,
  otp,
  onInput,
  onSubmit,
  error,
  isLoading,
  otpValue,
}: {
  orderId: string;
  otp: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  error: string | null;
  isLoading: boolean;
  otpValue: string;
}) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Delivery Confirmation</Text>
        <Text style={styles.modalSubtitle}>
          Please enter the OTP provided by the delivery partner
        </Text>

        <View style={styles.otpInputSection}>
          <Text style={styles.otpLabel}>OTP:</Text>
          <Text style={styles.otpDisplay}>{otp}</Text>
          <Text style={styles.otpInstruction}>
            (Share this code with the delivery partner)
          </Text>
        </View>

        <Text style={styles.orText}>OR</Text>

        <View style={styles.mainOtpInput}>
          <Text style={styles.mainOtpLabel}>Enter OTP from partner:</Text>
          <View style={styles.inputBox}>
            <Text style={styles.otpValue}>{otpValue}</Text>
          </View>
          {error && <Text style={styles.otpInputError}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={onSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Status Timeline Component
function StatusTimeline({ order }: { order: any }) {
  const statuses = [
    { key: 'created', label: 'Order Placed', icon: '✓' },
    { key: 'accepted', label: 'Accepted', icon: '✓' },
    { key: 'packing', label: 'Packing', icon: '📦' },
    { key: 'ready', label: 'Ready', icon: '✓' },
    { key: 'assigned', label: 'Assigned', icon: '🚗' },
    { key: 'picked_up', label: 'Picked Up', icon: '✓' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: '📍' },
    { key: 'delivered', label: 'Delivered', icon: '✓' },
  ];

  const currentStatusIndex = statuses.findIndex(s => s.key === order.order_status);

  return (
    <View style={styles.timeline}>
      {statuses.map((status, index) => {
        const isCompleted = index <= currentStatusIndex;
        const isCurrent = index === currentStatusIndex;

        return (
          <View key={status.key} style={styles.timelineItem}>
            <View
              style={[
                styles.timelineIcon,
                isCompleted && styles.timelineIconCompleted,
              ]}
            >
              <Text style={styles.timelineIconText}>{status.icon}</Text>
            </View>

            <View style={styles.timelineContent}>
              <Text
                style={[
                  styles.timelineLabel,
                  isCompleted && styles.timelineLabelCompleted,
                  isCurrent && styles.timelineLabelCurrent,
                ]}
              >
                {status.label}
              </Text>
            </View>

            {index < statuses.length - 1 && (
              <View
                style={[
                  styles.timelineConnector,
                  isCompleted && styles.timelineConnectorCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// Summary Row Component
function SummaryRow({
  label,
  value,
  border = false,
  bold = false,
}: {
  label: string;
  value: string;
  border?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, border && styles.summaryRowBorder]}>
      <Text style={bold ? styles.summaryLabelBold : styles.summaryLabel}>
        {label}
      </Text>
      <Text style={bold ? styles.summaryValueBold : styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  // Error card
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Delivery Partner Section
  partnerSection: {
    marginBottom: 20,
  },
  partnerCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803d',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingStars: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600',
  },
  deliveriesCount: {
    fontSize: 13,
    color: '#6b7280',
    marginStart: 4,
  },
  vehicleInfo: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  vehicleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ETA Section
  etaSection: {
    marginBottom: 20,
  },
  etaCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe69c',
  },
  etaLeft: {
    flex: 1,
  },
  etaTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#856404',
  },
  etaLabel: {
    fontSize: 13,
    color: '#997404',
    marginTop: 4,
  },
  distanceBox: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#856404',
  },
  distanceLabel: {
    fontSize: 12,
    color: '#997404',
    marginTop: 2,
  },

  // Location Section
  locationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  locationIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    fontFamily: 'monospace',
  },
  locationTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },

  // Timeline Section
  timelineSection: {
    marginBottom: 20,
  },
  timeline: {
    gap: 8,
  },
  timelineItem: {
    flex Direction: 'row',
    alignItems: 'flex-start',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIconCompleted: {
    backgroundColor: '#10b981',
  },
  timelineIconText: {
    fontSize: 16,
    color: '#fff',
  },
  timelineContent: {
    flex: 1,
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  timelineLabelCompleted: {
    color: '#10b981',
  },
  timelineLabelCurrent: {
    fontWeight: '700',
    color: '#1f2937',
  },
  timelineConnector: {
    position: 'absolute',
    left: 15,
    top: 40,
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
  },
  timelineConnectorCompleted: {
    backgroundColor: '#10b981',
  },

  // Address Section
  addressSection: {
    marginBottom: 20,
  },
  addressCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 21,
  },

  // Summary Section
  summarySection: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryLabelBold: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  summaryValueBold: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '700',
  },

  // Support Section
  supportSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },

  // OTP Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  otpInputSection: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  otpDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'monospace',
    letterSpacing: 8,
    marginVertical: 12,
    textAlign: 'center',
  },
  otpInstruction: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  orText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
    marginVertical: 12,
  },
  mainOtpInput: {
    marginBottom: 16,
  },
  mainOtpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 10,
  },
  inputBox: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  otpValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 2,
  },
  otpInputError: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 6,
  },

  // Buttons
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
