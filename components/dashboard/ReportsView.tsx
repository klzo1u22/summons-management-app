"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BarChart3, Download, FileText, PieChart, TrendingUp } from "lucide-react";

export function ReportsView() {
    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-border flex flex-wrap gap-4 items-center justify-between shadow-sm">
                <div className="flex gap-4 items-center flex-1">
                    <div className="bg-secondary/50 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        <select className="h-9 rounded-md border border-input text-sm bg-white p-2 text-foreground">
                            <option>All Cases</option>
                            <option>Case-001</option>
                            <option>Case-002</option>
                        </select>
                        <Input type="date" className="bg-white" />
                        <Input type="date" className="bg-white" />
                        <div className="flex bg-secondary rounded-md p-1">
                            <button className="flex-1 text-xs font-medium bg-white rounded shadow-sm text-center py-1">Summon Generated</button>
                            <button className="flex-1 text-xs font-medium text-muted-foreground text-center py-1">Statement Recorded</button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button size="sm" className="gap-2 bg-primary text-white">
                        <FileText className="w-4 h-4" /> Download PDF
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                {['Total Summons', 'Served %', 'Avg Response Time', 'Statements Logged'].map((label, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{Math.floor(Math.random() * 100) + (idx * 5)}</p>
                    </div>
                ))}
            </div>

            {/* Visual Charts Area (Mocked visually) */}
            <div className="grid grid-cols-2 gap-6 flex-1 min-h-[400px]">
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" /> Issued vs Served
                        </h3>
                    </div>
                    <div className="flex-1 flex items-end justify-around gap-4 px-4 pb-4">
                        {[60, 80, 45, 90, 30, 75].map((h, i) => (
                            <div key={i} className="w-full bg-blue-100/50 rounded-t-md relative group h-full">
                                <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all group-hover:bg-blue-600"></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex-1">
                        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                            <PieChart className="w-5 h-5 text-emerald-500" /> Mode of Service
                        </h3>
                        <div className="flex items-center justify-center h-[180px]">
                            <div className="w-32 h-32 rounded-full border-[16px] border-emerald-500 border-r-emerald-200 border-b-blue-500"></div>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 text-xs">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Whatsapp</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Email</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-200 rounded-full"></div> Physical</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex-1">
                        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-purple-500" /> Statement Trends
                        </h3>
                        <div className="flex items-end gap-1 h-[100px] border-b border-border pb-1">
                            {[30, 40, 35, 50, 45, 60, 55, 70, 65, 80].map((h, i) => (
                                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-purple-500/20 border-t-2 border-purple-500 rounded-t-sm"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
