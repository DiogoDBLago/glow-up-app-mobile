import { View, type ViewProps } from 'react-native';

export function AppView({ className = '', ...props }: ViewProps) {
  return <View className={className} {...props} />;
}
