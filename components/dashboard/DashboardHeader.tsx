
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Calendar, FileText, Plus, Settings, Briefcase } from "lucide-react";

interface DashboardHeaderProps {
    onAddSummon: () => void;
    onViewChange: (view: 'dashboard' | 'calendar' | 'settings' | 'reports') => void;
    currentView: string;
}

export function DashboardHeader({ onAddSummon, onViewChange, currentView }: DashboardHeaderProps) {
    return (
        <header className="flex items-center justify-between py-6 bg-background sticky top-0 z-10 transition-all duration-200">
            <div
                className="cursor-pointer group"
                onClick={() => onViewChange('dashboard')}
            >
                <h1 className="text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    Final Summons Dashboard
                </h1>
                {currentView !== 'dashboard' && (
                    <span className="text-xs text-muted-foreground group-hover:underline">← Back to Dashboard</span>
                )}
            </div>

            <div className="flex items-center gap-3">
                <Link href="/cases">
                    <Button variant="outline" className="gap-2 text-muted-foreground hover:text-foreground transition-all">
                        <Briefcase className="w-4 h-4" />
                        Cases
                    </Button>
                </Link>
                <div className="h-6 w-px bg-border mx-1" />
                <Button onClick={onAddSummon} className="gap-2 font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all">
                    <Plus className="w-4 h-4" />
                    Add Summon
                </Button>
                <Button
                    variant={currentView === 'calendar' ? 'secondary' : 'outline'}
                    className="gap-2 text-muted-foreground hover:text-foreground transition-all"
                    onClick={() => onViewChange('calendar')}
                >
                    <Calendar className="w-4 h-4" />
                    Calendar
                </Button>
                <Button
                    variant={currentView === 'reports' ? 'secondary' : 'outline'}
                    className="gap-2 text-muted-foreground hover:text-foreground transition-all"
                    onClick={() => onViewChange('reports')}
                >
                    <FileText className="w-4 h-4" />
                    Reports
                </Button>
                <Button
                    variant={currentView === 'settings' ? 'secondary' : 'outline'}
                    className="gap-2 text-muted-foreground hover:text-foreground transition-all"
                    onClick={() => onViewChange('settings')}
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </Button>
            </div>
        </header>
    );
}
