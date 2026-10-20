import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, userName } from '../lib/format';
import { useLoader } from '../lib/useLoader';
import { C, type } from '../lib/theme';
import { Button, Card, Chip, Overline, Row } from './ui';

const distanceLabel = (m) => (m == null ? null : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

/** Ubicación del teléfono (pide permiso la primera vez). Null si no hay permiso o GPS. */
const getPosition = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
  } catch {
    return null;
  }
};

/**
 * Check-in / check-out de la orden en el evento, con el GPS del teléfono. Si la persona está dentro
 * del radio del lugar se registra directo; si está lejos, la API avisa y se pide confirmación.
 */
const CheckInCard = ({ order, canCreate }) => {
  const { data, reload } = useLoader(() => api.get(`/service-orders/${order.id}/checkins`), [order.id]);
  const [busy, setBusy] = useState(null);

  const send = async (kind, body) => {
    const res = await api.post(`/service-orders/${order.id}/checkins`, body);
    Alert.alert(kind === 'in' ? 'Check-in' : 'Check-out', res.message);
    reload();
  };

  const register = async (kind) => {
    setBusy(kind);
    try {
      const pos = await getPosition();
      const body = { kind, ...(pos || {}) };
      try {
        await send(kind, body);
      } catch (err) {
        if (err.status !== 409 || !err.errors?.confirm) throw err;
        Alert.alert('Estás lejos del lugar', `${err.message} Queda registrado como "fuera del lugar".`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registrar igual', onPress: () => send(kind, { ...body, force: true }).catch((e) => Alert.alert('No se pudo registrar', errorMessage(e))) },
        ]);
      }
    } catch (err) {
      Alert.alert('No se pudo registrar', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const place = data?.place;
  const last = data?.checkIns?.[0];
  return (
    <Card style={{ borderColor: C.accent }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Overline>Check-in / out en el evento</Overline>
        <Ionicons name="location-outline" size={16} color={C.accent} />
      </Row>
      <Text style={[type.small, { marginTop: 4 }]}>
        {place?.lat != null ? `Se verifica contra ${place.name} (radio de ${data.radiusM} m).` : `${place?.name || 'El lugar'} no tiene coordenadas: se registra sin verificar la distancia.`}
      </Text>
      {canCreate && (
        <Row gap={8} style={{ marginTop: 12 }}>
          <Button title={busy === 'in' ? 'Ubicando…' : 'Llegó'} icon="log-in-outline" small onPress={() => register('in')} disabled={!!busy} style={{ flex: 1 }} />
          <Button title={busy === 'out' ? 'Ubicando…' : 'Se retira'} icon="log-out-outline" small variant="outlined" onPress={() => register('out')} disabled={!!busy} style={{ flex: 1 }} />
        </Row>
      )}
      {data?.checkIns?.length ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          {data.checkIns.slice(0, 5).map((c) => (
            <Row key={c.id} style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.body, { color: C.text, fontSize: 14 }]} numberOfLines={1}>
                  {c.kind === 'in' ? 'Check-in' : 'Check-out'} · {userName(c.User) || 'Usuario eliminado'}
                </Text>
                <Text style={type.small}>
                  {formatDateTime(c.createdAt)}
                  {c.note ? ` · “${c.note}”` : ''}
                </Text>
              </View>
              {c.lat != null ? (
                <Chip label={c.onSite ? 'En el lugar' : `A ${distanceLabel(c.distanceM) ?? '?'}`} color={c.onSite ? C.ok : C.warn} small />
              ) : (
                <Chip label="Sin GPS" small />
              )}
            </Row>
          ))}
          {last?.lat != null && (
            <Text style={[type.small, { color: C.primary }]} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${last.lat},${last.lng}`)}>
              Ver el último en el mapa →
            </Text>
          )}
        </View>
      ) : (
        <Text style={[type.small, { marginTop: 10 }]}>Todavía no hay registros para esta orden.</Text>
      )}
    </Card>
  );
};

export default CheckInCard;
