import { serialize } from 'next-mdx-remote/serialize';
import docs from '../../data/docs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import PostLayout from '../../components/PostLayout';
import MDX from '../../components/MDX';
import flattenData from '../../utils/flattenData';
import type { GetStaticPaths, GetStaticProps } from 'next';
import type { DocumentData, DocumentSource } from '../../types';
import replaceCDN from '../../utils/replaceCDN';

interface DocProps {
  mdxSource: DocumentSource;
  filePath: string;
  permalink: string;
  data: DocumentData;
}

export const getStaticPaths: GetStaticPaths<{ id: string[] }> = async () => {
  return {
    paths: flattenData(docs).map((d) => d.url),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<DocProps, { id: string[] }> = async ({ params }) => {
  if (!params?.id.length) return { notFound: true };
  const basePath = join('content', 'docs', `${params.id.join('/')}`);
  const filePath = `${basePath}.mdx`;
  const markdown = await readFile(join(process.cwd(), filePath), 'utf8');
  const data: DocumentData = params.id.join('/') === 'guides/cloning-medium-with-parchment'
    ? { ...await import('../../../content/docs/guides/cloning-medium-with-parchment') }
    : {};
  const mdxSource = await serialize(
    replaceCDN(markdown),
    { parseFrontmatter: true },
  );
  const title = mdxSource.frontmatter.title;
  if (typeof title !== 'string') throw new Error(`Missing document title: ${filePath}`);
  return {
    props: {
      mdxSource: { ...mdxSource, frontmatter: { ...mdxSource.frontmatter, title } },
      filePath,
      permalink: `/docs/${params.id.join('/')}`,
      data,
    },
  };
}

export default function Doc({ mdxSource, filePath, permalink, data }: DocProps) {
  return (
    <PostLayout
      pageType="docs"
      filePath={filePath}
      permalink={permalink}
      {...mdxSource.frontmatter}
    >
      <MDX mdxSource={mdxSource} data={data} />
    </PostLayout>
  );
}
