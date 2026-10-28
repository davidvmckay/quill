import withMDX from '@next/mdx';
import type { NextConfig } from 'next';
import env from './env';

interface AssetRule {
  test: RegExp;
  issuer?: unknown;
  resourceQuery?: { not?: unknown[] };
  exclude?: RegExp;
}

const config: NextConfig = {
  output: 'export',
  eslint: { ignoreDuringBuilds: true },
  // The build script runs bun check before invoking Next's build.
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
  },
  env: { ...env },
  pageExtensions: ['mdx', 'ts', 'tsx'],
  redirects: async () => [
    {
      source: '/guides/upgrading-to-2-0',
      destination: '/docs/upgrading-to-2-0',
      permanent: true,
    },
    {
      source: '/guides/why-quill',
      destination: '/docs/why-quill',
      permanent: true,
    },
    {
      source: '/guides/how-to-customize-quill',
      destination: '/docs/customization',
      permanent: true,
    },
    {
      source: '/guides/building-a-custom-module',
      destination: '/docs/guides/building-a-custom-module',
      permanent: true,
    },
    {
      source: '/guides/cloning-medium-with-parchment',
      destination: '/docs/guides/cloning-medium-with-parchment',
      permanent: true,
    },
    {
      source: '/guides/designing-the-delta-format',
      destination: '/docs/guides/designing-the-delta-format',
      permanent: true,
    },
    {
      source: '/docs/registries',
      destination: '/docs/customization/registries',
      permanent: true,
    },
    {
      source: '/docs/themes',
      destination: '/docs/customization/themes',
      permanent: true,
    },
  ],
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule: AssetRule | undefined = config.module.rules.find(
      (rule: unknown) => typeof rule === 'object' && rule !== null && 'test' in rule
        && rule.test instanceof RegExp && rule.test.test('.svg'),
    );
    if (!fileLoaderRule) throw new Error('Next.js SVG asset rule was not found');

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not ?? []), /url/] }, // exclude if *.svg?url
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [{ name: 'preset-default' }],
              },
            },
          },
        ],
      },
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default withMDX()(config);
