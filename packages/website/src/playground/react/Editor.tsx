import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import type QuillEditor from 'quill';
import type { Delta, EmitterSource, Range } from 'quill';

declare const Quill: typeof QuillEditor;

interface EditorProps {
  readOnly?: boolean;
  defaultValue?: Delta;
  onTextChange?: (delta: Delta, oldDelta: Delta, source: EmitterSource) => void;
  onSelectionChange?: (range: Range | null, oldRange: Range | null, source: EmitterSource) => void;
}

// Editor is an uncontrolled React component
const Editor = forwardRef<QuillEditor, EditorProps>(
  ({ readOnly, defaultValue, onTextChange, onSelectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<QuillEditor | null>(null);
    const defaultValueRef = useRef(defaultValue);
    const onTextChangeRef = useRef(onTextChange);
    const onSelectionChangeRef = useRef(onSelectionChange);

    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange;
      onSelectionChangeRef.current = onSelectionChange;
    });

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const editorContainer = container.appendChild(
        container.ownerDocument.createElement('div'),
      );
      const quill = new Quill(editorContainer, {
        theme: 'snow',
      });

      quillRef.current = quill;
      if (typeof ref === 'function') ref(quill);
      else if (ref) ref.current = quill;

      if (defaultValueRef.current) {
        quill.setContents(defaultValueRef.current);
      }

      quill.on(Quill.events.TEXT_CHANGE, (...args) => {
        onTextChangeRef.current?.(...args);
      });

      quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
        onSelectionChangeRef.current?.(...args);
      });

      return () => {
        quillRef.current = null;
        if (typeof ref === 'function') ref(null);
        else if (ref) ref.current = null;
        container.innerHTML = '';
      };
    }, [ref]);

    useEffect(() => {
      quillRef.current?.enable(!readOnly);
    }, [readOnly]);

    return <div ref={containerRef}></div>;
  },
);

Editor.displayName = 'Editor';

export default Editor;
