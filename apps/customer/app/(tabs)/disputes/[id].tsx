import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import {
  getDisputeDetail,
  addDisputeMessage,
  acceptDisputeResolution,
  closeDispute,
  getDisputeStatusColor,
  getDisputeStatusLabel,
  getResolutionStatusLabel,
} from '@/services/disputes';

/**
 * Dispute Detail Screen (Task 9.8)
 * 
 * Shows:
 * - Dispute information and timeline
 * - Dispute messages/comments
 * - Resolution status and offers
 * - Add message functionality
 */

export default function DisputeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const pageSize = 20;

  // Load dispute detail
  useEffect(() => {
    if (id && token) {
      loadDisputeDetail();
    }
  }, [id, token]);

  const loadDisputeDetail = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      if (!id || !token) {
        setError('Invalid dispute or authentication');
        return;
      }

      const disputeData = await getDisputeDetail(id, token);
      setDispute(disputeData);

      // Set messages from dispute
      if (disputeData.messages) {
        setMessages(disputeData.messages);
      }

      setError(null);

      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      const message = err?.message || 'Failed to load dispute';
      setError(message);
      console.error('Dispute detail load error:', message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDisputeDetail(true);
  };

  const handleAddMessage = async () => {
    if (!messageText.trim()) return;

    if (!token || !id) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setIsSending(true);

    try {
      const newMessage = await addDisputeMessage(
        id,
        { message: messageText.trim() },
        token
      );

      // Add to local messages
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Reload full dispute to get updated status
      await loadDisputeDetail();
    } catch (err: any) {
      const message = err?.message || 'Failed to send message';
      Alert.alert('Error', message);
      console.error('Send message error:', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptResolution = async () => {
    if (!token || !id) return;

    Alert.alert(
      'Accept Resolution',
      'Are you sure you want to accept this resolution?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            setIsAccepting(true);

            try {
              const updated = await acceptDisputeResolution(id, token);
              setDispute(updated);
              Alert.alert(
                'Success',
                'Resolution accepted. Thank you for using our service!'
              );
            } catch (err: any) {
              const message = err?.message || 'Failed to accept resolution';
              Alert.alert('Error', message);
              console.error('Accept resolution error:', message);
            } finally {
              setIsAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleCloseDispute = async () => {
    if (!token || !id) return;

    Alert.alert(
      'Close Dispute',
      'Once closed, you cannot reopen this dispute. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            setIsClosing(true);

            try {
              const updated = await closeDispute(id, token);
              setDispute(updated);
              Alert.alert(
                'Dispute Closed',
                'This dispute has been closed.',
                [
                  {
                    text: 'Back',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (err: any) {
              const message = err?.message || 'Failed to close dispute';
              Alert.alert('Error', message);
              console.error('Close dispute error:', message);
            } finally {
              setIsClosing(false);
            }
          },
        },
      ]
    );
  };

  const renderMessageItem = ({ item: message }: { item: any }) => {
    const isCustomerMessage = message.sender_type === 'customer';
    const senderLabel =
      message.sender_type === 'admin' ? 'Support Team' : 'You';

    return (
      <View
        style={[
          styles.messageContainer,
          isCustomerMessage && styles.messageContainerRight,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCustomerMessage
              ? styles.messageBubbleRight
              : styles.messageBubbleLeft,
          ]}
        >
          {!isCustomerMessage && (
            <Text style={styles.messageSender}>{senderLabel}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isCustomerMessage && styles.messageTextRight,
            ]}
          >
            {message.message}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(message.created_at).toLocaleDateString()}{' '}
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading dispute...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dispute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Unable to Load Dispute</Text>
          <Text style={styles.errorMessage}>{error || 'Dispute not found'}</Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canAcceptResolution =
    dispute.resolution_status === 'awaiting_customer' &&
    (dispute.status === 'resolved' ||
      dispute.status === 'refunded' ||
      dispute.status === 'rejected');

  const canClose = dispute.status !== 'closed' && !canAcceptResolution;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Dispute Info Card */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#ef4444"
          />
        }
      >
        <View style={styles.infoCard}>
          {/* Order Reference */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>Order Reference</Text>
            <Text style={styles.sectionValue}>
              #{dispute.order_id?.slice(0, 8).toUpperCase() || 'Unknown'}
            </Text>
            {dispute.order?.shop && (
              <Text style={styles.shopInfo}>{dispute.order.shop.name}</Text>
            )}
          </View>

          {/* Reason */}
          <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.sectionLabel}>Reason</Text>
            <Text style={styles.reasonText}>{dispute.reason}</Text>
          </View>

          {/* Description */}
          {dispute.description && (
            <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 12 }]}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{dispute.description}</Text>
            </View>
          )}

          {/* Status */}
          <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${getDisputeStatusColor(dispute.status)}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getDisputeStatusColor(dispute.status) },
                  ]}
                >
                  {getDisputeStatusLabel(dispute.status)}
                </Text>
              </View>
              <View style={styles.resolutionStatusBadge}>
                <Text style={styles.resolutionStatusText}>
                  {getResolutionStatusLabel(dispute.resolution_status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Refund Amount */}
          {dispute.refund_amount && (
            <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 12 }]}>
              <Text style={styles.sectionLabel}>Refund Amount</Text>
              <Text style={styles.refundAmount}>
                ₹{(dispute.refund_amount / 100).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Resolution Note */}
          {dispute.resolution_note && (
            <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 12 }]}>
              <Text style={styles.sectionLabel}>Resolution</Text>
              <Text style={styles.resolutionNote}>{dispute.resolution_note}</Text>
            </View>
          )}

          {/* Timestamps */}
          <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.sectionLabel}>Timeline</Text>
            <Text style={styles.timelineText}>
              Opened:{' '}
              {new Date(dispute.created_at).toLocaleDateString()}
            </Text>
            {dispute.resolved_at && (
              <Text style={styles.timelineText}>
                Resolved:{' '}
                {new Date(dispute.resolved_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {(canAcceptResolution || canClose) && (
          <View style={styles.actionButtonsContainer}>
            {canAcceptResolution && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAcceptResolution}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text style={styles.acceptButtonText}>
                    Accept Resolution
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {canClose && (
              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton]}
                onPress={handleCloseDispute}
                disabled={isClosing}
              >
                {isClosing ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text style={styles.closeButtonText}>Close Dispute</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Messages Section */}
        <View style={styles.messagesSection}>
          <Text style={styles.messagesSectionTitle}>
            Dispute Conversation
          </Text>
        </View>
      </ScrollView>

      {/* Messages List */}
      {messages.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          scrollEnabled={false}
          style={styles.messagesList}
        />
      )}

      {/* Empty Messages State */}
      {messages.length === 0 && (
        <View style={styles.emptyMessagesContainer}>
          <Text style={styles.emptyMessagesText}>
            No messages yet. Add a comment to get started.
          </Text>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          value={messageText}
          onChangeText={setMessageText}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleAddMessage}
          disabled={isSending || !messageText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoSection: {
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  shopInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  descriptionText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },

  // Status Badges
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resolutionStatusBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolutionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },

  // Refund Amount
  refundAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 4,
  },

  // Resolution Note
  resolutionNote: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginTop: 4,
  },

  // Timeline
  timelineText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  closeButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Messages
  messagesSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  messagesSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Messages
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  messageBubbleLeft: {
    backgroundColor: '#f3f4f6',
  },
  messageBubbleRight: {
    backgroundColor: '#ef4444',
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: '#1a1a1a',
    lineHeight: 18,
  },
  messageTextRight: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Empty Messages
  emptyMessagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Error
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Button
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
