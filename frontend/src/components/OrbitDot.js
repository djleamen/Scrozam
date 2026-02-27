import React from 'react';

export default function OrbitDot({ state = 'ready', size = 'md', className = '' }) {
  const normalizedState = ['idle', 'ready', 'listening', 'success', 'error'].includes(state)
    ? state
    : 'ready';

  return (
    <span
      className={`orbit-dot orbit-dot--${normalizedState} orbit-dot--${size} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="orbit-dot-ring orbit-dot-ring--outer" />
      <span className="orbit-dot-ring orbit-dot-ring--inner" />
      <span className="orbit-dot-core" />
      <span className="orbit-dot-hole" />
    </span>
  );
}
