import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';
import { iconButtonClass } from '../ui/classes';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'className'> {
  label: string;
  children: ComponentChildren;
  className?: string;
}

export default function IconButton({ label, children, className = '', ...props }: Props) {
  return <button class={`${iconButtonClass} ${className}`.trim()} aria-label={label} {...props}>{children}</button>;
}
