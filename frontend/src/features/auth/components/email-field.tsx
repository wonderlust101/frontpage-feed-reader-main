import type { ComponentProps } from 'react';
import { TextField } from '@/components/ui/text-field';

type EmailFieldProps = Omit<ComponentProps<typeof TextField>, 'id' | 'label' | 'type'>;

export function EmailField(props: EmailFieldProps) {
    return <TextField aria-required id="email" label="Email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...props} />;
}
