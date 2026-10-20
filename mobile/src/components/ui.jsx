import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fileUrl } from '../lib/api';
import { initials } from '../lib/format';
import { C, R, type } from '../lib/theme';

export const Title = ({ children, style }) => <Text style={[type.h1, style]}>{children}</Text>;
export const Subtitle = ({ children, style }) => <Text style={[type.body, { marginTop: 4 }, style]}>{children}</Text>;
export const Overline = ({ children, style }) => <Text style={[type.overline, style]}>{children}</Text>;

export const Card = ({ children, style, onPress, accent }) => {
  const body = <View style={[s.card, accent && { borderColor: C.primary, borderWidth: 2 }, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  );
};

export const Chip = ({ label, color = C.text3, filled, small, style }) => (
  <View style={[s.chip, { borderColor: color }, filled && { backgroundColor: color }, small && { paddingVertical: 1, paddingHorizontal: 7 }, style]}>
    <Text style={[s.chipText, { color: filled ? '#000' : color }, small && { fontSize: 11 }]}>{label}</Text>
  </View>
);

export const Button = ({ title, onPress, variant = 'contained', color = C.primary, loading, disabled, icon, style, small }) => {
  const off = disabled || loading;
  const contained = variant === 'contained';
  const text = contained ? '#fff' : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        contained ? { backgroundColor: color } : { borderWidth: 1.5, borderColor: variant === 'text' ? 'transparent' : color },
        off && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={text} style={{ marginRight: 6 }} />}
          <Text style={[s.btnText, { color: text }, small && { fontSize: 13 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

export const Field = ({ label, error, style, ...props }) => (
  <View style={[{ marginBottom: 12 }, style]}>
    {label && <Text style={s.label}>{label}</Text>}
    <TextInput placeholderTextColor={C.text3} style={[s.input, error && { borderColor: C.danger }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} />
    {error && <Text style={[type.small, { color: C.danger, marginTop: 4 }]}>{error}</Text>}
  </View>
);

/** Campo de contraseña con el ojo para mostrarla u ocultarla. */
export const PasswordField = ({ label, error, style, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label && <Text style={s.label}>{label}</Text>}
      <View>
        <TextInput
          placeholderTextColor={C.text3}
          style={[s.input, { paddingRight: 48 }, error && { borderColor: C.danger }]}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={C.text3} />
        </Pressable>
      </View>
      {error && <Text style={[type.small, { color: C.danger, marginTop: 4 }]}>{error}</Text>}
    </View>
  );
};

export const Loading = ({ label = 'Cargando…' }) => (
  <View style={s.center}>
    <ActivityIndicator color={C.primary} size="large" />
    <Text style={[type.small, { marginTop: 10 }]}>{label}</Text>
  </View>
);

export const ErrorState = ({ message, onRetry }) => (
  <View style={s.center}>
    <Ionicons name="alert-circle-outline" size={40} color={C.danger} />
    <Text style={[type.h3, { marginTop: 8, textAlign: 'center' }]}>{message || 'No se pudo cargar la información.'}</Text>
    {onRetry && <Button title="Reintentar" variant="outlined" onPress={onRetry} style={{ marginTop: 14 }} />}
  </View>
);

export const EmptyState = ({ title, description, icon = 'file-tray-outline' }) => (
  <View style={[s.center, { paddingVertical: 36 }]}>
    <Ionicons name={icon} size={36} color={C.text3} />
    <Text style={[type.h3, { marginTop: 8, textAlign: 'center' }]}>{title}</Text>
    {description && <Text style={[type.small, { marginTop: 4, textAlign: 'center', maxWidth: 300 }]}>{description}</Text>}
  </View>
);

export const Avatar = ({ user, size = 40 }) => {
  const uri = fileUrl(user?.avatarUrl);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.surface2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials(user)}</Text>
    </View>
  );
};

export const Row = ({ children, style, gap = 8 }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;

export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 10 }} />;

/** Fila de lista con flecha a la derecha. */
export const ListRow = ({ icon, title, subtitle, onPress, right, color = C.text }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.listRow, pressed && { backgroundColor: C.surface2 }]}>
    {icon && <Ionicons name={icon} size={22} color={color} style={{ width: 30 }} />}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[type.h3, { color, fontSize: 15 }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={type.small} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {right ?? <Ionicons name="chevron-forward" size={18} color={C.text3} />}
  </Pressable>
);

export const Stat = ({ label, value, hint, accent, onPress }) => (
  <Card onPress={onPress} style={{ flex: 1, paddingVertical: 12 }}>
    <Overline>{label}</Overline>
    <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.8, color: accent || C.text, lineHeight: 36 }}>{value}</Text>
    {hint && <Text style={type.small}>{hint}</Text>}
  </Card>
);

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R, padding: 14, marginBottom: 10 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 46, paddingHorizontal: 18, borderRadius: R },
  btnSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: '800' },
  label: { ...type.small, fontWeight: '700', color: C.text2, marginBottom: 6 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
});
