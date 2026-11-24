export const cities = ['Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig', 'Quezon City', 'San Juan', 'Taguig', 'Valenzuela', 'Pateros'] as const;
export type City = typeof cities[number];
export const categories = [
  { id: 'restaurant', label: 'Restaurants', tags: [['amenity', 'restaurant'], ['amenity', 'fast_food'], ['amenity', 'cafe']] },
  { id: 'dental', label: 'Dental clinics', tags: [['amenity', 'dentist'], ['healthcare', 'dentist']] },
  { id: 'clothing', label: 'Clothing boutiques', tags: [['shop', 'clothes'], ['shop', 'boutique']] },
  { id: 'beauty', label: 'Beauty salons', tags: [['shop', 'beauty'], ['shop', 'hairdresser']] },
  { id: 'gym', label: 'Gyms & fitness', tags: [['leisure', 'fitness_centre'], ['leisure', 'sports_centre']] },
  { id: 'automotive', label: 'Automotive services', tags: [['shop', 'car_repair'], ['shop', 'car'], ['amenity', 'car_wash']] },
  { id: 'school', label: 'Schools', tags: [['amenity', 'school'], ['amenity', 'college'], ['amenity', 'university']] },
  { id: 'other', label: 'Other shops & services', tags: [['shop', '*']] },
] as const;
export const websiteLabels: Record<string, string> = { not_listed: 'No website listed', existing: 'Existing website', unavailable: 'Website unavailable', review: 'Needs review', social_only: 'Social media only' };
export const prospectLabels: Record<string, string> = { new: 'Not saved', saved: 'Saved prospect', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', dismissed: 'Dismissed' };
export interface Scope { city: City; category: string; customKey?: string; customValue?: string; areaId?: number; limit: number }
export interface Area { id: number; name: string; kind: 'district' | 'barangay'; level: string }
export interface Business {
 id: string; osm_type: string; osm_id: string; name: string; category: string; city: string; address: string; district: string; barangay: string;
 lat: number | null; lon: number | null; website: string; phone: string; email: string; social: string; source_url: string; tags: Record<string,string>;
 social_links?: import('./social.ts').SocialLink[];
 website_status: string; website_reason: string; checked_at: string | null; discovered_at: string; updated_at: string; prospect_status: string; notes: string;
}
export interface MapFeature {type:'Feature';geometry:{type:'Point';coordinates:[number,number]};properties:{id:string;name:string;website_status:string;city:string}}
export interface MapData {type:'FeatureCollection';features:MapFeature[];total:number;missing_coordinates:number;complete:boolean}
export interface Scan { transport:string;id: string; scope: Scope; state: string; stage: string; found: number; stored: number; error: string | null; attempts: number; created_at: string; started_at?:string|null;cancel_requested?:boolean; finished_at: string | null; boundary_id: string | null; source_timestamp: string | null }
