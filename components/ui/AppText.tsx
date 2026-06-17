import { Text, type TextProps } from 'react-native';

export function AppText({ className = '', ...props }: TextProps) {
  return <Text className={`text-ink font-sans ${className}`} {...props} />;
}
