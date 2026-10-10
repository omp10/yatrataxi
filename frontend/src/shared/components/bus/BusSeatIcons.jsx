import React from 'react';

/**
 * Authentic RedBus style Seater (💺) component with headrest, armrests, cushion & label.
 */
export const RedBusSeater = ({
  label = '',
  status = 'available', // 'available' | 'selected' | 'booked' | 'blocked'
  title = '',
  onClick,
  disabled = false,
  className = '',
}) => {
  const isBooked = status === 'booked';
  const isBlocked = status === 'blocked';
  const isSelected = status === 'selected';
  const isUnavailable = isBooked || isBlocked;

  let frameStroke = '#CBD5E1';
  let frameFill = '#FFFFFF';
  let headrestFill = '#E2E8F0';
  let armrestFill = '#CBD5E1';
  let cushionFill = '#F8FAFC';
  let textFill = '#1E293B';

  if (isSelected) {
    frameStroke = '#0F172A';
    frameFill = '#0F172A';
    headrestFill = '#F97316';
    armrestFill = '#334155';
    cushionFill = '#1E293B';
    textFill = '#FFFFFF';
  } else if (isBlocked) {
    frameStroke = '#FECDD3';
    frameFill = '#FFF1F2';
    headrestFill = '#FDA4AF';
    armrestFill = '#FECDD3';
    cushionFill = '#FFE4E6';
    textFill = '#E11D48';
  } else if (isBooked) {
    frameStroke = '#E2E8F0';
    frameFill = '#F1F5F9';
    headrestFill = '#CBD5E1';
    armrestFill = '#E2E8F0';
    cushionFill = '#E2E8F0';
    textFill = '#94A3B8';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isUnavailable}
      title={title || (isUnavailable ? `Unavailable: ${label}` : `Seat ${label}`)}
      className={`group relative flex items-center justify-center p-0.5 transition-transform active:scale-95 focus:outline-none ${
        isUnavailable ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:scale-[1.03]'
      } ${className}`}
      style={{ minHeight: '48px', minWidth: '40px' }}
    >
      <svg
        viewBox="0 0 44 48"
        className="h-12 w-full max-w-[46px] drop-shadow-sm transition-all"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer chair shell */}
        <rect
          x="2"
          y="2"
          width="40"
          height="44"
          rx="9"
          fill={frameFill}
          stroke={frameStroke}
          strokeWidth="1.8"
        />
        {/* Top curved headrest */}
        <path
          d="M8 6C8 4.2 9.5 3 11.5 3H32.5C34.5 3 36 4.2 36 6V10.5C36 11.5 34.5 12 32.5 12H11.5C9.5 12 8 11.5 8 10.5V6Z"
          fill={headrestFill}
        />
        {/* Left armrest */}
        <rect x="3.5" y="14" width="3.5" height="24" rx="1.75" fill={armrestFill} />
        {/* Right armrest */}
        <rect x="37" y="14" width="3.5" height="24" rx="1.75" fill={armrestFill} />
        {/* Center seat cushion */}
        <rect x="9.5" y="15" width="25" height="26" rx="5" fill={cushionFill} />
        {/* Seat Label */}
        <text
          x="22"
          y="31"
          textAnchor="middle"
          fill={textFill}
          fontSize="11"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.02em"
        >
          {label}
        </text>
      </svg>
    </button>
  );
};

/**
 * Authentic RedBus style Sleeper Coach Berth (🛏️) with plush pillow, bed sheet & label.
 */
export const RedBusSleeper = ({
  label = '',
  status = 'available', // 'available' | 'selected' | 'booked' | 'blocked'
  title = '',
  onClick,
  disabled = false,
  className = '',
}) => {
  const isBooked = status === 'booked';
  const isBlocked = status === 'blocked';
  const isSelected = status === 'selected';
  const isUnavailable = isBooked || isBlocked;

  let frameStroke = '#BAE6FD';
  let frameFill = '#F0F9FF';
  let pillowStroke = '#7DD3FC';
  let pillowFill = '#E0F2FE';
  let pillowCrease = '#38BDF8';
  let dividerStroke = '#BAE6FD';
  let mattressFill = '#FFFFFF';
  let textFill = '#0369A1';

  if (isSelected) {
    frameStroke = '#0F172A';
    frameFill = '#0F172A';
    pillowStroke = '#F97316';
    pillowFill = '#EA580C';
    pillowCrease = '#FFEDD5';
    dividerStroke = '#334155';
    mattressFill = '#1E293B';
    textFill = '#FFFFFF';
  } else if (isBlocked) {
    frameStroke = '#FECDD3';
    frameFill = '#FFF1F2';
    pillowStroke = '#FDA4AF';
    pillowFill = '#FFE4E6';
    pillowCrease = '#F43F5E';
    dividerStroke = '#FECDD3';
    mattressFill = '#FFFFFF';
    textFill = '#E11D48';
  } else if (isBooked) {
    frameStroke = '#E2E8F0';
    frameFill = '#F1F5F9';
    pillowStroke = '#CBD5E1';
    pillowFill = '#E2E8F0';
    pillowCrease = '#94A3B8';
    dividerStroke = '#E2E8F0';
    mattressFill = '#F8FAFC';
    textFill = '#94A3B8';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isUnavailable}
      title={title || (isUnavailable ? `Unavailable: ${label}` : `Sleeper Berth ${label}`)}
      className={`group relative flex items-center justify-center p-0.5 transition-transform active:scale-95 focus:outline-none ${
        isUnavailable ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:scale-[1.03]'
      } ${className}`}
      style={{ minHeight: '66px', minWidth: '40px' }}
    >
      <svg
        viewBox="0 0 44 68"
        className="h-[68px] w-full max-w-[46px] drop-shadow-sm transition-all"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer berth frame */}
        <rect
          x="2"
          y="2"
          width="40"
          height="64"
          rx="10"
          fill={frameFill}
          stroke={frameStroke}
          strokeWidth="1.8"
        />
        {/* Top Plush Pillow */}
        <rect
          x="6.5"
          y="5.5"
          width="31"
          height="13"
          rx="4.5"
          fill={pillowFill}
          stroke={pillowStroke}
          strokeWidth="1.2"
        />
        {/* Pillow crease / indent */}
        <line
          x1="12"
          y1="12"
          x2="32"
          y2="12"
          stroke={pillowCrease}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2.5 2"
        />
        {/* Bed sheet divider line */}
        <line
          x1="6"
          y1="23.5"
          x2="38"
          y2="23.5"
          stroke={dividerStroke}
          strokeWidth="1.2"
        />
        {/* Mattress bed area */}
        <rect
          x="6.5"
          y="27"
          width="31"
          height="34"
          rx="4"
          fill={mattressFill}
        />
        {/* Berth Label */}
        <text
          x="22"
          y="46"
          textAnchor="middle"
          fill={textFill}
          fontSize="11"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.03em"
        >
          {label}
        </text>
        {/* Small sleeper accent pill */}
        <rect
          x="18"
          y="53.5"
          width="8"
          height="2"
          rx="1"
          fill={dividerStroke}
          opacity="0.8"
        />
      </svg>
    </button>
  );
};
