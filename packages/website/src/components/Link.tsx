import NextLink from 'next/link';
import { Link as RadixLink } from '@radix-ui/themes';
import type { AnchorHTMLAttributes } from 'react';

const Link = ({ children, href = '', color: _color, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <RadixLink {...props} asChild>
      <NextLink href={href}>{children}</NextLink>
    </RadixLink>
  );
};

export default Link;
