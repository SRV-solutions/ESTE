import { Avatar } from '@mui/material';
import { userName } from '../lib/format';

/** Foto de perfil del usuario, o sus iniciales si no subió una. */
const UserAvatar = ({ user, size = 32, sx }) => (
  <Avatar
    src={user?.avatarUrl || undefined}
    alt={userName(user) || ''}
    sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 800, bgcolor: 'primary.main', ...sx }}
  >
    {(userName(user) || '?').slice(0, 2).toUpperCase()}
  </Avatar>
);

export default UserAvatar;
