import { Summons } from "@/lib/types";

export type ViewType =
    | "First Entry"
    | "Not Issued"
    | "Issued but Not Served"
    | "Served but Didn't Appear"
    | "Reschedule Pending"
    | "Ongoing Statements"
    | "Upcoming 7 Days"
    | "All Summons";

export const VIEW_TABS: ViewType[] = [
    "Draft - Not Issued", // Renaming from "First Entry" / "Not Issued" to match Notion closer if desired, but sticking to existing keys for now and mapping them
    "Issued - Not Served",
    "Didn't Attend",
    "Reschedule - Date Not Communicated",
    "Ongoing Statements",
    "Upcoming 7 Days",
    "All Summons"
] as any; // Cast to any to allow mapping if we change strings, for now let's stick to the strings used in the Table component for compatibility but implement strict logic.

// We will use the strings currently in the UI but enforce the logic strictly.
// TABS in SummonsTable: 
// "First Entry", "Not Issued" (Seems redundant, likely "Not Issued" is main), 
// "Issued but Not Served", "Served but Didn't Appear", "Reschedule Pending", 
// "Ongoing Statements", "Upcoming 7 Days", "All Summons"

export function filterSummons(summons: Summons[], view: string): Summons[] {
    const today = new Date();
    // Normalize time to start of day for accurate comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return summons.filter(s => {
        const scheduledDate = s.appearance_date ? new Date(s.appearance_date) : null;
        const rescheduledDate = s.rescheduled_date ? new Date(s.rescheduled_date) : null;
        const effectiveDate = rescheduledDate || scheduledDate;

        // Normalize effective date
        if (effectiveDate) effectiveDate.setHours(0, 0, 0, 0);

        switch (view) {
            case "all":
            case "All Summons":
            case "All":
                return true;

            case "all_pending_works": {
                const oneWeekFromNow = new Date(todayStart);
                oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

                return (
                    // 1. Next 7 Days
                    (effectiveDate && effectiveDate >= todayStart && effectiveDate <= oneWeekFromNow) ||
                    // 2. Summon issued is Unchecked
                    !s.is_issued ||
                    // 3. SummonServed is Unchecked
                    !s.is_served ||
                    // 4. Appeared ongoing staement is Checked
                    s.statement_ongoing ||
                    // 5. Followup required is Checked
                    s.followup_required ||
                    // 6. Reschedule request received is Checked AND Rescheduled date communicated is Unchecked
                    (s.requests_reschedule && !s.rescheduled_date_communicated)
                    // 7. (Explicit in Notion as "Where Statement recorded is Unchecked" across all, but we already filter out completed works in some contexts, 
                    // however the Notion filter for "All Pending Works" is actually a set of ORs.
                    // To be safe and match Notion precisely, we should ensure Statement recorded is Unchecked if that's the overall intent.)
                ) && !s.statement_recorded; // Rule 7: Always exclude if recorded
            }

            case "final_statement_recorded":
                return s.statement_recorded;

            case "First Entry":
            case "first_entry":
            case "Draft - Not Issued": // Alias
            case "draft_not_issued":
            case "Not Issued":
                // Rule: Summon issued is Unchecked
                return !s.is_issued;

            case "Issued but Not Served":
            case "Issued - Not Served": // Alias
            case "issued_not_served":
                // Rule: Summon issued is Checked AND SummonServed is Unchecked
                return s.is_issued && !s.is_served;

            case "Served but Didn't Appear":
            case "Didn't Attend": // Alias
            case "didnt_attend":
                // Rule: Served is Checked AND Reschedule is Unchecked AND Statement Completed is Unchecked 
                // AND Statement Ongoing is Unchecked AND Scheduled Date < Today
                if (!effectiveDate) return false;
                return (
                    s.is_served &&
                    !s.requests_reschedule &&
                    !s.statement_recorded && // Statement Completed
                    !s.statement_ongoing &&  // Appeared ongoing
                    effectiveDate < todayStart // Date < Today (Strictly past)
                );

            case "Reschedule Pending":
            case "Reschedule - Date Not Communicated": // Alias
            case "reschedule_date_not_communicated":
                // Rule: Reschedule request received is Checked AND Rescheduled Date is Empty
                return s.requests_reschedule && !s.rescheduled_date;

            case "Ongoing Statements":
            case "ongoing_statement":
                // Rule: Statement ongoing is Checked AND Statement recorded is Unchecked
                return s.statement_ongoing && !s.statement_recorded;

            case "Upcoming 7 Days":
            case "next_7_days":
                if (!effectiveDate) return false;
                const diffTime = effectiveDate.getTime() - todayStart.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // 0 to 7 days inclusive
                return diffDays >= 0 && diffDays <= 7;

            case "role_tone_purpose":
                return true;
        }
    });
}

export function sortSummons(summons: Summons[], view: string): Summons[] {
    const data = [...summons]; // Copy to avoid mutation

    return data.sort((a, b) => {
        const dateA = a.appearance_date ? new Date(a.appearance_date).getTime() : 0;
        const dateB = b.appearance_date ? new Date(b.appearance_date).getTime() : 0;
        const createdA = new Date(a.created_at || 0).getTime();
        const createdB = new Date(b.created_at || 0).getTime();

        switch (view) {
            case "Not Issued":
            case "First Entry":
            case "Draft - Not Issued":
                // Sort: Date of Summon Issue Descending (Implies Created or Issue Date)
                // Use Issue Date if exists, else Created
                const issueA = a.issue_date ? new Date(a.issue_date).getTime() : createdA;
                const issueB = b.issue_date ? new Date(b.issue_date).getTime() : createdB;
                return issueB - issueA; // Descending

            case "Issued but Not Served":
            case "Issued - Not Served":
                // Sort: Date of Summon Issue Descending
                const iA = a.issue_date ? new Date(a.issue_date).getTime() : 0;
                const iB = b.issue_date ? new Date(b.issue_date).getTime() : 0;
                return iB - iA;

            case "Served but Didn't Appear":
            case "Didn't Attend":
            case "Reschedule Pending":
            case "Reschedule - Date Not Communicated":
            case "Upcoming 7 Days":
                // Sort: Scheduled Appearance Date Ascending
                // Move nulls to end
                if (dateA === 0) return 1;
                if (dateB === 0) return -1;
                return dateA - dateB;

            case "All Summons":
            default:
                return createdB - createdA; // Default new to old
        }
    });
}

export function searchSummons(summons: Summons[], term: string): Summons[] {
    if (!term) return summons;
    const lowerTerm = term.toLowerCase();
    return summons.filter(s =>
        (s.person_name && s.person_name.toLowerCase().includes(lowerTerm)) ||
        (s.case_id && s.case_id.toLowerCase().includes(lowerTerm)) ||
        (s.person_role && s.person_role.toLowerCase().includes(lowerTerm))
    );
}

export interface Stats {
    all: number;
    pendingWorks: number;
    notIssued: number;
    notServed: number;
    reschedulePending: number;
    ongoingStatements: number;
    upcoming7Days: number;
    recorded: number;
}

export function getStats(summons: Summons[]): Stats {
    return {
        all: filterSummons(summons, "all").length,
        pendingWorks: filterSummons(summons, "all_pending_works").length,
        notIssued: filterSummons(summons, "Not Issued").length,
        notServed: filterSummons(summons, "Issued but Not Served").length,
        reschedulePending: filterSummons(summons, "Reschedule Pending").length,
        ongoingStatements: filterSummons(summons, "Ongoing Statements").length,
        upcoming7Days: filterSummons(summons, "Upcoming 7 Days").length,
        recorded: filterSummons(summons, "final_statement_recorded").length
    };
}
