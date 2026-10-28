import type { AppProps } from 'next/app';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './variables.scss';
import './base.css';
import './styles.scss';

// This default export is required in a new `pages/_app.tsx` file.
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Theme accentColor="yellow">
      <GoogleAnalytics gaId="G-B37E2WMSPW" />
      <Component {...pageProps} />
    </Theme>
  );
}
