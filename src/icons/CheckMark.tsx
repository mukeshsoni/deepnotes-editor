import * as React from 'react';

export default function CheckMark(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
