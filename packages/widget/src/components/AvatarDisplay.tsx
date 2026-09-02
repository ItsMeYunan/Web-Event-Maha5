import React, { useState } from 'react';
import { getInitials } from '../lib/color';

interface AvatarDisplayProps {
  avatarUrl?: string | undefined;
  name?: string | undefined;
  size?: number;
  className?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatarUrl,
  name = '??',
  size = 48,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const initials = getInitials(name);

  if (avatarUrl && !imgError) {
    return (
      <div 
        className={`avatar-wrapper ${className}`} 
        style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}
      >
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(255, 255, 255, 0.65)',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`avatar-fallback ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        border: '2px solid rgba(255, 255, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: size * 0.38,
        color: '#FFFFFF',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
};
