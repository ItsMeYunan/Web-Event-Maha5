import React, { useState } from 'react';

interface AvatarDisplayProps {
  avatarUrl?: string;
  name?: string;
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

  // Generate 2-character uppercase initials
  const initials = React.useMemo(() => {
    if (!name) return '??';
    const parts = name.trim().split(/[\s_-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [name]);

  if (avatarUrl && !imgError) {
    return (
      <div
        className={`relative shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="block size-full rounded-full border-2 border-white/65 object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`grid shrink-0 select-none place-items-center rounded-full border-2 border-white/40 bg-black/25 font-black text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
};
