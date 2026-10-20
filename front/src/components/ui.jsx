import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Inbox from '@mui/icons-material/InboxOutlined';
import { STATUS, statusLabel } from '../lib/status';

/** Encabezado de pantalla: título, bajada y acciones a la derecha. */
export const PageHeader = ({ title, subtitle, actions, overline }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={2}
    alignItems={{ xs: 'stretch', sm: 'flex-end' }}
    justifyContent="space-between"
    sx={{ mb: 3 }}
  >
    <Box sx={{ minWidth: 0 }}>
      {overline && (
        <Typography variant="overline" color="secondary.main" sx={{ display: 'block', lineHeight: 1.6 }}>
          {overline}
        </Typography>
      )}
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {subtitle && (
        <Typography color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
        {actions}
      </Stack>
    )}
  </Stack>
);

export const StatusChip = ({ status, size = 'small' }) => (
  <Chip label={statusLabel(status)} color={STATUS[status]?.color || 'default'} size={size} variant={status === 'disassembled' ? 'outlined' : 'filled'} />
);

export const YesNo = ({ value }) => (
  <Chip label={value ? 'Sí' : 'No'} size="small" variant="outlined" color={value ? 'primary' : 'default'} sx={{ minWidth: 44 }} />
);

export const Loading = ({ label = 'Cargando…' }) => (
  <Stack alignItems="center" spacing={2} sx={{ py: 8, color: 'text.secondary' }}>
    <CircularProgress size={32} />
    <Typography variant="body2">{label}</Typography>
  </Stack>
);

export const ErrorState = ({ message, onRetry }) => (
  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
    <ErrorOutline color="error" sx={{ fontSize: 40 }} />
    <Typography sx={{ mt: 1, fontWeight: 700 }}>{message || 'No se pudo cargar la información.'}</Typography>
    {onRetry && (
      <Button onClick={onRetry} sx={{ mt: 2 }} variant="outlined">
        Reintentar
      </Button>
    )}
  </Paper>
);

export const EmptyState = ({ title, description, action, icon: Icon = Inbox }) => (
  <Stack alignItems="center" spacing={1} sx={{ py: 6, px: 2, textAlign: 'center' }}>
    <Icon sx={{ fontSize: 40, color: 'text.disabled' }} />
    <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ pt: 1 }}>{action}</Box>}
  </Stack>
);

/** Tarjeta de indicador para el inicio. */
export const StatTile = ({ label, value, hint, accent, onClick }) => (
  <Paper
    variant="outlined"
    onClick={onClick}
    sx={{
      p: 2.25,
      height: '100%',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .15s',
      '&:hover': onClick ? { borderColor: 'primary.main' } : undefined,
    }}
  >
    <Typography variant="overline" color="text.disabled" sx={{ lineHeight: 1.4 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: accent }}>
      {value}
    </Typography>
    {hint && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {hint}
      </Typography>
    )}
  </Paper>
);
