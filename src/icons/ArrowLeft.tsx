import * as React from 'react';

export default function ArrowLeft(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M7 16l-4-4m0 0l4-4m-4 4h18" />
    </svg>
  );
}
