import { NextRequest, NextResponse } from 'next/server';
import { processAgentChat, ToolResult } from '@/lib/ai-chat';
import { ChatMessage, AIResponse, Summons, Case } from '@/lib/types';
import * as actions from '@/app/actions';
import * as types from '@/lib/types';

/**
 * NEW Agentic Chat API
 * Uses Tool Calling to fetch data and propose actions.
 * Implements a confirmation flow for mutations.
 */

// Tool Execution Registry
async function executeTool(name: string, args: any): Promise<any> {
    console.log(`[Chat Agent] Executing tool: ${name}`, args);
    switch (name) {
        case 'get_all_summons':
            return await actions.getSummonsAction();
        case 'get_all_cases':
            return await actions.getCasesAction();
        case 'search_summons':
            return await actions.searchSummons(args.query);
        case 'get_system_constants':
            return {
                roles: types.PERSON_ROLE_OPTIONS,
                priority: types.PRIORITY_OPTIONS,
                purpose: types.PURPOSE_OPTIONS,
                tone: types.TONE_OPTIONS,
                status: ['Draft', 'Issued', 'Served', 'Rescheduled', 'Completed']
            };
        default:
            return null;
    }
}

// Check if a tool is a mutation
function isMutationTool(name: string): boolean {
    return ['create_summon', 'update_summon', 'delete_summon', 'create_case', 'update_case', 'delete_case'].includes(name);
}

// Generate a developer-friendly confirmation message based on tool call
function getConfirmationMessage(name: string, args: any): string {
    switch (name) {
        case 'create_summon':
            return `I'm ready to create a new summons for **${args.person_name}** associated with Case ID **${args.case_id}**. \n\nShould I proceed with the creation?`;
        case 'update_summon':
            const changes = Object.entries(args.updates || {}).map(([k, v]) => `• ${k.replace(/_/g, ' ')}: ${v}`).join('\n');
            return `I'll update the summons (ID: ${args.id.substring(0, 8)}...) with the following changes:\n${changes}\n\nConfirm these updates?`;
        case 'delete_summon':
            return `Are you sure you want to permanently delete the summons record (ID: ${args.id.substring(0, 8)}...)? This action cannot be undone.`;
        case 'create_case':
            return `I'll create a new Case: **${args.name}** (ECIR: ${args.ecir_no}). Confirm?`;
        case 'update_case':
            const caseChanges = Object.entries(args.updates || {}).map(([k, v]) => `• ${k.replace(/_/g, ' ')}: ${v}`).join('\n');
            return `I'll update the Case (ID: ${args.id.substring(0, 8)}...) with:\n${caseChanges}\n\nConfirm?`;
        default:
            return `Confirm action: ${name}?`;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, confirmed, toolCallId, toolCallArgs, toolCallName } = body;

        // 1. Handle actual execution after confirmation
        if (confirmed && toolCallName && toolCallArgs) {
            console.log(`[Chat Agent] User confirmed mutation: ${toolCallName}`);
            let result: any;
            let successMessage = "";

            if (toolCallName === 'create_summon') {
                result = await actions.createSummon(toolCallArgs);
                successMessage = `✅ Successfully created summons for **${toolCallArgs.person_name}**. ${result.notion_synced ? 'Synced with Notion.' : ''}`;
            } else if (toolCallName === 'update_summon') {
                result = await actions.updateSummon(toolCallArgs.id, toolCallArgs.updates);
                successMessage = `✅ Updated summons record. ${result.notion_synced ? 'Synced with Notion.' : ''}`;
            } else if (toolCallName === 'delete_summon') {
                await actions.deleteSummonsAction(toolCallArgs.id);
                successMessage = `✅ Deleted summons record.`;
            } else if (toolCallName === 'create_case') {
                await actions.addCaseAction(toolCallArgs);
                successMessage = `✅ Created Case: **${toolCallArgs.name}**.`;
            } else if (toolCallName === 'update_case') {
                await actions.updateCaseAction(toolCallArgs.id, toolCallArgs.updates);
                successMessage = `✅ Updated Case record.`;
            }

            return NextResponse.json({
                message: successMessage,
                executed: true,
                action: 'info'
            });
        }

        // 2. Normal Agent Loop
        const currentDate = new Date().toISOString().split('T')[0];
        let currentMessages = [...messages];
        let iterations = 0;
        const maxIterations = 3; // Prevent infinite loops

        while (iterations < maxIterations) {
            iterations++;
            const aiMessage = await processAgentChat(currentMessages, currentDate);

            if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
                // Regular text response
                return NextResponse.json({
                    message: aiMessage.content || "I'm here to help. What would you like to do?",
                    action: 'info'
                });
            }

            // Handle tool calls
            const toolCall = aiMessage.tool_calls[0];
            if (toolCall.type !== 'function') {
                return NextResponse.json({ message: "I encountered an unsupported tool type.", action: 'info' });
            }

            const name = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            if (isMutationTool(name)) {
                // STOP and ask for confirmation
                return NextResponse.json({
                    message: getConfirmationMessage(name, args),
                    requires_confirmation: true,
                    toolCallId: toolCall.id,
                    toolCallName: name,
                    toolCallArgs: args,
                    action: name.includes('delete') ? 'delete' : (name.includes('create') ? 'create' : 'update')
                });
            } else {
                // Execute ReadOnly tool and loop back to AI
                const output = await executeTool(name, args);

                // 1. Add the assistant message THAT CALLED the tool
                currentMessages.push({
                    role: 'assistant',
                    content: aiMessage.content || '',
                    tool_calls: aiMessage.tool_calls, // Essential for sequence validation
                } as any);

                // 2. Add the tool result message
                currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(output)
                } as any);

                continue; // Loop back for the AI to process the result
            }
        }

        return NextResponse.json({
            message: "I've gathered the information but I'm having trouble formulating a response. Please try being more specific.",
            action: 'info'
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message || 'Something went wrong.' },
            { status: 500 }
        );
    }
}
