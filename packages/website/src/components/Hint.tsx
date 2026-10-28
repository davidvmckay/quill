import styles from './Hint.module.scss';
import type { PropsWithChildren } from 'react';

const Hint = ({ children }: PropsWithChildren) => {
  return (
    <div className={styles.container}>
      <div className={styles.title}>Note</div>
      {children}
    </div>
  );
};

export default Hint;
