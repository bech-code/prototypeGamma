import React from 'react';
import { Wrench } from 'lucide-react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "text-blue-900" }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <Wrench className="w-6 h-6 mr-2 text-orange-500" />
      <span className="font-bold text-xl">DepannageTeliman</span>
    </div>
  );
};

export default Logo;