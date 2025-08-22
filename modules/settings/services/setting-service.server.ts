// Real settings service connected to Supabase database (SERVER VERSION)
// Use this module only from Server Components, Route Handlers, or middleware.

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/services/logger';

export interface Settings {
  id?: number;
  site_name?: string;
  site_image?: string;
  appearance_theme?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  logo_horizontal_url?: string;
  favicon_url?: string;
  site_description?: string;
  meta_keywords?: string;
  meta_description?: string;
  contact_email?: string;
  social_links?: any;
  logo_setting?: string;
  created_at?: string;
  updated_at?: string;
}

const settingsServiceServer = {
  getSettingsById: async (id?: number): Promise<Settings | null> => {
    const supabase = await createClient();
    try {
      let query = supabase.from('settings').select('*');
      if (id) {
        query = query.eq('id', id);
      } else {
        query = query.order('created_at', { ascending: true }).limit(1);
      }
      const { data, error } = await query.single();
      if (error) {
        if ((error as any).code === 'PGRST116') {
          return {
            site_name: 'Starter Kit',
            site_description: 'A modern application starter kit',
            primary_color: '#0070f3',
            secondary_color: '#00ff88',
            favicon_url: '/favicon.ico',
            logo_url:
              'https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png',
            logo_horizontal_url: undefined,
            logo_setting: 'square',
            appearance_theme: 'light',
          };
        }
        logger.error('Error fetching settings (server):', error);
        throw error;
      }
      return data;
    } catch (error) {
      logger.error('Error in getSettingsById (server):', error);
      return {
        site_name: 'Starter Kit',
        site_description: 'A modern application starter kit',
        primary_color: '#0070f3',
        secondary_color: '#00ff88',
        favicon_url: '/favicon.ico',
        logo_url:
          'https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png',
        logo_horizontal_url: undefined,
        logo_setting: 'square',
        appearance_theme: 'light',
      };
    }
  },
};

export default settingsServiceServer;


