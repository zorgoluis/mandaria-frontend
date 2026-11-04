// Synthetic inputs only. Boundary and exact-text checks shared across public forms.
export const newPasswordCases = [
  { name: '7 rejected', value: 'a'.repeat(7), valid: false },
  { name: '8 letters', value: 'a'.repeat(8), valid: true },
  { name: '15 letters', value: 'a'.repeat(15), valid: true },
  { name: '16 letters', value: 'a'.repeat(16), valid: true },
  { name: '128 letters', value: 'a'.repeat(128), valid: true },
  { name: '129 rejected', value: 'a'.repeat(129), valid: false },
  { name: 'zeros', value: '00000000', valid: true },
  { name: 'symbols', value: '!!!!!!!!', valid: true },
  { name: 'spaces preserved', value: ' 000000 ', valid: true },
  { name: 'Unicode 7 rejected', value: '😀'.repeat(7), valid: false },
  { name: 'Unicode 128', value: '😀'.repeat(128), valid: true },
  { name: 'Unicode 129 rejected', value: '😀'.repeat(129), valid: false },
]
