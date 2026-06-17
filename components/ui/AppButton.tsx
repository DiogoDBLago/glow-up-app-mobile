import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { Shadows } from '@/constants/theme';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'dark';

export interface AppButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: AppButtonVariant;
  isLoading?: boolean;
  className?: string;
}

const baseClasses = 'rounded-full py-3.5 px-6 items-center justify-center flex-row gap-2';

const variantClasses: Record<AppButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-primary/10',
  outline: 'border border-border bg-white',
  dark: 'bg-ink',
};

const textVariantClasses: Record<AppButtonVariant, string> = {
  primary: 'text-white font-semibold',
  secondary: 'text-primary font-semibold',
  outline: 'text-ink font-semibold',
  dark: 'text-white font-semibold',
};

export function AppButton({
  label,
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  style,
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={(state) => [
        variant === 'primary' ? Shadows.glow : null,
        { opacity: isLoading || disabled ? 0.45 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'dark' ? '#FFFFFF' : '#EC4899'}
        />
      ) : (
        <AppText className={textVariantClasses[variant]}>{label}</AppText>
      )}
    </Pressable>
  );
}
