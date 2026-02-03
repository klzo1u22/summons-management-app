"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Sheet({ isOpen, onClose, title, children, className }: SheetProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
    }, [isOpen]);

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className={cn(
                            "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background/80 backdrop-blur-xl border-l border-white/10 shadow-2xl p-0",
                            className
                        )}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
