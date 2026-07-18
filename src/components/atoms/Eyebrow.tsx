import type { ComponentChildren } from 'preact';
import { eyebrowClass } from '../ui/classes';

export default function Eyebrow({ children, className = '' }: { children: ComponentChildren; className?: string }) {
  return <p class={`${eyebrowClass} ${className}`.trim()}>{children}</p>;
}
