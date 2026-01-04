import { ActionType, CreateActionInput, ExecutionResult } from '../godmode.service.js';

export interface ActionContext {
    userId: string;
    contactId?: string;
    propertyId?: string;
    dealId?: string;
    [key: string]: any;
}

export interface GeneratedActionContent {
    title: string;
    description: string;
    reasoning: string;
    priority: number;
    draftSubject?: string;
    draftBody?: string;
    payload?: any;
    assets?: any[];
    script?: string;
    contextSummary?: string;
    intelligenceSources?: any[];
}

export interface ActionStrategy {
    actionType: ActionType;

    /**
     * Determine if this action should be generated for the given context
     */
    shouldTrigger(context: ActionContext): Promise<boolean>;

    /**
     * Generate the content/payload for the action
     */
    generate(context: ActionContext): Promise<GeneratedActionContent>;

    /**
     * Execute the action (e.g., send email, book calendar)
     * This acts as the "Tool" execution layer
     */
    execute(actionId: string, payload: any): Promise<ExecutionResult>;
}
