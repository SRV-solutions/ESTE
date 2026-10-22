import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  ButtonBase,
  Dialog,
  IconButton,
  InputBase,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchRounded from '@mui/icons-material/SearchRounded';
import Close from '@mui/icons-material/Close';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import ArchitectureOutlined from '@mui/icons-material/ArchitectureOutlined';
import KeyboardReturn from '@mui/icons-material/KeyboardReturn';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { buildActionIndex, suggestedActions } from './searchActions';

/** Grupos de resultados de la empresa, en el orden en que se muestran. */
const GROUPS = [
  { kind: 'item', label: 'Ítems', icon: Inventory2Outlined },
  { kind: 'category', label: 'Stock por categoría', icon: CategoryOutlined },
  { kind: 'order', label: 'Órdenes', icon: AssignmentOutlined },
  { kind: 'event', label: 'Eventos', icon: EventOutlined },
  { kind: 'location', label: 'Lugares', icon: PlaceOutlined },
  { kind: 'person', label: 'Personas', icon: PersonOutline },
  { kind: 'blueprint', label: 'Planos', icon: ArchitectureOutlined },
];
const PER_GROUP = 5;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

/** Botón de la barra superior: en la compu, una caja "Buscar…"; en el celular, la lupa. */
const Trigger = ({ onOpen, compact }) =>
  compact ? (
    <Tooltip title="Buscar">
      <IconButton onClick={onOpen} aria-label="Buscar">
        <SearchRounded />
      </IconButton>
    </Tooltip>
  ) : (
    <ButtonBase
      onClick={onOpen}
      aria-label="Buscar en Event Box"
      sx={{
        width: { md: 260, lg: 320 },
        justifyContent: 'flex-start',
        gap: 1,
        px: 1.5,
        py: 0.85,
        borderRadius: 2.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
        color: 'text.secondary',
        transition: 'border-color .15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <SearchRounded fontSize="small" />
      <Typography variant="body2" sx={{ flex: 1, textAlign: 'left' }}>
        Buscar en Event Box…
      </Typography>
      <Box component="kbd" sx={{ fontSize: 11, fontFamily: 'inherit', fontWeight: 700, px: 0.75, py: 0.1, borderRadius: 1, border: 1, borderColor: 'divider' }}>
        {isMac ? '⌘' : 'Ctrl'} K
      </Box>
    </ButtonBase>
  );

/**
 * Buscador general, arriba a la derecha. Encuentra pantallas y acciones ("crear ítem", "cambiar
 * contraseña") y datos de la empresa (ítems, categorías, órdenes, eventos, lugares, personas, planos),
 * aunque se escriba con errores ("vaul", "boul") o con otras palabras ("cajón" → baúl).
 */
const GlobalSearch = ({ onCommand }) => {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState({ query: '', results: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const actionIndex = useMemo(() => buildActionIndex(auth), [auth]);

  // Ctrl/⌘ + K (o "/" fuera de un campo de texto) abre el buscador desde cualquier pantalla.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(e.target?.tagName) || e.target?.isContentEditable;
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Datos de la empresa: se piden al servidor con una pequeña espera entre teclas.
  const q = query.trim();
  useEffect(() => {
    if (!open || q.length < 2 || !auth.company) {
      setLoading(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get('/search', { params: { q }, signal: ctrl.signal })
        .then((r) => setRemote({ query: q, results: r.data.results }))
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, open, auth.company]);

  // Lista final (acciones primero, después los datos agrupados), en el orden en que se navega con el teclado.
  const sections = useMemo(() => {
    if (q.length < 1) return [{ label: 'Sugerencias', items: suggestedActions(actionIndex) }];
    const out = [];
    const actions = actionIndex.search(q, { limit: 6 }).map((r) => r.doc);
    if (actions.length) out.push({ label: 'Ir a / hacer', items: actions });
    const results = remote.query === q ? remote.results : [];
    for (const g of GROUPS) {
      const items = results.filter((r) => r.kind === g.kind).slice(0, PER_GROUP);
      if (items.length) out.push({ label: g.label, items: items.map((r) => ({ ...r, icon: g.icon, key: `${r.kind}${r.id}` })) });
    }
    return out;
  }, [q, actionIndex, remote]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (item) => {
    if (!item) return;
    close();
    if (item.command) return onCommand?.(item.command);
    const [path, hash] = item.path.split('#');
    navigate(path);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 700);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(flat[active]);
    }
  };

  let index = -1;
  const waiting = loading || (q.length >= 2 && remote.query !== q && !!auth.company);

  return (
    <>
      <Trigger onOpen={() => setOpen(true)} compact={compact} />
      <Dialog
        open={open}
        onClose={close}
        fullScreen={phone}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { alignSelf: { sm: 'flex-start' }, mt: { sm: '10vh' }, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: { sm: '75vh' } } }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          <SearchRounded color="primary" />
          <InputBase
            autoFocus
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="¿Qué buscás? Por ejemplo: baúl, nueva orden, contraseña"
            inputProps={{ 'aria-label': 'Buscar en Event Box', maxLength: 80 }}
            sx={{ fontSize: 17 }}
          />
          {phone ? (
            <IconButton onClick={close} aria-label="Cerrar">
              <Close />
            </IconButton>
          ) : (
            <Box component="kbd" onClick={close} sx={{ cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, px: 0.75, borderRadius: 1, border: 1, borderColor: 'divider', color: 'text.secondary' }}>
              Esc
            </Box>
          )}
        </Stack>
        <LinearProgress sx={{ height: 2, visibility: waiting ? 'visible' : 'hidden' }} />

        <Box ref={listRef} sx={{ overflowY: 'auto', flex: 1, pb: 1 }}>
          {sections.map((section) => (
            <List key={section.label} dense disablePadding subheader={<ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '34px', fontWeight: 800 }}>{section.label}</ListSubheader>}>
              {section.items.map((item) => {
                index += 1;
                const i = index;
                const Icon = item.icon;
                return (
                  <ListItemButton
                    key={item.key}
                    data-index={i}
                    selected={i === active}
                    onMouseMove={() => active !== i && setActive(i)}
                    onClick={() => choose(item)}
                    sx={{ mx: 1, borderRadius: 2, py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 38 }}>{Icon && <Icon fontSize="small" color={i === active ? 'primary' : 'inherit'} />}</ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.subtitle}
                      primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                    {i === active && !phone && <KeyboardReturn fontSize="small" sx={{ color: 'text.disabled', ml: 1 }} />}
                  </ListItemButton>
                );
              })}
            </List>
          ))}
          {q.length >= 1 && !flat.length && !waiting && (
            <Stack alignItems="center" spacing={0.5} sx={{ py: 5, px: 3, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 800 }}>No encontramos nada con “{q}”</Typography>
              <Typography variant="body2" color="text.secondary">
                Probá con otra palabra: por ejemplo “cable”, “orden 25” o el nombre del evento.
              </Typography>
            </Stack>
          )}
          {q.length < 1 && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ px: 3, pt: 1.5 }}>
              Escribí como te salga: entiende errores (“vaul”, “boul”) y otras formas de decirlo (“cajón”, “crear ítem”). Buscá también códigos, órdenes por número, eventos,
              lugares y personas.
            </Typography>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
