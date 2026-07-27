interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="RTFM"
      className={className}
      draggable={false}
    />
  );
}
