import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card, Chip, EmptyState, ErrorState, Field, Loading, Row } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/lib/api';
import { eventLabel, formatDate, userName } from '../../src/lib/format';
import { STATUS, isActiveStatus, responsibleOf } from '../../src/lib/status';
import { useLoader } from '../../src/lib/useLoader';
import { C, type } from '../../src/lib/theme';

const FILTERS = [
  { value: 'active', label: 'En curso' },
  { value: 'myTurn', label: 'Me toca' },
  { value: 'mine', label: 'Mías' },
  { value: 'involved', label: 'Participo' },
  { value: 'all', label: 'Todas' },
];

const matches = (o, filter, user) => {
  switch (filter) {
    case 'active':
      return isActiveStatus(o.status);
    case 'myTurn':
      return responsibleOf(o) === user.id && isActiveStatus(o.status);
    case 'mine':
      return o.orderedBy === user.id;
    case 'involved':
      return [o.orderedBy, o.checkedBy, o.deployedBy, o.logisticsBy, o.receptionBy].includes(user.id);
    default:
      return true;
  }
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  // El filtro vive en la URL de la pestaña: así "Me toca" desde Inicio lo cambia aunque la pestaña ya esté abierta.
  const params = useLocalSearchParams();
  const filter = params.filter || 'active';
  const setFilter = (value) => router.setParams({ filter: value === 'active' ? undefined : value });
  const [search, setSearch] = useState('');
  const { data, loading, refreshing, error, reload, refresh } = useLoader(() => api.get('/service-orders'), []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || []).filter(
      (o) =>
        matches(o, filter, user) &&
        (!q || String(o.id) === q || [o.Event?.eventName, o.Event?.Location?.locationName, o.Event?.organizer, o.Event?.finalClient].filter(Boolean).some((v) => v.toLowerCase().includes(q))),
    );
  }, [data, filter, search, user]);

  return (
    <Screen title="Órdenes" subtitle="Todo el material que sale del depósito." scroll={false}>
      <View style={{ paddingHorizontal: 18 }}>
        <Field placeholder="Buscar evento, lugar, cliente o N°" value={search} onChangeText={setSearch} autoCorrect={false} style={{ marginBottom: 8 }} />
      </View>
      {/* flexGrow 0: si no, la lista de abajo (flex 1) aplasta la tira de filtros hasta que no se ve. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 10, alignItems: 'center' }}
      >
        {FILTERS.map((f) => (
          <Pressable key={f.value} onPress={() => setFilter(f.value)}>
            <Chip label={f.label} color={filter === f.value ? C.primary : C.text3} filled={filter === f.value} style={{ paddingVertical: 7, paddingHorizontal: 14 }} />
          </Pressable>
        ))}
      </ScrollView>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={<EmptyState title="No hay órdenes para mostrar" description="Probá con otro filtro." />}
          renderItem={({ item: o }) => {
            const mine = responsibleOf(o) === user.id && isActiveStatus(o.status);
            return (
              <Card onPress={() => router.push(`/orders/${o.id}`)} accent={mine} style={{ marginBottom: 8 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={type.h3} numberOfLines={1}>
                      #{o.id} · {eventLabel(o.Event)}
                    </Text>
                    <Text style={type.small} numberOfLines={1}>
                      {formatDate(o.Event?.dateEvent)} · {o.itemCount} ítems · {userName(o.OrderedBy)}
                    </Text>
                  </View>
                  <Chip label={STATUS[o.status]?.label} color={STATUS[o.status]?.color} small />
                </Row>
                {mine && <Text style={[type.small, { color: C.primary, fontWeight: '800', marginTop: 6 }]}>Te toca avanzarla</Text>}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
