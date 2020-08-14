import * as React from 'react';

interface Props {
  children: Array<React.ReactElement>;
}

export default function Link(props: Props) {
  const link = React.Children.map(props.children, (child: React.ReactElement) =>
    child && child.props ? child.props.text : ''
  ).join('');

  return (
    <a
      href={link}
      onClick={() => window.open(link, '_blank')}
      className="text-copy-tertiary underline break-words whitespace-normal cursor-pointer visited:text-copy-tertiary hover:text-pink-800"
    >
      {props.children}
    </a>
  );
}
