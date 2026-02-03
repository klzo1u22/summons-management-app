"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Save, Trash2 } from "lucide-react";

export function SettingsPanel() {
    const propertySections = [
        { title: "Mode of Service", items: ["Whatsapp", "Email", "Physical", "Phone"] },
        { title: "Purpose of Summons", items: ["Testimony", "Produce Documents", "Identification"] },
        { title: "Tone Required", items: ["Formal", "Urgent", "Strict"] },
        { title: "Person Role", items: ["Witness", "Accused", "Complainant", "Expert"] },
        { title: "Priority", items: ["High", "Medium", "Low"] },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-border flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-border bg-slate-50">
                <h2 className="text-xl font-bold text-foreground">Settings & Configuration</h2>
                <p className="text-muted-foreground text-sm">Manage dropdown values, defaults, and system preferences.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Property Management */}
                <div>
                    <h3 className="text-base font-semibold text-foreground mb-4">Dropdown Properties Manager</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {propertySections.map((section) => (
                            <div key={section.title} className="border border-border rounded-lg p-4 bg-white shadow-sm">
                                <h4 className="font-medium text-sm text-foreground mb-3">{section.title}</h4>
                                <ul className="space-y-2 mb-3">
                                    {section.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-sm px-2 py-1 bg-secondary rounded hover:bg-slate-200">
                                            {item}
                                            <button className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <Input placeholder="Add new..." className="h-8 text-xs bg-white text-foreground" />
                                    <Button size="icon" className="h-8 w-8 shrink-0 bg-primary/10 text-primary hover:bg-primary/20">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* General Settings */}
                <div className="border-t border-border pt-6">
                    <h3 className="text-base font-semibold text-foreground mb-4">General Preferences</h3>
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-slate-50">
                            <div>
                                <div className="font-medium text-sm">Default Financial Year Start</div>
                                <div className="text-xs text-muted-foreground">Month to begin fiscal year calculations</div>
                            </div>
                            <select className="bg-white border border-border rounded p-1 text-sm text-foreground">
                                <option>April</option>
                                <option>January</option>
                                <option>October</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-slate-50">
                            <div>
                                <div className="font-medium text-sm">Auto-highlight Overdue</div>
                                <div className="text-xs text-muted-foreground">Highlight rows in red if issue date &gt; 7 days ago and not served</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="toggle" defaultChecked />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-slate-50">
                            <div>
                                <div className="font-medium text-sm">Dark Mode</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="toggle" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border pt-6">
                    <h3 className="text-base font-semibold text-foreground mb-4">Data Management</h3>
                    <div className="flex gap-4">
                        <Button variant="outline">Import CSV</Button>
                        <Button variant="outline">Export Database Backup</Button>
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Reset All Data</Button>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
                <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <Save className="w-4 h-4" /> Save Changes
                </Button>
            </div>
        </div>
    );
}
