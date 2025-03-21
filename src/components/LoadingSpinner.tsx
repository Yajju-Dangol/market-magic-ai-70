
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-t-primary rounded-full animate-spin-slow"></div>
    </div>
  );
};

export default LoadingSpinner;
