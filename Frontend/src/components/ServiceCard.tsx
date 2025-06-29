import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Service } from '../types/service';

interface ServiceCardProps {
  service: Service;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img 
          src={service.imageUrl} 
          alt={service.name} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            {service.icon}
          </div>
          <h3 className="text-xl font-semibold text-gray-800">{service.name}</h3>
        </div>
        <p className="text-gray-600 mb-4">{service.shortDescription}</p>
        <div className="flex justify-between items-center">
          <span className="text-blue-800 font-semibold">À partir de {service.startingPrice} FCFA</span>
          <Link 
            to={`/service/${service.id}`}
            className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            Détails
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;