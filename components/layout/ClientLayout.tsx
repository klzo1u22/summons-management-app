'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

// App Context for global state
interface AppContextType {
    isSyncing: boolean;
    setIsSyncing: (value: boolean) => void;
    lastSynced: Date | null;
    setLastSynced: (date: Date | null) => void;
    triggerSync: (silent?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
}

function AppProvider({ children }: { children: ReactNode }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);

    // Load last sync time from localStorage
    useEffect(() => {
        const storedSync = localStorage.getItem('last-synced');
        if (storedSync) {
            setLastSynced(new Date(storedSync));
        }
    }, []);

    const triggerSync = async (silent = false) => {
        if (!silent) setIsSyncing(true);
        try {
            const { syncDataAction } = await import('@/app/actions');
            const result = await syncDataAction();

            if (result.success) {
                const now = new Date();
                setLastSynced(now);
                localStorage.setItem('last-synced', now.toISOString());
            } else if (!silent) {
                console.error('Sync failed:', result.errors);
            }
        } catch (error) {
            if (!silent) console.error('Sync error:', error);
        } finally {
            if (!silent) setIsSyncing(false);
        }
    };

    // Auto-sync every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Background sync starting...');
            triggerSync(true);
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AppContext.Provider value={{
            isSyncing,
            setIsSyncing,
            lastSynced,
            setLastSynced,
            triggerSync,
        }}>
            {children}
        </AppContext.Provider>
    );
}

function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="app-layout-full">
            {children}
        </div>
    );
}

export function ClientLayout({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <AppProvider>
                <AppLayout>{children}</AppLayout>
            </AppProvider>
        </ThemeProvider>
    );
}

