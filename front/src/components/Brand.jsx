import { Box, Link, Typography } from '@mui/material';
import { APP_NAME, SRV_URL } from '../config';
import { BRAND } from '../theme';

/** Isotipo de Sortex: barras ordenadas (azul SRV) y el punto naranja de la marca. */
export const SortexMark = ({ size = 32 }) => (
  <Box
    component="svg"
    viewBox="0 0 512 512"
    width={size}
    height={size}
    aria-hidden="true"
    sx={{ flexShrink: 0, display: 'block' }}
  >
    <rect width="512" height="512" rx="112" fill={BRAND.black} />
    <rect x="106" y="138" width="300" height="52" rx="26" fill={BRAND.blue} />
    <rect x="106" y="230" width="220" height="52" rx="26" fill={BRAND.blue} />
    <rect x="106" y="322" width="136" height="52" rx="26" fill={BRAND.blue} />
    <circle cx="300" cy="348" r="28" fill={BRAND.orange} />
  </Box>
);

export const SortexLogo = ({ size = 32, fontSize = 20, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
    <SortexMark size={size} />
    <Typography component="span" sx={{ fontWeight: 900, fontSize, letterSpacing: '-0.03em', color }}>
      {APP_NAME}
    </Typography>
  </Box>
);

/** Firma "por SRV" con el logo de wearesrv.com. */
export const BySrv = ({ sx }) => (
  <Link
    href={SRV_URL}
    target="_blank"
    rel="noopener"
    underline="none"
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.disabled', fontSize: 12, fontWeight: 600, ...sx }}
  >
    por
    <Box component="img" src="/srv-logo.webp" alt="" width={18} height={18} sx={{ borderRadius: '50%' }} />
    <Box component="span" sx={{ fontWeight: 900, letterSpacing: '0.02em' }}>
      SRV
    </Box>
  </Link>
);
