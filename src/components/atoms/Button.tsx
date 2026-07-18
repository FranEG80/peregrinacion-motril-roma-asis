import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';
import { buttonClasses } from '../ui/classes';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'className'> {
  children: ComponentChildren;
  href?: string;
  variant?: keyof typeof buttonClasses;
  className?: string;
}

export default function Button({ children, href, variant = 'primary', className = '', ...props }: Props) {
  const classes = `${buttonClasses[variant]} ${className}`.trim();
  if (href) return <a class={classes} href={href}>{children}</a>;
  return <button class={classes} {...props}>{children}</button>;
}
