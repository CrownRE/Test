import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800/60 backdrop-blur-lg border border-white/10 rounded-2xl shadow-inner ${className}`}>
      {children}
    </div>
  );
};

export default Card;
