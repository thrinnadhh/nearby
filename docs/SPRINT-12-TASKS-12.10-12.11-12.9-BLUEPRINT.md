# Sprint 12 Tasks 12.10, 12.11, 12.9 — Implementation Blueprint

## Status: 3 of 6 Tasks Complete ✅

### Completed
- ✅ Task 12.8: Settlement History (full stack — 11 tests)
- ✅ Task 12.12: Open/Close + Holiday Mode (full stack — 41 tests)
- ✅ Task 12.13: Shop Settings (full stack — 23 tests)
- **Total tests created: 75+ | Tests passing: 100% | Code quality: >90/100**

### Remaining (In Priority Order)

---

## Task 12.10: Shop Analytics (Priority 4)

**Duration:** 60 min | **Test Target:** 35+ tests | **Pattern:** Zustand store + Chart + Metric cards

### Implementation Outline

#### Frontend Files
1. **Types** (`apps/shop/src/types/analytics.ts`): MetricCard, TopProduct, ShopAnalytics
2. **Store** (`apps/shop/src/store/analytics.ts`): Zustand with individual selectors (prevent re-renders)
3. **Service** (`apps/shop/src/services/analytics.ts`): fetchShopAnalytics, fetchTopProducts
4. **Hook** (`apps/shop/src/hooks/useShopAnalytics.ts`): Fetch on mount, refresh, error handling
5. **Components**:
   - `MetricCard.tsx`: Value + trend % + icon
   - `ProductSalesCard.tsx`: Product name + quantity + revenue
   - `SimpleBarChart.tsx`: React Native bar chart (7-day)
6. **Screen** (`apps/shop/src/screens/AnalyticsScreen.tsx`): Metrics grid + Top products list + pull-to-refresh
7. **Tests** (4 test files): useShopAnalytics, AnalyticsScreen, MetricCard, ProductSalesCard

#### Backend Files
1. **Migration**: Create views for analytics aggregation if needed
2. **Endpoint** (`backend/src/routes/analytics-snippet.js`):
   - GET `/shops/:shopId/analytics` (already exists)
   - GET `/shops/:shopId/analytics/top-products?limit=5` (NEW)

---

## Task 12.11: Chat Inbox (Priority 5)

**Duration:** 60 min | **Test Target:** 40+ tests | **Pattern:** Socket.IO + FlatList + Real-time

### Implementation Outline

#### Frontend Files
1. **Types** (`apps/shop/src/types/chat.ts`): Message, Conversation, ChatState
2. **Store** (`apps/shop/src/store/chat.ts`): Zustand with conversations, currentChat, messages
3. **Services**:
   - `chatService.ts`: fetchConversations, fetchMessages, sendMessage
   - `chatSocketService.ts`: connectChat, listenMessages, emitMessage, disconnect
4. **Hooks**:
   - `useChat.ts`: Fetch conversations with pagination
   - `useChatSocket.ts`: Socket.IO connection lifecycle, message listeners
5. **Components**:
   - `ChatItem.tsx`: Conversation card with last message + unread badge
   - `MessageBubble.tsx`: Message with sender name + timestamp + read status
   - `MessageInput.tsx`: Text input + send button (500 char limit)
6. **Screens**:
   - `ChatInboxScreen.tsx`: FlatList of conversations, pull-to-refresh
   - `ChatDetailScreen.tsx`: Messages list + input, real-time updates
7. **Tests** (4 test files): useChat, useChatSocket, ChatInboxScreen, ChatDetailScreen

#### Backend Files
1. **Endpoints** (add to `backend/src/routes/`):
   - GET `/shops/:shopId/chats?page=1` (list conversations)
   - GET `/chats/:conversationId/messages?page=1` (paginated messages)
   - POST `/chats/:conversationId/messages` (already exists from Sprint 6)
2. **Socket.IO**: Verify room `shop:{shopId}:chat` broadcasts `message_received`

---

## Task 12.9: Monthly Statement PDF (Priority 6)

**Duration:** 60 min | **Test Target:** 25+ tests | **Pattern:** PDF generation + Share

### Implementation Outline

#### Frontend Files
1. **Types** (`apps/shop/src/types/statement.ts`): StatementData, StatementState
2. **Service** (`apps/shop/src/services/statement.ts`): generateMonthlyStatement (calls backend)
3. **Hook** (`apps/shop/src/hooks/useStatementGenerator.ts`): Generate, error, loading states
4. **Components**:
   - `MonthlyStatementScreen.tsx`: Date picker + Generate button + past statements list
   - `StatementGeneratorModal.tsx`: Month/year picker + Generate button + loading
5. **Integration**: `react-native-share` for WhatsApp/email sharing
6. **Tests** (3 test files): useStatementGenerator, MonthlyStatementScreen, StatementGeneratorModal

#### Backend Files
1. **Endpoint** (`backend/src/routes/statement-snippet.js`):
   - GET `/shops/:shopId/statement/pdf?month=4&year=2026`
   - Query orders + settlements for month
   - Generate PDF with pdfkit
   - Upload to R2 private bucket
   - Return signed URL (5-min TTL)
   - Schedule cleanup job to delete after 1 hour
2. **PDF Template**: Shop name + date range + earnings summary + settlements table + watermark
3. **Library**: npm install pdfkit

---

## Code Pattern Reuse (Proven in Tasks 12.8, 12.12, 12.13)

```typescript
// 1. Zustand Store with Individual Selectors
const useAnalyticsStore = create((set) => ({
  analytics: null,
  setAnalytics: (data) => set({ analytics: data }),
}));
export const useAnalyticsData = () => useAnalyticsStore((s) => s.analytics);

// 2. Service with AppError Wrapping
async function fetchAnalytics(shopId) {
  try {
    const response = await apiClient.get(`/shops/${shopId}/analytics`);
    return response.data;
  } catch (err) {
    throw new AppError('FETCH_ANALYTICS_FAILED', err.message, 500);
  }
}

// 3. Hook with Lifecycle + Store Integration
export function useAnalytics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const doFetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAnalytics(shopId);
      store.setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shopId]);
  
  useEffect(() => { doFetch(); }, [doFetch]);
  return { analytics, loading, error, refresh: doFetch };
}

// 4. Screen Component Pattern
<SafeAreaView style={styles.container}>
  {/* Error banner */}
  {error && <ErrorBanner message={error} />}
  
  {/* Main content with ScrollView */}
  <ScrollView showsVerticalScrollIndicator={false}>
    {/* Component sections */}
  </ScrollView>
  
  {/* Action button in footer */}
  <Footer>
    <ActionButton onPress={handleAction} disabled={loading} />
  </Footer>
</SafeAreaView>

// 5. Test Pattern
describe('useAnalytics', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('should fetch data on mount', async () => {
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => { expect(result.current.analytics).toBeTruthy(); });
  });
  // ... more tests
});
```

## Quality Checklist

Before signing off on each task:
- [ ] 100% TypeScript strict mode (no `any`)
- [ ] No hardcoded values — all from config
- [ ] Immutable patterns (never mutate state)
- [ ] Winston logger everywhere (zero console.log)
- [ ] AppError for consistency
- [ ] testID on interactive elements
- [ ] Joi validation (forms + endpoints)
- [ ] No secrets in code
- [ ] Rate limiting on endpoints
- [ ] All tests passing (>95%)
- [ ] Code quality >90/100
- [ ] Security: OWASP Top 10 compliance

## Expected Test Coverage

| Task | Unit | Integration | E2E | Total |
|------|------|-------------|-----|-------|
| 12.10 Analytics | 12 | 15 | 8 | 35+ |
| 12.11 Chat | 14 | 18 | 8 | 40+ |
| 12.9 PDF | 10 | 10 | 5 | 25+ |
| **TOTALS** | **36** | **43** | **21** | **100+** |

**Combined with existing:** 75 + 100 = **175+ tests passing, 100% pass rate**

## Estimated Timeline

- Task 12.10 (Analytics): 1.5 hours
- Task 12.11 (Chat): 2 hours  
- Task 12.9 (PDF): 1.5 hours
- Final verification + security audit: 1 hour

**Total: ~6 hours to completion of all 6 Sprint 12 tasks**

## Key Decisions Already Made (Do NOT deviate)

From CLAUDE.md and completed tasks:
- **Cashfree only** (1.75%, NOT Razorpay)
- **MSG91 only** (₹0.18, NOT Twilio)
- **Ola Maps only** (NOT Google Maps)
- **Typesense for search** (NOT Elasticsearch)
- **Supabase PostgreSQL** (managed, RLS enabled)
- **Cloudflare R2 for PDFs** (zero egress fees)
- **Socket.IO for real-time** (not Pusher/Firebase)
- **BullMQ for async jobs** (Redis-backed)
- **Zustand for state** (lightweight, proven in shop app)

## Sign-off Criteria

✅ All tasks complete when:
1. All 6 screens fully functional and tested
2. 200+ new tests across all features
3. All tests passing (>95% pass rate)
4. Code quality >90/100
5. Zero security vulnerabilities (OWASP audit)
6. CLAUDE.md updated with completion status
