import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { errorMessage, session } from '../src/lib/api';
import { C, type } from '../src/lib/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState(() => session.baseUrl);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (server.trim() !== session.baseUrl) await session.setBaseUrl(server.trim());
      await login(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo ingresar.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Image source={require('../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} />
            <Text style={[type.h1, { marginTop: 16, fontSize: 32 }]}>Event Box</Text>
            <Text style={type.body}>El depósito y los eventos, en orden.</Text>
          </View>

          <Field label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" returnKeyType="next" />
          <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
          {!!error && (
            <Text style={[type.small, { color: C.danger, marginBottom: 12 }]}>
              {error}
            </Text>
          )}
          <Button title="Entrar" onPress={submit} loading={busy} disabled={!username.trim() || !password} />

          <Pressable onPress={() => setShowServer((v) => !v)} style={{ marginTop: 26, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="server-outline" size={14} color={C.text3} />
            <Text style={type.small}>{showServer ? 'Ocultar servidor' : `Servidor: ${server.replace(/^https?:\/\//, '')}`}</Text>
          </Pressable>
          {showServer && (
            <View style={{ marginTop: 10 }}>
              <Field label="Dirección de la API" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={session.defaultUrl} />
              <Text style={type.small}>Para probar en tu red: la IP de la PC con el puerto 3000, por ejemplo http://192.168.0.10:3000. En producción, la dirección de la API.</Text>
            </View>
          )}
          <Text style={[type.small, { textAlign: 'center', marginTop: 28 }]}>Un producto de SRV · wearesrv.com</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
