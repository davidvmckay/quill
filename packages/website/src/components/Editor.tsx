import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import type Quill from 'quill';
import type { QuillOptions } from 'quill';
import { withoutSSR } from './NoSSR';

interface EditorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onLoad'> {
  rootStyle?: CSSProperties;
  config?: QuillOptions;
  onSelectionChange?: () => void;
  onLoad?: (quill: Quill) => void;
}

const Editor = ({
  children,
  rootStyle,
  config,
  onSelectionChange,
  onLoad,
  ...props
}: EditorProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const rootStyleRef = useRef(rootStyle);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onLoadRef = useRef(onLoad);

  useLayoutEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useLayoutEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  const configRef = useRef(config);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const quill = new window.Quill(ref.current, configRef.current);
    if (rootStyleRef.current) {
      Object.assign(quill.root.style, rootStyleRef.current);
    }
    quill.on(window.Quill.events.SELECTION_CHANGE, () => {
      onSelectionChangeRef.current?.();
    });

    onLoadRef.current?.(quill);
  }, []);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
};

export default withoutSSR(Editor);
