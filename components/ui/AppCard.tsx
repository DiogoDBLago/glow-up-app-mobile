import { View, type ViewProps } from 'react-native';
import { Shadows } from '@/constants/theme';

export function AppCard({ className = '', style, ...props }: ViewProps) {
  return (
    <View
      className={`rounded-3xl bg-white border border-border p-4 ${className}`}
      style={[Shadows.glow, style]}
      {...props}
    />
  );
}
