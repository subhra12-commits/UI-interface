export type ProjectId =
  | 'meal-verifier'
  | 'kitchen-hygiene'
  | 'customer-marketing'
  | 'smart-parking-analyzer';

export interface WorkspaceProject {
  id: ProjectId;
  name: string;
  description: string;
  defaultUrl: string | null;
  configurable: boolean;
  imagePath: string;
  imageAlt: string;
  visualBadge: 'meal-verifier' | 'kitchen-hygiene' | 'customer-marketing' | 'smart-parking';
}

export const OFFICIAL_LOGO_SRC = '/assets/mothers-hut-logo.png';
export const OFFICIAL_LOGO_FALLBACK_SRC = 'https://www.mothershut.com/assets/img/logo.png';

export const MOTHERS_HUT_CONTACT = {
  brandName: "Mother's Hut",
  officialWebsite: 'https://www.mothershut.com/',
  email: 'care.mothershut@gmail.com',
  phoneDisplay: '+91 90025 25999',
  phoneE164: '+919002525999',
  address: 'NH-12, Bhatjangla, Krishnanagar, Nadia, West Bengal 741102',
  hours: '7:00 AM – 11:00 PM (Daily)',
} as const;

export const WORKSPACE_PROJECTS: readonly WorkspaceProject[] = [
  {
    id: 'meal-verifier',
    name: 'Meal Verifier System',
    description: 'Verify meal authenticity and ensure quality',
    defaultUrl: 'https://mh-meal-verifier-1.onrender.com/',
    configurable: false,
    imagePath: '/src/assets/images/card_meal_verifier_1794710391899.jpg',
    imageAlt: 'Plated Indian spiced rice dish inspected for meal authenticity and quality',
    visualBadge: 'meal-verifier',
  },
  {
    id: 'kitchen-hygiene',
    name: 'Kitchen Hygiene Monitoring',
    description: 'Track kitchen cleanliness and maintain hygiene standards',
    defaultUrl: 'https://kitchen-monitor.onrender.com/',
    configurable: false,
    imagePath: '/src/assets/images/card_kitchen_hygiene_1794710392024.jpg',
    imageAlt: 'Chef wearing hygienic gloves garnishing a freshly prepared meal in a clean kitchen',
    visualBadge: 'kitchen-hygiene',
  },
  {
    id: 'customer-marketing',
    name: 'Customer Grouping & Marketing Strategy Manager',
    description: 'Segment customers and plan smart campaigns',
    defaultUrl: 'https://mothers-hut-backend.onrender.com/',
    configurable: false,
    imagePath: '/src/assets/images/card_customer_marketing_1794710392491.jpg',
    imageAlt: 'Warm Mother\'s Hut dining room ambiance representing guest segmentation and campaigns',
    visualBadge: 'customer-marketing',
  },
  {
    id: 'smart-parking-analyzer',
    name: 'Smart Parking Analyzer',
    description: 'Monitor parking capacity, flow and space utilization',
    defaultUrl: 'https://mothers-hut-backend.onrender.com/',
    configurable: false,
    imagePath: '/src/assets/images/card_smart_parking_1794722354400.jpg',
    imageAlt: 'Organized restaurant parking courtyard monitored for bay availability and guest arrival flow',
    visualBadge: 'smart-parking',
  },
] as const;

export const HERO_PAVILION_IMAGE = '/assets/aistudio/image_aff07faa.png';
