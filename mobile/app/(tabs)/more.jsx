import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../src/components/Screen';
import { Avatar, Button, Card, Chip, ListRow, Row } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { api, errorMessage, session } from '../../src/lib/api';
import { userName } from '../../src/lib/format';
import { C, type } from '../../src/lib/theme';

export default function MoreScreen() {
  const { user, company, logout, hasFeature, inDevelopment, can, setUser } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.fileName || 'foto.jpg', type: asset.mimeType || 'image/jpeg' });
      setUser(await api.postForm('/me/avatar', form));
    } catch (err) {
      Alert.alert('No se pudo subir la foto', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmLogout = () => Alert.alert('Cerrar sesión', '¿Salir de Event Box en este teléfono?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: logout }]);

  const payroll = hasFeature('payroll');
  return (
    <Screen title="Más" company={company}>
      <Card>
        <Row gap={14}>
          <Avatar user={user} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{userName(user)}</Text>
            <Text style={type.small}>@{user.username}</Text>
            <Row gap={6} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              {user.roleName && <Chip label={user.roleName} color={C.primary} small />}
              {user.access === 'temporary' && <Chip label="Acceso temporal" color={C.accent} small />}
            </Row>
          </View>
        </Row>
        <Button title="Cambiar foto" variant="outlined" small icon="camera-outline" onPress={changePhoto} loading={busy} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
      </Card>

      <Card style={{ padding: 0 }}>
        {payroll && <ListRow icon="receipt-outline" title="Mis recibos" subtitle="Ver y firmar los recibos de sueldo" onPress={() => router.push('/payslips')} />}
        {can('serviceOrders', 'read') && <ListRow icon="calendar-outline" title="Eventos" subtitle="Los eventos de la empresa" onPress={() => router.push('/events')} />}
        <ListRow icon="bug-outline" title="Reportar un problema" subtitle="Le llega al equipo de SRV" onPress={() => router.push('/feedback')} />
      </Card>

      {!payroll && (
        <Text style={[type.small, { marginBottom: 12 }]}>Los recibos de sueldo son parte del plan Profesional{inDevelopment('payroll') ? ' (en desarrollo)' : ''}.</Text>
      )}

      <Card style={{ padding: 0 }}>
        <ListRow icon="server-outline" title="Servidor" subtitle={session.baseUrl} right={<View />} onPress={() => Alert.alert('Servidor', 'La dirección del servidor se cambia desde la pantalla de ingreso, después de cerrar sesión.')} />
        <ListRow icon="log-out-outline" title="Cerrar sesión" color={C.danger} onPress={confirmLogout} right={<View />} />
      </Card>
      <Text style={[type.small, { textAlign: 'center', marginTop: 10 }]}>Event Box · un producto de SRV · wearesrv.com</Text>
    </Screen>
  );
}
