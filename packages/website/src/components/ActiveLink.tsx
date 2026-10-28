import { useRouter } from 'next/router';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import type { ComponentProps } from 'react';

type ActiveLinkProps = ComponentProps<typeof Link> & {
  activeClassName: string;
  activePath?: string;
};

const ActiveLink = ({
  children,
  activeClassName,
  className = '',
  activePath,
  ...props
}: ActiveLinkProps) => {
  const { asPath, isReady } = useRouter();

  const getClassName = useCallback(() => {
    // Using URL().pathname to get rid of query and hash
    const activePathname = asPath.split(/[?#]/, 1)[0];
    const linkPathname = typeof props.href === 'string'
      ? new URL(props.href, 'https://quill.local').pathname
      : props.href.pathname;

    const isActive = activePath
      ? activePathname.startsWith(activePath)
      : linkPathname === activePathname;
    return isActive ? `${className} ${activeClassName}`.trim() : className;
  }, [asPath, activePath, className, activeClassName, props.href]);

  const [computedClassName, setComputedClassName] = useState(getClassName());

  useEffect(() => {
    // Check if the router fields are updated client-side
    if (isReady) {
      const newClassName = getClassName();

      if (newClassName !== computedClassName) {
        setComputedClassName(newClassName);
      }
    }
  }, [isReady, computedClassName, getClassName]);

  return (
    <Link className={computedClassName} {...props}>
      {children}
    </Link>
  );
};

export default ActiveLink;
