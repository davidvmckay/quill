import { useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';

const TOUCH_EVENT = { react: 'onTouchStart', native: 'touchstart' } as const;
const MOUSE_EVENT = { react: 'onMouseDown', native: 'mousedown' } as const;

const setUpReactEventHandlers = (handler: () => void, props: HTMLAttributes<HTMLDivElement>): HTMLAttributes<HTMLDivElement> => ({
  ...props,
  [TOUCH_EVENT.react]: (e) => {
    handler();
    props[TOUCH_EVENT.react]?.(e);
  },
  [MOUSE_EVENT.react]: (e) => {
    handler();
    props[MOUSE_EVENT.react]?.(e);
  },
});

const ClickOutsideHandler = ({ onClickOutside, ...props }: HTMLAttributes<HTMLDivElement> & {
  onClickOutside?: (event: MouseEvent | TouchEvent) => void;
}) => {
  const isTargetInsideReactTreeRef = useRef(false);

  const onClickOutsideRef = useRef(onClickOutside);
  useEffect(() => {
    onClickOutsideRef.current = onClickOutside;
  }, [onClickOutside]);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!isTargetInsideReactTreeRef.current) {
        onClickOutsideRef.current?.(e);
      }

      isTargetInsideReactTreeRef.current = false;
    };

    document.addEventListener(TOUCH_EVENT.native, handler, { passive: true });
    document.addEventListener(MOUSE_EVENT.native, handler, { passive: true });
    return () => {
      document.removeEventListener(TOUCH_EVENT.native, handler);
      document.removeEventListener(MOUSE_EVENT.native, handler);
    };
  }, []);

  const handleReactEvent = () => {
    isTargetInsideReactTreeRef.current = true;
  };

  return <div {...setUpReactEventHandlers(handleReactEvent, props)} />;
};

export default ClickOutsideHandler;
