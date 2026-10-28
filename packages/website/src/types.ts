import type { ReactNode } from 'react';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

export interface NavigationItem {
  title: string;
  url: string;
  children?: NavigationItem[];
}

export type SourceFiles = Record<string, string>;
export type DocumentData = Record<string, string | string[]>;
export type DocumentSource = MDXRemoteSerializeResult<Record<string, unknown>, { title: string }>;

export interface LayoutProps {
  children?: ReactNode;
  title?: string;
  pageType?: 'docs' | 'playground';
}
