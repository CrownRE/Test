import React, { useState } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface PhotoPositionerProps {
  contact: Contact;
  color: string;
  position: string;
  onPositionChange: (newPosition: string) => void;
  className?: string;
}

const ControlButton: React.FC<{ onClick: () => void; 'aria-label': string; children: React.ReactNode; className?: string }> = ({ onClick, children, className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`absolute w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/75 transition-all duration-150 flex items-center justify-center backdrop-blur-sm ${className}`}
    {...props}
  >
    {children}
  </button>
);

const PhotoPositioner: React.FC<PhotoPositionerProps> = ({ contact, color, position, onPositionChange, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    const [xStr, yStr] = position.split(' ');
    let x = parseInt(xStr, 10);
    let y = parseInt(yStr, 10);
    const step = 5;

    switch (direction) {
      case 'up': y = Math.max(0, y - step); break;
      case 'down': y = Math.min(100, y + step); break;
      case 'left': x = Math.max(0, x - step); break;
      case 'right': x = Math.min(100, x + step); break;
    }
    onPositionChange(`${x}% ${y}%`);
  };
  
  const handleReset = () => {
    onPositionChange('50% 50%');
  };

  const showImage = contact.avatar && !imageError;

  if (!showImage) {
    return (
      <div
        className={`rounded-full border-4 border-indigo-500 flex items-center justify-center bg-gray-700 overflow-hidden ${className}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-4xl font-bold text-white uppercase" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
          {contact.firstNameEn.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative rounded-full border-4 border-indigo-500 group overflow-hidden ${className}`}>
      <img
        src={contact.avatar}
        alt={contact.firstNameEn}
        className="w-full h-full object-cover"
        style={{ objectPosition: position }}
        onError={() => setImageError(true)}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ControlButton onClick={() => handleMove('up')} aria-label={t('Move photo up')} className="top-2 left-1/2 -translate-x-1/2">↑</ControlButton>
        <ControlButton onClick={() => handleMove('down')} aria-label={t('Move photo down')} className="bottom-2 left-1/2 -translate-x-1/2">↓</ControlButton>
        <ControlButton onClick={() => handleMove('left')} aria-label={t('Move photo left')} className="top-1/2 left-2 -translate-y-1/2">←</ControlButton>
        <ControlButton onClick={() => handleMove('right')} aria-label={t('Move photo right')} className="top-1/2 right-2 -translate-y-1/2">→</ControlButton>
        <ControlButton onClick={handleReset} aria-label={t('Center photo')} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">⟳</ControlButton>
      </div>
    </div>
  );
};

export default PhotoPositioner;