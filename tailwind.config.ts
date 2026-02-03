import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                border: "var(--border)",

                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--text-inverted)",
                    hover: "var(--primary-hover)",
                    muted: "var(--primary-muted)",
                },

                muted: {
                    DEFAULT: "var(--text-muted)",
                    foreground: "var(--text-secondary)",
                },

                // Mapping 'base' colors to match the project's variable scheme
                // adapting for the requested component styles
                base: {
                    50: "var(--background-elevated)",
                    100: "var(--surface)",
                    200: "var(--border-subtle)",
                    300: "var(--border)",
                },
            },
            borderRadius: {
                lg: "var(--radius-lg)",
                md: "var(--radius-md)",
                sm: "var(--radius-sm)",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
