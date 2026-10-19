import { Box, Link, Typography } from '@mui/material';
import { APP_NAME, SRV_URL } from '../config';
import { BRAND } from '../theme';

/** Isotipo de Event Box: una caja en los azules de SRV con el punto naranja de la marca. */
export const EventBoxMark = ({ size = 32 }) => (
  <Box
    component="svg"
    viewBox="0 0 512 512"
    width={size}
    height={size}
    aria-hidden="true"
    sx={{ flexShrink: 0, display: 'block' }}
  >
    <rect width="512" height="512" rx="112" fill={BRAND.black} />
    <path d="M256 112 392 180 256 248 120 180Z" fill="#5AA6FF" />
    <path d="M120 180 256 248V400L120 332Z" fill={BRAND.blue} />
    <path d="M392 180 256 248V400L392 332Z" fill="#0859C2" />
    <path d="M188 146 324 214" stroke={BRAND.black} strokeWidth="14" strokeLinecap="round" opacity=".35" />
    <circle cx="396" cy="396" r="30" fill={BRAND.orange} />
  </Box>
);

/** Logo de la empresa cliente, o sus iniciales si todavía no subió uno. */
export const CompanyLogo = ({ company, size = 36 }) =>
  company?.logoUrl ? (
    <Box
      component="img"
      src={company.logoUrl}
      alt={company.name}
      sx={{ width: size, height: size, objectFit: 'contain', borderRadius: 1.5, bgcolor: '#fff', flexShrink: 0, p: 0.25 }}
    />
  ) : (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: BRAND.black,
        color: '#fff',
        fontWeight: 900,
        fontSize: size * 0.38,
        letterSpacing: '-0.02em',
        border: 1,
        borderColor: 'divider',
      }}
    >
      {(company?.name || '?')
        .replace(/[^\p{L}\p{N} ]/gu, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()}
    </Box>
  );

export const EventBoxLogo = ({ size = 32, fontSize = 20, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
    <EventBoxMark size={size} />
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
