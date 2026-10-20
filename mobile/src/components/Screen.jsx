import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fileUrl } from '../lib/api';
import { C, type } from '../lib/theme';
import { Subtitle, Title } from './ui';

/** Pantalla con encabezado (título, bajada, acciones) y scroll con "tirar para actualizar". */
export const Screen = ({ title, subtitle, actions, children, refreshing, onRefresh, scroll = true, company, edges = ['top'] }) => {
  const header = (
    <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12 }}>
      {company && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {company.logoUrl ? (
            <Image source={{ uri: fileUrl(company.logoUrl) }} style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: C.surface2 }} />
          ) : null}
          <Text style={type.overline}>{company.name}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Title>{title}</Title>
          {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
        </View>
        {actions}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: C.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} /> : undefined}
        >
          {header}
          <View style={{ paddingHorizontal: 18 }}>{children}</View>
        </ScrollView>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
    </SafeAreaView>
  );
};
