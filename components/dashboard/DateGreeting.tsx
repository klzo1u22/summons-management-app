"use client";

import { useEffect, useState } from "react";

export function DateGreeting() {
    const [greeting, setGreeting] = useState("");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 13) {
            setGreeting("Good Morning! Here’s your current day’s view.");
        } else {
            setGreeting("Good Afternoon. Tomorrow’s upcoming view.");
        }
    }, []);

    return (
        <div className="mb-4">
            <h2 className="text-lg font-medium text-muted-foreground">
                {greeting}
            </h2>
        </div>
    );
}
