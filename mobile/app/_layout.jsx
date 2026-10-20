import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading } from '../src/components/ui';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { C } from '../src/lib/theme';

/** Manda al login si no hay sesión, y a la app si la hay. */
const Gate = ({ children }) => {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login';

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous' && !onLogin) router.replace('/login');
    if (status === 'authenticated' && onLogin) router.replace('/');
  }, [status, onLogin, router]);

  // Mientras la redirección no se ejecutó, no se dibuja ninguna pantalla sin sesión (ni el login con sesión).
  if (status === 'loading' || (status === 'anonymous' && !onLogin) || (status === 'authenticated' && onLogin)) {
    return <Loading label="Abriendo Event Box…" />;
  }
  return children;
};

const screen = {
  headerStyle: { backgroundColor: C.bg },
  headerTintColor: C.text,
  headerTitleStyle: { fontWeight: '900' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: C.bg },
  // Solo la flecha para volver (sin el nombre de la pantalla anterior, que en las pestañas sería "(tabs)").
  headerBackButtonDisplayMode: 'minimal',
  headerBackTitle: '',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <StatusBar style="light" />
          <Gate>
            <Stack screenOptions={screen}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Inicio' }} />
              <Stack.Screen name="orders/[id]" options={{ title: 'Orden' }} />
              <Stack.Screen name="payslips" options={{ title: 'Mis recibos' }} />
              <Stack.Screen name="events" options={{ title: 'Eventos' }} />
              <Stack.Screen name="feedback" options={{ title: 'Reportar un problema', presentation: 'modal' }} />
            </Stack>
          </Gate>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
