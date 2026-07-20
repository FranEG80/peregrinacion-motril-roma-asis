import { useEffect, useState } from 'preact/hooks';

export function useColumnCount(base: number, breakpoints: Array<{ minWidth: number; count: number }>): number {
  const [count, setCount] = useState(base);

  useEffect(() => {
    const queries = breakpoints.map(({ minWidth, count: c }) => ({
      mql: matchMedia(`(min-width: ${minWidth}px)`),
      count: c,
    }));

    const update = () => {
      const match = [...queries].reverse().find(({ mql }) => mql.matches);
      setCount(match ? match.count : base);
    };

    update();
    queries.forEach(({ mql }) => mql.addEventListener('change', update));
    return () => queries.forEach(({ mql }) => mql.removeEventListener('change', update));
  }, [base, breakpoints]);

  return count;
}
