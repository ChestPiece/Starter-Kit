// Mock settings service (authentication and GraphQL backend removed)
const settingsService = {
    getSettingsById: async () => {
        // Return mock settings data instead of calling GraphQL backend
        return {
            id: "mock-settings-id",
            site_name: "Starter Kit Demo",
            site_description: "A modern application starter kit with no authentication required",
            primary_color: "#0070f3",
            secondary_color: "#00ff88",
            favicon_url: "/favicon.ico",
            logo_url: "https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png",
            logo_horizontal_url: null,
            logo_setting: "square",
            appearance_theme: "light"
        };
    },
    updateSettingsById: async (data: any) => {
        // Mock update - just return success
        console.log("Mock settings update:", data);
        return 1; // Affected count
    },
    insertSettings: async (data: any) => {
        // Mock insert - just return the data with an ID
        console.log("Mock settings insert:", data);
        return { id: "mock-settings-id", ...data };
    }
}

export default settingsService;
