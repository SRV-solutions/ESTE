import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Avatar, Card, Chip, EmptyState, ErrorState, Loading, Row, Stat } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/lib/api';
import { eventLabel, formatDate } from '../../src/lib/format';
import { STATUS, isActiveStatus, responsibleOf } from '../../src/lib/status';
import { useLoader } from '../../src/lib/useLoader';
import { C, type } from '../../src/lib/theme';

const OrderRow = ({ order, mine, onPress }) => (
  <Card onPress={onPress} accent={mine} style={{ marginBottom: 8 }}>
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={type.h3} numberOfLines={1}>
          #{order.id} · {eventLabel(order.Event)}
        </Text>
        <Text style={type.small}>
          {formatDate(order.Event?.dateEvent)} · {order.itemCount} ítems
        </Text>
      </View>
      <Chip label={STATUS[order.status]?.label} color={STATUS[order.status]?.color} small />
    </Row>
    {mine && <Text style={[type.small, { color: C.primary, fontWeight: '800', marginTop: 6 }]}>Te toca avanzarla</Text>}
  </Card>
);

export default function HomeScreen() {
  const { user, company, can, subscription } = useAuth();
  const router = useRouter();
  const canOrders = can('serviceOrders', 'read');
  const { data, loading, refreshing, error, reload, refresh } = useLoader(() => (canOrders ? api.get('/service-orders') : Promise.resolve([])), [canOrders]);

  const { active, mine } = useMemo(() => {
    const list = data || [];
    const active = list.filter((o) => isActiveStatus(o.status));
    return { active, mine: active.filter((o) => responsibleOf(o) === user.id) };
  }, [data, user.id]);

  return (
    <Screen
      title={`Hola, ${user.firstname || user.username}`}
      subtitle={user.roleName || ''}
      company={company}
      refreshing={refreshing}
      onRefresh={refresh}
      actions={
        <Pressable onPress={() => router.push('/more')}>
          <Avatar user={user} size={42} />
        </Pressable>
      }
    >
      {subscription?.state === 'grace' && (
        <Card style={{ borderColor: C.warn }}>
          <Row>
            <Ionicons name="warning-outline" size={18} color={C.warn} />
            <Text style={[type.small, { color: C.warn, flex: 1 }]}>El abono del mes está pendiente. Avisale al administrador de tu empresa.</Text>
          </Row>
        </Card>
      )}
      {user.access === 'temporary' && (
        <Card style={{ borderColor: C.primary }}>
          <Text style={type.small}>Tenés acceso temporal hasta el {new Date(user.accessUntil).toLocaleString('es-AR')}.</Text>
        </Card>
      )}

      {canOrders && (
        <Row gap={10} style={{ marginBottom: 14 }}>
          <Stat label="En curso" value={active.length} onPress={() => router.push('/orders')} />
          <Stat label="Me toca" value={mine.length} accent={mine.length ? C.accent : undefined} onPress={() => router.push({ pathname: '/orders', params: { filter: 'myTurn' } })} />
        </Row>
      )}

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !canOrders ? (
        <EmptyState icon="person-circle-outline" title="Bienvenido a Event Box" description="Tu rol no incluye órdenes. Desde “Más” podés ver tu perfil y tus recibos." />
      ) : (
        <>
          <Text style={[type.h2, { marginBottom: 8 }]}>{mine.length ? 'Te toca a vos' : 'Órdenes en curso'}</Text>
          {(mine.length ? mine : active).slice(0, 8).map((o) => (
            <OrderRow key={o.id} order={o} mine={responsibleOf(o) === user.id} onPress={() => router.push(`/orders/${o.id}`)} />
          ))}
          {!active.length && <EmptyState title="No hay órdenes en curso" description="Cuando se cree una orden de servicio va a aparecer acá." />}
          {!!mine.length && active.length > mine.length && (
            <Pressable onPress={() => router.push('/orders')} style={{ paddingVertical: 10 }}>
              <Text style={[type.small, { color: C.primary, fontWeight: '800' }]}>Ver las {active.length} órdenes en curso →</Text>
            </Pressable>
          )}
        </>
      )}
    </Screen>
  );
}
