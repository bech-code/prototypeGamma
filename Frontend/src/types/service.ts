import { ReactNode } from 'react';

export interface Service {
  id: string;
  name: string;
  shortDescription: string;
  description?: string;
  startingPrice: number;
  imageUrl: string;
  icon?: ReactNode;
}