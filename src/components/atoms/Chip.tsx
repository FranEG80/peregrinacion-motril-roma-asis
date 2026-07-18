import type { ComponentChildren } from 'preact';
import { chipClass } from '../ui/classes';

export default function Chip({ children, className = '' }: { children: ComponentChildren; className?: string }) {
  return <span class={`${chipClass} ${className}`.trim()}>{children}</span>;
}
