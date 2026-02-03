"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = false, ...props }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "glass-card p-6 transition-all duration-300",
                hoverEffect && "hover:bg-white/10 hover:shadow-xl hover:scale-[1.01] cursor-pointer",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
