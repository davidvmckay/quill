import { useEffect, useLayoutEffect, useState } from 'react';
import type { ComponentType, PropsWithChildren, ReactNode } from 'react';

const useEnhancedEffect =
  typeof window !== 'undefined' && process.env.NODE_ENV !== 'test'
    ? useLayoutEffect
    : useEffect;

const NoSSR = ({ children, defer = false, fallback = null }: PropsWithChildren<{
  defer?: boolean; fallback?: ReactNode;
}>) => {
  const [isMounted, setMountedState] = useState(false);

  useEnhancedEffect(() => {
    if (!defer) setMountedState(true);
  }, [defer]);

  useEffect(() => {
    if (defer) setMountedState(true);
  }, [defer]);

  return isMounted ? children : fallback;
};

export const withoutSSR = <Props extends object,>(Component: ComponentType<Props>) => {
  const Comp = (props: Props) => (
    <NoSSR>
      <Component {...props} />
    </NoSSR>
  );
  Comp.displayName = 'withoutSSR';

  return Comp;
};

export default NoSSR;
