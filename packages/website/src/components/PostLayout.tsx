import type { LayoutProps, NavigationItem } from '../types';
import classNames from 'classnames';
import { usePathname } from 'next/navigation';
import docsItems from '../data/docs';
import Link from 'next/link';
import slug from '../utils/slug';
import Layout from '../components/Layout';
import OpenSource from '../components/OpenSource';
import React, { useState } from 'react';
import styles from './PostLayout.module.scss';
import flattenData from '../utils/flattenData';

const getPagination = (permalink: string, items: readonly NavigationItem[]) => {
  const flattenedItems = flattenData(items);
  const index = flattenedItems.findIndex((item) => item.url === permalink);
  if (index === -1) return { prev: null, next: null };

  let prev = null;
  let next = null;

  if (index > 0) prev = flattenedItems[index - 1];
  if (index < flattenedItems.length - 1) next = flattenedItems[index + 1];

  return { prev, next };
};

const SidebarItem = ({ item }: { item: NavigationItem }) => {
  const pathname = usePathname();

  return (
    <li className={classNames({ active: pathname?.includes(item.url) })}>
      <Link href={item.url}>{item.title}</Link>
      {item.children && (
        <ul>
          {item.children.map((child) => (
            <SidebarItem key={child.url} item={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

const PostLayout = ({ title, pageType, filePath, permalink, children }: LayoutProps & { title: string; filePath: string; permalink: string }) => {
  const { prev, next } = getPagination(permalink, docsItems);
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <Layout title={title}>
      <div id="docs-wrapper" className="container">
        <div className="row">
          <div
            id="sidebar-container"
            className={classNames('three', 'columns', {
              active: isNavOpen,
            })}
          >
            <button
              className="sidebar-button"
              onClick={() => {
                setIsNavOpen(!isNavOpen);
              }}
            >
              Document Navigation
            </button>
            <ul className="sidebar-list">
              {docsItems.map((item) => (
                <SidebarItem key={item.url} item={item} />
              ))}
            </ul>
          </div>
          <div id="docs-container" className="nine columns">
            <div className={classNames('row', styles.breadcrumbRow)}>
              <div className={styles.breadcrumb}>
                <span>Documentation</span>
                <span>{title}</span>
              </div>
              <div className={styles.editOnGitHub}>
                <a
                  href={process.env.github + filePath}
                  target="_blank"
                  title="Edit on GitHub"
                >
                  Edit page on GitHub ↗
                </a>
              </div>
            </div>
            <article id="content-container" className={styles.content}>
              <h1 id={slug(title)}>{title}</h1>
              {children}
            </article>
          </div>
        </div>

        <div className="row">
          <hr />
        </div>

        <OpenSource />
      </div>
    </Layout>
  );
};

export default PostLayout;
