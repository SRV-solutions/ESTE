import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, EmptyState, ErrorState, Field, Loading, Row } from '../src/components/ui';
import { api } from '../src/lib/api';
import { formatDate } from '../src/lib/format';
import { isActiveStatus } from '../src/lib/status';
import { useLoader } from '../src/lib/useLoader';
import { C, type } from '../src/lib/theme';

export default function EventsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, loading, error, reload, refreshing, refresh } = useLoader(() => api.get('/events'), []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || []).filter((e) => !q || [e.eventName, e.Location?.locationName, e.organizer, e.producer, e.finalClient].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [data, search]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <FlatList
      data={visible}
      keyExtractor={(e) => String(e.id)}
      contentContainerStyle={{ padding: 18, paddingBottom: 32 }}
      refreshing={refreshing}
      onRefresh={refresh}
      ListHeaderComponent={<Field placeholder="Buscar evento, lugar o cliente" value={search} onChangeText={setSearch} autoCorrect={false} />}
      ListEmptyComponent={<EmptyState icon="calendar-outline" title="No hay eventos para mostrar" />}
      renderItem={({ item: e }) => {
        const orders = e.ServiceOrders || [];
        const active = orders.filter((o) => isActiveStatus(o.status));
        const one = orders.length === 1 ? orders[0] : null;
        return (
          <Card onPress={one ? () => router.push(`/orders/${one.id}`) : undefined}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={type.h3} numberOfLines={1}>
                  {e.eventName}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  {formatDate(e.dateEvent)}
                  {e.Location ? ` · ${e.Location.locationName}` : ''}
                </Text>
                {(e.organizer || e.finalClient) && (
                  <Text style={type.small} numberOfLines={1}>
                    {[e.organizer, e.finalClient].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <Chip label={orders.length ? `${active.length}/${orders.length} órdenes` : 'Sin órdenes'} color={active.length ? C.primary : C.text3} small />
            </Row>
          </Card>
        );
      }}
    />
  );
}
