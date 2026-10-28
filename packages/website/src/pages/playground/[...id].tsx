import playground from '../../data/playground';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  SandpackCodeEditor,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import NoSSR, { withoutSSR } from '../../components/NoSSR';
import { useState } from 'react';
import replaceCDN from '../../utils/replaceCDN';
import styles from './[...id].module.scss';
import PlaygroundLayout from '../../components/PlaygroundLayout';
import Layout from '../../components/Layout';
import OpenSource from '../../components/OpenSource';
import classNames from 'classnames';
import type { GetStaticPaths, GetStaticProps } from 'next';
import type { SourceFiles } from '../../types';
import { readMetadata, readOverrides } from '../../utils/playground';

interface PlaygroundProps { pack: SourceFiles; permalink: string; title: string; }

export const getStaticPaths: GetStaticPaths<{ id: string[] }> = async () => {
  return {
    paths: playground.map((d) => d.url),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<PlaygroundProps, { id: string[] }> = async ({ params }) => {
  if (!params?.id.length) return { notFound: true };
  const basePath = join('src', 'playground', params.id.join('/'));
  const files = await readdir(basePath);
  const pack: SourceFiles = {};
  await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(basePath, file), 'utf-8');
      pack[file] = content;
    }),
  );

  const permalink = `/playground/${params.id.join('/')}`;
  const item = playground.find((d) => d.url === permalink);
  if (!item) return { notFound: true };
  return {
    props: {
      pack,
      permalink,
      title: item.title,
    },
  };
}

function Playground({ pack, permalink, title }: PlaygroundProps) {
  const { 'playground.json': raw, ...files } = pack;

  const metadata = readMetadata(raw);
  const [overrides] = useState(() => readOverrides(location.hash));

  return (
    <Layout title={title} pageType="playground">
      <div className={classNames('container', styles.container)}>
        <h1>Playground</h1>
        <NoSSR>
          <SandpackProvider
            key={permalink}
            options={{
              activeFile:
                metadata.activeFile ||
                (files['index.ts'] ? 'index.ts' : Object.keys(files)[0]),
              externalResources:
                metadata.externalResources &&
                metadata.externalResources.map(replaceCDN),
            }}
            template={metadata.template}
            files={Object.keys(files).reduce((f, name) => {
              const fullName = name.startsWith('/') ? name : `/${name}`;
              return {
                ...f,
                [name]: replaceCDN(overrides[fullName] ?? files[name]).trim(),
              };
            }, {})}
          >
            <PlaygroundLayout permalink={permalink} title={title} files={files}>
              <div className={styles.wrapper}>
                <div className={styles.editor}>
                  <SandpackCodeEditor
                    showTabs
                    wrapContent
                    showRunButton={false}
                  />
                </div>
                <div className={styles.preview}>
                  <SandpackPreview showOpenInCodeSandbox={false} />
                </div>
              </div>
            </PlaygroundLayout>
          </SandpackProvider>
        </NoSSR>
        <OpenSource />
      </div>
    </Layout>
  );
}

export default withoutSSR(Playground);
