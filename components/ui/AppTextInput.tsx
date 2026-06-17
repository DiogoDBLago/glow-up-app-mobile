import { TextInput, type TextInputProps } from 'react-native';

export function AppTextInput({ className = '', ...props }: TextInputProps) {
  return (
    <TextInput
      className={`rounded-2xl bg-ink/5 px-4 py-3.5 text-ink ${className}`}
      placeholderTextColor="#8B7280"
      {...props}
    />
  );
}
