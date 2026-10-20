import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Loading, Overline, Row } from '../src/components/ui';
import { api, downloadPrivate, errorMessage } from '../src/lib/api';
import { formatArs, formatDateTime, periodLabel } from '../src/lib/format';
import { useLoader } from '../src/lib/useLoader';
import { C, type } from '../src/lib/theme';

const KIND = { mensual: 'Sueldo mensual', aguinaldo: 'Aguinaldo', vacaciones: 'Vacaciones', liquidacion_final: 'Liquidación final', otro: 'Otro' };
const SLIP = { pending: ['Sin firmar', C.warn], signed: ['Firmado', C.ok], disputed: ['En disconformidad', C.danger] };

/** Los recibos de la persona que entró: ver el PDF y firmarlo en conformidad o disconformidad. */
export default function PayslipsScreen() {
  const { data, loading, error, reload, refreshing, refresh } = useLoader(() => api.get('/me/payslips'), []);
  const [opening, setOpening] = useState(null);
  const [disagree, setDisagree] = useState(null); // recibo para firmar en disconformidad
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const open = async (slip) => {
    setOpening(slip.id);
    try {
      const file = await downloadPrivate(`/payslips/${slip.id}/file?view=1`, `recibo_${slip.period}.pdf`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Recibo ${periodLabel(slip.period)}` });
      else Alert.alert('Recibo descargado', file.uri);
    } catch (err) {
      Alert.alert('No se pudo abrir el recibo', errorMessage(err));
    } finally {
      setOpening(null);
    }
  };

  const sign = async (slip, agree) => {
    setBusy(true);
    try {
      const res = await api.post(`/me/payslips/${slip.id}/sign`, { agree, comment: agree ? '' : comment.trim() });
      Alert.alert('Listo', res.message);
      setDisagree(null);
      setComment('');
      reload();
    } catch (err) {
      Alert.alert('No se pudo firmar', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmSign = (slip) =>
    Alert.alert('Firmar en conformidad', `Recibo de ${periodLabel(slip.period)}. Al firmar confirmás que lo recibiste y estás de acuerdo con lo liquidado. Queda registrado con fecha y hora.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Firmar', onPress: () => sign(slip, true) },
    ]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const pending = data.payslips.filter((p) => p.status === 'pending').length;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} refreshing={refreshing} onRefresh={refresh}>
      {pending > 0 && (
        <Card style={{ borderColor: C.warn }}>
          <Text style={[type.body, { color: C.warn }]}>Tenés {pending} recibo{pending === 1 ? '' : 's'} sin firmar.</Text>
        </Card>
      )}
      {!data.payslips.length && <EmptyState icon="receipt-outline" title="Todavía no tenés recibos" description="Cuando tu empresa cargue uno, te llega un mail y aparece acá." />}
      {data.payslips.map((s) => {
        const [label, color] = SLIP[s.status];
        return (
          <Card key={s.id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={[type.h2, { textTransform: 'capitalize' }]}>{periodLabel(s.period)}</Text>
                <Text style={type.small}>{KIND[s.kind] || s.kind}</Text>
              </View>
              <Chip label={label} color={color} small />
            </Row>
            {(s.netAmount || s.grossAmount) && (
              <Row gap={24} style={{ marginTop: 10 }}>
                {s.netAmount && (
                  <View>
                    <Overline>Neto</Overline>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>{formatArs(s.netAmount)}</Text>
                  </View>
                )}
                {s.grossAmount && (
                  <View>
                    <Overline>Bruto</Overline>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text2 }}>{formatArs(s.grossAmount)}</Text>
                  </View>
                )}
              </Row>
            )}
            {s.signedAt && (
              <Text style={[type.small, { marginTop: 8 }]}>
                Firmado el {formatDateTime(s.signedAt)}
                {s.employeeComment ? ` · “${s.employeeComment}”` : ''}
              </Text>
            )}
            <Row gap={8} style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <Button title="Ver PDF" variant="outlined" small icon="document-outline" onPress={() => open(s)} loading={opening === s.id} />
              {s.status === 'pending' && disagree?.id !== s.id && (
                <>
                  <Button title="Firmar" small icon="create-outline" onPress={() => confirmSign(s)} disabled={busy} />
                  <Button title="No estoy de acuerdo" variant="text" small color={C.danger} onPress={() => setDisagree(s)} disabled={busy} />
                </>
              )}
            </Row>
            {disagree?.id === s.id && (
              <View style={{ marginTop: 12 }}>
                <Field label="¿Qué no te cierra?" value={comment} onChangeText={setComment} multiline placeholder="Tu empresa va a ver este motivo." />
                <Row gap={8}>
                  <Button title="Firmar en disconformidad" small color={C.danger} onPress={() => sign(s, false)} loading={busy} disabled={comment.trim().length < 5} />
                  <Button title="Cancelar" variant="text" small color={C.text3} onPress={() => setDisagree(null)} />
                </Row>
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
