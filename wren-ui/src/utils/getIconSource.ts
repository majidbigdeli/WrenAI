type IconNames =
  | 'agent-filled'
  | 'category-outlined'
  | 'category-outlined'
  | 'magic-pencil-outlined'
  | 'typeprompt-outlined';

export const getIconSource = (name: IconNames) => {
  return `/images/ai-icon/${name}.svg`;
};
