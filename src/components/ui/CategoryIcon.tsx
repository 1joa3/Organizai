import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h5a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function UtensilsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3v7a2 2 0 0 0 2 2v9" />
      <path d="M6 3v5M9 3v5" />
      <path d="M18 3c-1.7 0-3 2-3 5s1.3 5 3 5v8" />
    </svg>
  );
}

function CarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16V11l2-5h12l2 5v5" />
      <path d="M3 16h18v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3Z" />
      <circle cx="7.5" cy="16" r="1.5" />
      <circle cx="16.5" cy="16" r="1.5" />
    </svg>
  );
}

function PulseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12h4l2 7 4-14 2 7h6" />
    </svg>
  );
}

function BookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" />
    </svg>
  );
}

function GamepadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="7" width="20" height="11" rx="4" />
      <path d="M7 10v4M5 12h4" />
      <circle cx="16" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="18" cy="13" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShirtIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4 4 7l2 3 2-1.3V20h8V8.7L18 10l2-3-4-3-2 2h-4L8 4Z" />
    </svg>
  );
}

function SignalIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20v-4M9 20v-8M14 20V8M19 20V4" />
    </svg>
  );
}

function WalletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h14A1.5 1.5 0 0 1 20 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-10Z" />
      <path d="M3 9h13a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H3" />
      <circle cx="16" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LaptopIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="11" rx="1.5" />
      <path d="M2 19h20l-1.5-3h-17L2 19Z" />
    </svg>
  );
}

function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17 10 10l4 4 7-7" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

function BoxIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3.5 8 8.5-5 8.5 5-8.5 5-8.5-5Z" />
      <path d="M3.5 8v8l8.5 5 8.5-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  moradia: HomeIcon,
  alimentacao: UtensilsIcon,
  transporte: CarIcon,
  saude: PulseIcon,
  educacao: BookIcon,
  lazer: GamepadIcon,
  vestuario: ShirtIcon,
  servicos: SignalIcon,
  salario: WalletIcon,
  freelance: LaptopIcon,
  rendimentos: TrendingUpIcon,
  outros: BoxIcon,
};

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface CategoryIconProps extends Omit<IconProps, "width" | "height"> {
  name: string;
  size?: number;
}

/** Line-icon substitute for the emoji stored in Category.icon — consistent
 * stroke weight and per-category color across the whole app instead of
 * platform-dependent emoji glyphs. */
export default function CategoryIcon({ name, size = 16, ...props }: CategoryIconProps) {
  const Icon = ICONS[normalize(name)] ?? BoxIcon;
  return <Icon width={size} height={size} {...props} />;
}
