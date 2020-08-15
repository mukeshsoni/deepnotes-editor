import * as React from 'react';

export default function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}
