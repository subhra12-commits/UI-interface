import mealVerifierImg from '../assets/images/card_meal_verifier_1794710391899.jpg';
import kitchenHygieneImg from '../assets/images/card_kitchen_hygiene_1794710392024.jpg';
import customerMarketingImg from '../assets/images/card_customer_marketing_1794710392491.jpg';
import smartParkingImg from '../assets/images/card_smart_parking_1794722354400.jpg';
import type { ProjectId } from './projects';

export const PROJECT_CARD_IMAGES: Record<ProjectId, string> = {
  'meal-verifier': mealVerifierImg,
  'kitchen-hygiene': kitchenHygieneImg,
  'customer-marketing': customerMarketingImg,
  'smart-parking-analyzer': smartParkingImg,
};
