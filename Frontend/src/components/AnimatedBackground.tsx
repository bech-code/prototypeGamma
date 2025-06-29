import React from 'react';

interface AnimatedBackgroundProps {
  videoSrc: string;
  overlayColor?: string;
  className?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  videoSrc,
  overlayColor = 'rgba(0, 0, 0, 0.4)',
  className = ''
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute min-w-full min-h-full object-cover"
        style={{
          transform: 'scale(1.1)',
          filter: 'blur(2px)'
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor }}
      />
    </div>
  );
};

export default AnimatedBackground; 