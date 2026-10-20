import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CheckInCard from '../../src/components/CheckInCard';
import { Button, Card, Chip, Divider, EmptyState, ErrorState, Loading, Overline, Row } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { api, errorMessage } from '../../src/lib/api';
import { eventLabel, formatDate, formatDateTime, userName } from '../../src/lib/format';
import { STATUS } from '../../src/lib/status';
import { useLoader } from '../../src/lib/useLoader';
import { C, type } from '../../src/lib/theme';

const RESPONSIBLES = [
  ['OrderedBy', 'Creada por'],
  ['CheckedBy', 'Chequea'],
  ['DeployedBy', 'Arma'],
  ['LogisticsBy', 'Logística'],
  ['ReceptionBy', 'Recepción'],
];

const Info = ({ label, value }) => (
  <View style={{ width: '48%', marginBottom: 10 }}>
    <Overline>{label}</Overline>
    <Text style={[type.body, { color: C.text }]}>{value || '—'}</Text>
  </View>
);

export default function OrderDetail() {
  const { id } = useLocalSearchParams();
  const { user, can, hasFeature } = useAuth();
  const [busy, setBusy] = useState(null);
  const { data: order, loading, error, reload } = useLoader(() => api.get(`/service-orders/${id}`), [id]);

  const change = (status) => {
    Alert.alert(STATUS[status].action, `La orden #${order.id} pasa a "${STATUS[status].label}".`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: STATUS[status].action,
        style: status === 'rejected' ? 'destructive' : 'default',
        onPress: async () => {
          setBusy(status);
          try {
            await api.patch(`/service-orders/${order.id}/status`, { status });
            await reload();
          } catch (err) {
            Alert.alert('No se pudo cambiar el estado', errorMessage(err));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (loading && !order) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const st = STATUS[order.status];
  const mine = order.access?.stage?.responsibleId === user.id;
  const next = order.access?.nextStatuses || [];
  const groups = (order.items || []).reduce((acc, it) => {
    const key = it.Category?.name || 'Sin categoría';
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Overline>Orden #{order.id}</Overline>
          <Text style={type.h1}>{eventLabel(order.Event)}</Text>
          <Text style={type.small}>{[order.Event?.organizer, order.Event?.finalClient].filter(Boolean).join(' · ')}</Text>
        </View>
        <Chip label={st?.label} color={st?.color} />
      </Row>

      {order.access?.stage && (
        <Card style={{ marginTop: 14, borderColor: mine ? C.primary : C.border }}>
          <Overline>Etapa actual · {order.access.stage.label}</Overline>
          <Text style={[type.body, { color: C.text, marginTop: 2 }]}>
            {mine ? 'Te toca a vos avanzar esta orden.' : order.access.stage.responsibleId ? `La avanza ${userName(RESPONSIBLES.map(([k]) => order[k]).find((p) => p?.id === order.access.stage.responsibleId)) || 'otra persona'}.` : 'La avanza un administrador.'}
          </Text>
          {next.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {next.map((s) => (
                <Button key={s} title={STATUS[s].action} onPress={() => change(s)} loading={busy === s} disabled={!!busy} color={s === 'rejected' ? C.danger : STATUS[s].color === C.text3 ? C.primary : STATUS[s].color} icon={s === 'rejected' ? 'close-circle-outline' : 'arrow-forward-circle-outline'} />
              ))}
            </View>
          )}
        </Card>
      )}

      {hasFeature('checkin') && can('checkin', 'read') && order.status !== 'disassembled' && <CheckInCard order={order} canCreate={can('checkin', 'create')} />}

      <Text style={[type.h2, { marginTop: 10, marginBottom: 8 }]}>Datos</Text>
      <Card>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Info label="Fecha del evento" value={formatDate(order.Event?.dateEvent)} />
          <Info label="Lugar" value={order.Event?.Location?.locationName} />
          <Info label="Creada" value={formatDate(order.createdDate)} />
          <Info label="Ítems" value={String(order.items?.length ?? 0)} />
          <Info label="Salida del depósito" value={formatDateTime(order.outcomeDate)} />
          <Info label="Vuelta al depósito" value={formatDateTime(order.incomeDate)} />
        </Row>
        {order.observations ? (
          <>
            <Divider />
            <Overline>Observaciones</Overline>
            <Text style={type.body}>{order.observations}</Text>
          </>
        ) : null}
      </Card>

      <Text style={[type.h2, { marginTop: 10, marginBottom: 8 }]}>Responsables</Text>
      <Card>
        {RESPONSIBLES.map(([key, label], i) => (
          <Row key={key} style={{ justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: C.border }}>
            <Text style={type.small}>{label}</Text>
            <Text style={[type.body, { color: order[key]?.id === user.id ? C.primary : C.text, fontWeight: order[key]?.id === user.id ? '800' : '400' }]}>{userName(order[key]) || 'Sin asignar'}</Text>
          </Row>
        ))}
      </Card>

      <Text style={[type.h2, { marginTop: 10, marginBottom: 8 }]}>Material</Text>
      {!order.items?.length ? (
        <Card>
          <EmptyState icon="cube-outline" title="Sin ítems cargados" description="El material se carga desde la versión web." />
        </Card>
      ) : (
        Object.entries(groups).map(([name, items]) => (
          <Card key={name} style={{ paddingVertical: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={type.h3}>{name}</Text>
              <Chip label={`${items.length}`} color={C.text3} small />
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {items.map((it) => (
                <View key={it.id} style={{ backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {it.Category?.isContainer && <Ionicons name="cube" size={12} color={C.accent} />}
                  <Text style={[type.mono, { fontSize: 12 }]}>{it.code}</Text>
                  {it.contents?.length ? <Text style={[type.small, { fontSize: 11 }]}>· {it.contents.length} adentro</Text> : null}
                </View>
              ))}
            </View>
          </Card>
        ))
      )}
      {order.TransferredTo && (
        <Card style={{ borderColor: C.accent }}>
          <Text style={type.small}>El material pasó a la orden #{order.TransferredTo.id}.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
