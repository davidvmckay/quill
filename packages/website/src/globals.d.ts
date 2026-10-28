declare module '*.module.scss' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';
  const SVG: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module '*.scss';
declare module '*.css';

declare const Quill: typeof import('quill').default;

interface Window {
  Quill: typeof Quill;
  quill?: import('quill').default;
  WebFontConfig?: { google: { families: string[] } };
}

type SiteEnvironment = import('../env').SiteEnvironment;
declare namespace NodeJS {
  interface ProcessEnv extends SiteEnvironment {}
}
