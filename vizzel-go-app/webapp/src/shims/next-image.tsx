type Props = React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean };

export default function Image({ fill, alt, ...props }: Props) {
  if (fill) {
    return <img alt={alt} {...props} style={{ ...props.style, objectFit: "cover", width: "100%", height: "100%" }} />;
  }
  return <img alt={alt} {...props} />;
}
