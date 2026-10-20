import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Chip, EmptyState, ErrorState, Field, Row } from '../../src/components/ui';
import { api, errorMessage } from '../../src/lib/api';
import { C, type } from '../../src/lib/theme';

const LIMIT = 40;

/** Stock con búsqueda y carga por páginas al llegar al final. */
export default function ItemsScreen() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ items: [], total: 0, page: 0, loading: true, error: null });
  const query = useRef('');

  const load = useCallback(async (page, q, append = false) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get('/items', { page, limit: LIMIT, search: q || undefined });
      if (q !== query.current) return; // llegó tarde: ya se buscó otra cosa
      setState((s) => ({ items: append ? [...s.items, ...data.items] : data.items, total: data.totalItems, page, loading: false, error: null }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
    }
  }, []);

  useEffect(() => {
    query.current = search.trim();
    const t = setTimeout(() => load(1, query.current), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const more = () => {
    if (state.loading || state.items.length >= state.total) return;
    load(state.page + 1, query.current, true);
  };

  return (
    <Screen title="Stock" subtitle={state.total ? `${state.total.toLocaleString('es-AR')} ítems` : 'Cada unidad física del depósito.'} scroll={false}>
      <View style={{ paddingHorizontal: 18 }}>
        <Field placeholder="Buscar por código o categoría" value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" style={{ marginBottom: 8 }} />
      </View>
      {state.error ? (
        <ErrorState message={state.error} onRetry={() => load(1, query.current)} />
      ) : (
        <FlatList
          data={state.items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
          onEndReached={more}
          onEndReachedThreshold={0.4}
          refreshing={state.loading && state.page <= 1}
          onRefresh={() => load(1, query.current)}
          ListEmptyComponent={!state.loading && <EmptyState icon="cube-outline" title="No hay ítems para mostrar" description={search ? 'Probá con otra búsqueda.' : 'El stock se carga desde la versión web.'} />}
          ListFooterComponent={state.loading && state.items.length ? <ActivityIndicator color={C.primary} style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item }) => (
            <Row style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border, opacity: item.isActive ? 1 : 0.5 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.mono, { fontSize: 13 }]} numberOfLines={1}>
                  {item.code}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  {item.Category?.name}
                  {item.Category?.type ? ` · ${item.Category.type}` : ''}
                </Text>
              </View>
              {item.Category?.isContainer && (
                <Row gap={4}>
                  <Ionicons name="cube-outline" size={14} color={C.accent} />
                  <Text style={[type.small, { color: C.accent }]}>{item.contents?.length ?? 0}</Text>
                </Row>
              )}
              {!item.isActive && <Chip label="Inactivo" small />}
            </Row>
          )}
        />
      )}
    </Screen>
  );
}
