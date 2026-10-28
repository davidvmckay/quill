import metadata from './package.json';

const { version, homepage } = metadata;

export interface SiteEnvironment {
  version: string;
  cdn: string;
  github: string;
  highlightjs: string;
  katex: string;
  url: string;
  title: string;
  shortTitle: string;
  description: string;
  shortDescription: string;
}

const cdn = process.env.NEXT_PUBLIC_LOCAL_QUILL
  ? `http://127.0.0.1:${process.env.QUILL_PORT || 9080}`
  : `https://cdn.jsdelivr.net/npm/quill@${version}/dist`;

const env: SiteEnvironment = {
  version,
  cdn,
  github: 'https://github.com/slab/quill/tree/main/packages/website/',
  highlightjs: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0',
  katex: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist',
  url: homepage,
  title: 'Quill - Your powerful rich text editor',
  shortTitle: 'Quill Rich Text Editor',
  description:
    'Quill is a free, open source WYSIWYG editor built for the modern web. Completely customize it for any need with its modular architecture and expressive API.',
  shortDescription:
    'Quill is a free, open source rich text editor built for the modern web.',
};

export default env;
