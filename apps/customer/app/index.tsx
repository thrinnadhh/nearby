import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

// Route guard: authenticated users go to the home tab,
// unauthenticated users go to the login screen.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/login'} />
  );
}
