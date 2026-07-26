export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id="pulseGradient" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#pulseGradient)" />
      <path
        d="M8 22h5l3-9 5 18 3-9h8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
