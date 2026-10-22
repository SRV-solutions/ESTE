import { Box, keyframes } from '@mui/material';
import { BRAND } from '../theme';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

/** Ilustración: la caja de Event Box abierta y vacía, con un signo que flota arriba. */
const LostBox = ({ size = 220, mark = '?' }) => (
  <Box component="svg" viewBox="0 0 240 210" width={size} height={size * 0.875} aria-hidden="true" sx={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="120" cy="192" rx="72" ry="10" fill="currentColor" opacity=".08" />
    {/* solapas de atrás, abiertas */}
    <path d="M60 80 120 50 98 22 38 52Z" fill="#5AA6FF" opacity=".9" />
    <path d="M120 50 180 80 202 52 142 22Z" fill="#3D8EF0" />
    {/* adentro: vacía */}
    <path d="M60 80 120 50 180 80 120 110Z" fill="#06213F" />
    {/* caras */}
    <path d="M60 80 120 110V180L60 150Z" fill={BRAND.blue} />
    <path d="M180 80 120 110V180L180 150Z" fill="#0859C2" />
    {/* solapas de adelante, caídas */}
    <path d="M60 80 120 110 104 126 44 96Z" fill="#7DB8FF" />
    <path d="M180 80 120 110 136 126 196 96Z" fill="#4A97F5" />
    <circle cx="168" cy="160" r="9" fill={BRAND.orange} />
    <Box component="g" sx={{ animation: `${float} 3s ease-in-out infinite` }}>
      <text x="120" y="36" textAnchor="middle" fontSize="44" fontWeight="900" fill={BRAND.orange} fontFamily="inherit">
        {mark}
      </text>
    </Box>
  </Box>
);

export default LostBox;
