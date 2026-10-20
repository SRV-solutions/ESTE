import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Chip, Field, Row } from '../src/components/ui';
import { api, errorMessage } from '../src/lib/api';
import { C, type } from '../src/lib/theme';

const TYPES = [
  ['error', 'Algo falla'],
  ['sugerencia', 'Una idea'],
  ['consulta', 'Una consulta'],
];

export default function FeedbackScreen() {
  const router = useRouter();
  const [type_, setType] = useState('error');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) setImage(r.assets[0]);
  };

  const send = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('type', type_);
      form.append('message', message.trim());
      if (image) form.append('file', { uri: image.uri, name: image.fileName || 'captura.jpg', type: image.mimeType || 'image/jpeg' });
      await api.postForm('/feedback', form);
      Alert.alert('¡Gracias!', 'Tu reporte le llegó al equipo de SRV.', [{ text: 'Cerrar', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('No se pudo enviar', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
      <Text style={[type.body, { marginBottom: 12 }]}>Contanos qué pasó. Si podés, sumá una captura de pantalla.</Text>
      <Row gap={8} style={{ marginBottom: 14 }}>
        {TYPES.map(([v, label]) => (
          <Pressable key={v} onPress={() => setType(v)}>
            <Chip label={label} color={type_ === v ? C.primary : C.text3} filled={type_ === v} style={{ paddingVertical: 6, paddingHorizontal: 14 }} />
          </Pressable>
        ))}
      </Row>
      <Field label="Mensaje" value={message} onChangeText={setMessage} multiline placeholder="Qué estabas haciendo, qué esperabas y qué pasó." />
      {image ? (
        <View style={{ marginBottom: 12 }}>
          <Image source={{ uri: image.uri }} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: C.surface2 }} resizeMode="cover" />
          <Button title="Quitar captura" variant="text" small color={C.text3} onPress={() => setImage(null)} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : (
        <Button title="Adjuntar captura" variant="outlined" small icon="image-outline" onPress={pick} style={{ alignSelf: 'flex-start', marginBottom: 14 }} />
      )}
      <Button title="Enviar a SRV" onPress={send} loading={busy} disabled={message.trim().length < 10} icon="send-outline" />
    </ScrollView>
  );
}
