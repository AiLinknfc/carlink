/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VehiclePlate {
  plateNumber: string;
  city: string;
  plateStyle: 'classic' | 'carbon' | 'neon' | 'chrome';
  customColor?: string;
  customFrame?: boolean;
}

export interface UserSession {
  isLoggedIn: boolean;
  email: string;
  name: string;
  avatar: string;
}

export interface MaintenanceCard {
  currentMileage: number;
  nextServiceMileage: number;
  lubricantType: string;
  lubricantBrand: string;
  serviceDate: string;
  filtersReplaced: {
    oil: boolean;
    air: boolean;
    fuel: boolean;
    cabin: boolean;
    sparkPlugs: boolean;
    brakeFluid: boolean;
  };
}

export interface ShopDetails {
  name: string;
  rating: number;
  address: string;
  phone: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  website: string;
  logoUrl?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'photo' | 'certificate';
  url: string;
  date: string;
  fileSize: string;
}

export interface UserVehicle {
  brand: string;
  model: string;
  year: string;
  color: string;
  badgeUrl: string;
  carUrl: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  imageUrl: string;
  type: 'card' | 'keychain' | 'sticker';
}

export type AppView = 'plate-config' | 'login' | 'dashboard' | 'shop' | 'documents' | 'tips';
