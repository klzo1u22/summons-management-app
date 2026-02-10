'use server';

import OpenAI from 'openai';
import { ChatMessage, Summons, Case } from './types';

// Lazy initialization of Groq client
let groq: OpenAI | null = null;

function getGroqClient(): OpenAI {
    if (!groq) {
        const apiKey = process.env.GROQ_API_KEY;
        groq = new OpenAI({
            apiKey: apiKey || '',
            baseURL: 'https://api.groq.com/openai/v1',
        });
    }
    return groq;
}

const SYSTEM_PROMPT = `You are the "Summons Assistant", a specialized AI for managing a Summons Management System.
Your goal is to help users manage summons (individuals called for questioning) and cases (investigations).

### CAPABILITIES
1. **Fetch Data**: You can list all summons, all cases, or search for specific records.
2. **Answer Questions**: Analyze the data to answer user queries (e.g., "how many summons are served?", "who came in last for Case X?").
3. **Modify Data**: You can propose creating, updating, or deleting summons and cases.
4. **Context Awareness**: Use the current date and project data to provide accurate information.

### GUIDELINES
- ALWAYS be professional and concise.
- If a request is vague, ask for clarification.
- BEFORE making any changes (create/update/delete), you MUST propose the action and wait for user confirmation.
- You have tools to access the database. Use them as needed.
- NEVER hallucinate IDs (like CASE123). ALWAYS fetch real IDs from the system first.

### MANDATORY WORKFLOW
1. **Search First**: Before proposing any creation or update, ALWAYS use 'get_all_cases' or 'search_summons' to find the correct IDs and existing context.
2. **Handle Next Appearances (Rescheduling)**: If a user asks to "schedule next appearance" or "reschedule", first find the existing summons for that person. Propose an **update** to that summons by setting the 'rescheduled_date' and updating the 'status' to 'Rescheduled'.
3. **Verify Case**: A summons MUST be linked to a real Case ID. If the case isn't specified, search for cases or ask the user for clarification.

### DATA SCHEMA REFERENCE
- **Summons**: id, person_name, person_role, case_id, status (Draft, Issued, Served, Rescheduled, Completed), appearance_date, issue_date, etc.
- **Cases**: id, name, ecir_no, status, etc.
`;

export type ToolResult = {
    tool_call_id: string;
    output: any;
};

export async function processAgentChat(
    messages: ChatMessage[],
    currentDate: string
) {
    try {
        const client = getGroqClient();

        const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
            {
                type: 'function',
                function: {
                    name: 'get_all_summons',
                    description: 'Get all summons in the system',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_all_cases',
                    description: 'Get all cases in the system',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'search_summons',
                    description: 'Search for summons by person name, case ID, or role',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Search term' }
                        },
                        required: ['query']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'create_summon',
                    description: 'Create a new summons (REQUIRES CONFIRMATION)',
                    parameters: {
                        type: 'object',
                        properties: {
                            person_name: { type: 'string' },
                            case_id: { type: 'string', description: 'ID of the case' },
                            person_role: {
                                type: 'string',
                                enum: ['Suspect', 'Witness', 'Accomplice', 'Family member of main accused', 'Main accused', 'Key Employee of main accused', 'RP / Liquidator', 'Agent / Entry Operator', 'Depositor / Investor/ victim', 'Bank Official', 'Statutory Auditor/ CA', 'Dummy Director / shareholder']
                            },
                            issue_date: { type: 'string', format: 'date' },
                            appearance_date: { type: 'string', format: 'date' },
                            priority: { type: 'string', enum: ['Extremely Important', 'High', 'Medium', 'Low'] },
                            status: { type: 'string', enum: ['Draft', 'Issued', 'Served', 'Rescheduled', 'Completed'] },
                        },
                        required: ['person_name', 'case_id']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_summon',
                    description: 'Update an existing summons (REQUIRES CONFIRMATION)',
                    parameters: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            updates: {
                                type: 'object',
                                properties: {
                                    person_name: { type: 'string' },
                                    status: { type: 'string' },
                                    appearance_date: { type: 'string' },
                                    rescheduled_date: { type: 'string' },
                                    is_served: { type: 'boolean' },
                                    notes: { type: 'string' },
                                }
                            }
                        },
                        required: ['id', 'updates']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'delete_summon',
                    description: 'Delete a summons record (REQUIRES CONFIRMATION)',
                    parameters: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' }
                        },
                        required: ['id']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'create_case',
                    description: 'Create a new investigative case (REQUIRES CONFIRMATION)',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            ecir_no: { type: 'string' },
                            status: { type: 'string', enum: ['To Do', 'Doing', 'Done', 'On Hold'] },
                        },
                        required: ['name', 'ecir_no']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_case',
                    description: 'Update a case record (REQUIRES CONFIRMATION)',
                    parameters: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            updates: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    status: { type: 'string' },
                                    ecir_no: { type: 'string' },
                                }
                            }
                        },
                        required: ['id', 'updates']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_system_constants',
                    description: 'Get predefined options for roles, status, priority, etc.',
                    parameters: { type: 'object', properties: {} }
                }
            }
        ];

        const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: `${SYSTEM_PROMPT}\nCurrent date: ${currentDate}` },
            ...messages.map(m => {
                const role = (m.role === 'model' ? 'assistant' : m.role) as any;
                const msg: any = { role, content: m.content };
                if (m.tool_calls) msg.tool_calls = m.tool_calls;
                if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
                return msg;
            })
        ];

        const response = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: chatMessages,
            tools: tools,
            tool_choice: 'auto',
            temperature: 0.1,
            max_tokens: 1024,
        });

        return response.choices[0].message;
    } catch (error) {
        console.error('Groq Agent Chat Error:', error);
        throw error;
    }
}
