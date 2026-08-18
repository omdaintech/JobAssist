/**
 * Admin app configuration constants
 */
export const appConfig = {
    recaptcha: {
        siteKey: (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY || "",
    },
};

export default appConfig;
