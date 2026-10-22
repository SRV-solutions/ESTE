import { useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DrawOutlined from '@mui/icons-material/DrawOutlined';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import FileViewer from '../../components/FileViewer';
import { api, errorMessage } from '../../lib/api';
import { getPrivateFile, saveFile } from '../../lib/privateFiles';
import { formatDateTime, userName } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { formatArs, periodLabel } from '../../lib/money';
import { SLIP_STATUS, kindLabel } from './payroll';

/** Firma: conformidad, o disconformidad con el motivo (queda registrada con fecha y hora). */
const SignDialog = ({ slip, disagree, onClose, onSigned }) => {
  const { notify } = useFeedback();
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/me/payslips/${slip.id}/sign`, { agree: !disagree, comment });
      notify(data.message);
      onSigned();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={disagree ? 'Firmar en disconformidad' : 'Firmar en conformidad'}
      onSubmit={save}
      saving={saving}
      disabled={disagree && comment.trim().length < 5}
      submitLabel="Firmar"
      maxWidth="xs"
    >
      <Typography>
        Recibo de <b style={{ textTransform: 'capitalize' }}>{periodLabel(slip.period)}</b> · {kindLabel(slip.kind)}
      </Typography>
      {disagree ? (
        <TextField label="¿Qué no te cierra?" value={comment} onChange={(e) => setComment(e.target.value)} multiline minRows={3} autoFocus helperText="Tu empresa va a ver este motivo." />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Al firmar confirmás que recibiste el recibo y que estás de acuerdo con lo liquidado. La firma queda registrada con la fecha y la hora.
          </Typography>
          <TextField label="Comentario (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} multiline minRows={2} />
        </>
      )}
    </FormDialog>
  );
};

/** Los recibos de sueldo de la persona que entró (pensado para el celular). */
const MyPayslipsPage = () => {
  const { notify } = useFeedback();
  const { user } = useAuth();
  const [signing, setSigning] = useState(null); // { slip, disagree }
  const [viewing, setViewing] = useState(null);
  const { data, loading, error, reload } = useLoader(() => api.get('/me/payslips').then((r) => r.data), []);

  /** Ver: en el visor de la app. Descargar: lo guarda en el dispositivo. */
  const open = async (slip, view) => {
    const file = { path: `/payslips/${slip.id}/file?view=1`, title: `Recibo de ${periodLabel(slip.period)}`, fileName: `recibo_${slip.period}.pdf`, mimeType: 'application/pdf' };
    if (view) return setViewing(file);
    try {
      const entry = await getPrivateFile(file.path);
      saveFile(entry.url, file.fileName);
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pending = data.payslips.filter((p) => p.status === 'pending').length;

  return (
    <>
      <PageHeader title="Mis recibos" subtitle={`${userName(user)}${data.employee?.position ? ` · ${data.employee.position}` : ''}`} />
      {pending > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tenés {pending} recibo{pending === 1 ? '' : 's'} sin firmar.
        </Alert>
      )}
      {!data.payslips.length ? (
        <Paper variant="outlined">
          <EmptyState icon={ReceiptLongOutlined} title="Todavía no tenés recibos" description="Cuando tu empresa cargue uno, te llega un mail y aparece acá." />
        </Paper>
      ) : (
        <Stack spacing={1.25}>
          {data.payslips.map((s) => (
            <Paper key={s.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 18, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>{periodLabel(s.period)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {kindLabel(s.kind)}
                  </Typography>
                </Box>
                <Chip size="small" label={SLIP_STATUS[s.status].label} color={SLIP_STATUS[s.status].color} variant="outlined" />
              </Stack>
              {(s.netAmount || s.grossAmount) && (
                <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
                  {s.netAmount && (
                    <Box>
                      <Typography variant="caption" color="text.disabled">
                        NETO
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: 20 }}>{formatArs(s.netAmount)}</Typography>
                    </Box>
                  )}
                  {s.grossAmount && (
                    <Box>
                      <Typography variant="caption" color="text.disabled">
                        BRUTO
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 0.5 }}>{formatArs(s.grossAmount)}</Typography>
                    </Box>
                  )}
                </Stack>
              )}
              {s.signedAt && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  Firmado el {formatDateTime(s.signedAt)}
                  {s.employeeComment ? ` · “${s.employeeComment}”` : ''}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => open(s, true)}>
                  Ver
                </Button>
                <Button size="small" startIcon={<DownloadOutlined />} onClick={() => open(s, false)}>
                  Descargar
                </Button>
                {s.status === 'pending' && (
                  <>
                    <Button size="small" variant="contained" startIcon={<DrawOutlined />} onClick={() => setSigning({ slip: s, disagree: false })}>
                      Firmar
                    </Button>
                    <Button size="small" color="error" onClick={() => setSigning({ slip: s, disagree: true })}>
                      No estoy de acuerdo
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <FileViewer file={viewing} onClose={() => setViewing(null)} />
      {signing && (
        <SignDialog
          slip={signing.slip}
          disagree={signing.disagree}
          onClose={() => setSigning(null)}
          onSigned={() => {
            setSigning(null);
            reload();
          }}
        />
      )}
    </>
  );
};

export default MyPayslipsPage;
