// Real settings service connected to Supabase database (CLIENT VERSION)
// This module is safe to import from Client Components only.
// For server usage (e.g. in `generateMetadata`), import
// `@/modules/settings/services/setting-service.server` instead.

import { createClient } from '@/lib/supabase/client';

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

const settingsService = {
    /**
     * Get settings by ID or get the first settings record
     */
    getSettingsById: async (id?: number): Promise<Settings | null> => {
        const supabase = createClient();
        
        try {
            let query = supabase.from('settings').select('*');
            
            if (id) {
                query = query.eq('id', id);
            } else {
                // Get the first settings record if no ID provided
                query = query.order('created_at', { ascending: true }).limit(1);
            }
            
            // Add a timeout to prevent hanging
            const queryPromise = query.single();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database query timeout')), 8000);
            });
            
            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
            
            if (error) {
                if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    // No settings found or table doesn't exist, return default settings
                    console.warn("Settings table not found or empty, using default settings");
                    return {
                        site_name: "Starter Kit",
                        site_description: "A modern application starter kit",
                        primary_color: "#0070f3",
                        secondary_color: "#00ff88",
                        favicon_url: "/favicon.ico",
                        logo_url: "https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png",
                        logo_horizontal_url: undefined,
                        logo_setting: "square",
                        appearance_theme: "light"
                    };
                }
                console.error("Error fetching settings:", error);
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error("Error in getSettingsById:", error);
            // Return default settings on error
            return {
                site_name: "Starter Kit",
                site_description: "A modern application starter kit",
                primary_color: "#0070f3",
                secondary_color: "#00ff88",
                favicon_url: "/favicon.ico",
                logo_url: "https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png",
                logo_horizontal_url: undefined,
                logo_setting: "square",
                appearance_theme: "light"
            };
        }
    },

    /**
     * Update settings by ID
     */
    updateSettingsById: async (data: Partial<Settings>, id?: number): Promise<Settings | number> => {
        const supabase = createClient();
        
        try {
            // Add updated_at timestamp
            const updateData = {
                ...data,
                updated_at: new Date().toISOString()
            };
            
            let query = supabase.from('settings').update(updateData);
            
            if (id) {
                query = query.eq('id', id);
            } else {
                // Update the first record if no ID provided
                const { data: existingSettings } = await supabase
                    .from('settings')
                    .select('id')
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single();
                
                if (existingSettings) {
                    query = query.eq('id', existingSettings.id);
                } else {
                    // No existing settings, insert new one
                    return await settingsService.insertSettings(updateData);
                }
            }
            
            const { error, count } = await query;
            
            if (error) {
                console.error("Error updating settings:", error);
                throw error;
            }
            
            return count || 1;
        } catch (error) {
            console.error("Error in updateSettingsById:", error);
            throw error;
        }
    },

    /**
     * Insert new settings record
     */
    insertSettings: async (data: Partial<Settings>): Promise<Settings> => {
        const supabase = createClient();
        
        try {
            const insertData = {
                ...data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data: newSettings, error } = await supabase
                .from('settings')
                .insert([insertData])
                .select('*')
                .single();
            
            if (error) {
                console.error("Error inserting settings:", error);
                throw error;
            }
            
            return newSettings;
        } catch (error) {
            console.error("Error in insertSettings:", error);
            throw error;
        }
    },

    /**
     * Get all settings records
     */
    getAllSettings: async (): Promise<Settings[]> => {
        const supabase = createClient();
        
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error("Error fetching all settings:", error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error("Error in getAllSettings:", error);
            return [];
        }
    },

    /**
     * Delete settings by ID
     */
    deleteSettingsById: async (id: number): Promise<boolean> => {
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('settings')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error("Error deleting settings:", error);
                throw error;
            }
            
            return true;
        } catch (error) {
            console.error("Error in deleteSettingsById:", error);
            return false;
        }
    }
};

export default settingsService;
