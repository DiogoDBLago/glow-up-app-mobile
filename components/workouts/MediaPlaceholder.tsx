import { View, type ViewProps } from 'react-native';
import { Film } from 'lucide-react-native';
import { AppText } from '@/components/ui';

/**
 * Placeholder limpo exibido quando um exercício ainda não tem mídia própria.
 */
export function MediaPlaceholder({ label = 'Vídeo em breve', style, ...props }: ViewProps & { label?: string }) {
  return (
    <View
      className="items-center justify-center gap-1 bg-ink/5"
      style={style}
      accessibilityLabel={label}
      {...props}
    >
      <Film size={20} color="#8B7280" style={{ opacity: 0.6 }} />
      <AppText className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft" style={{ opacity: 0.7 }}>
        {label}
      </AppText>
    </View>
  );
}
