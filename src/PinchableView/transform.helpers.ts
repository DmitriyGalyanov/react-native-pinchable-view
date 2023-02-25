import { TransformsStyle } from 'react-native';

export const translate = ({
  x: translateX,
  y: translateY,
}: {
  x: number;
  y: number;
}) => {
  'worklet';
  return [{ translateX }, { translateY }];
};

export const transformOrigin = ({
  originVector: { x, y },
  transformations,
}: {
  originVector: { x: number; y: number };
  transformations: NonNullable<TransformsStyle['transform']>;
}): NonNullable<TransformsStyle['transform']> => {
  'worklet';
  return [
    { translateX: x },
    { translateY: y },
    ...transformations,
    { translateX: -x },
    { translateY: -y },
  ];
};
