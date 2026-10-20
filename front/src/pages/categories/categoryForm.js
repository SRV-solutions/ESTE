export const EMPTY_CATEGORY = {
  code: '',
  name: '',
  description: '',
  type: '',
  unity: '',
  value: '',
  weight: '',
  isStorable: false,
  isContainer: false,
};

export const isCategoryComplete = (c) =>
  ['code', 'name', 'type', 'unity'].every((k) => String(c[k] ?? '').trim()) && c.value !== '' && c.weight !== '';
