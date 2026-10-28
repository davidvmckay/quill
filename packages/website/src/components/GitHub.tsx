import classNames from 'classnames';
import { useEffect, useState } from 'react';
import OctocatIcon from '../svg/octocat.svg';
import styles from './GitHub.module.scss';

const placeholderCount = (37622).toLocaleString();

const GitHub = ({ dark = false }) => {
  const [count, setCount] = useState(placeholderCount);

  useEffect(() => {
    fetch(
      'https://api.github.com/search/repositories?q=quill+user:slab+repo:quill&sort=stars&order=desc',
    )
      .then((response): Promise<unknown> => response.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items)) return;
        const repository: unknown = data.items[0];
        if (repository && typeof repository === 'object'
          && 'full_name' in repository && repository.full_name === 'slab/quill'
          && 'stargazers_count' in repository && typeof repository.stargazers_count === 'number') {
          setCount(repository.stargazers_count.toLocaleString());
        }
      })
      .catch(() => { /* Keep the placeholder when the optional request fails. */ });
  }, []);

  return (
    <div className={classNames(styles.button, { [styles.isDark]: dark })}>
      <a
        className={styles.action}
        target="_blank"
        title="Star Quill on GitHub"
        href="https://github.com/slab/quill/"
      >
        <OctocatIcon />
        Star
      </a>
      <a
        className={styles.count}
        target="_blank"
        title="Quill Stargazers"
        href="https://github.com/slab/quill/stargazers"
      >
        {count}
      </a>
    </div>
  );
};

export default GitHub;
