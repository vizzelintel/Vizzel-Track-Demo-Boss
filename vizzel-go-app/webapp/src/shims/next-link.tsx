import { Link as RouterLink, type LinkProps } from "react-router-dom";

type Props = Omit<LinkProps, "to"> & { href: string; children?: React.ReactNode };

export default function Link({ href, children, ...props }: Props) {
  return (
    <RouterLink to={href} {...props}>
      {children}
    </RouterLink>
  );
}
