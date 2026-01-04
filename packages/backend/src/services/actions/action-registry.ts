import { ActionType } from '../godmode.service.js';
import { ActionStrategy } from './types.js';

class ActionStrategyRegistry {
    private strategies: Map<string, ActionStrategy> = new Map();

    register(strategy: ActionStrategy) {
        this.strategies.set(strategy.actionType, strategy);
        console.log(`[ActionRegistry] Registered strategy for ${strategy.actionType}`);
    }

    getStrategy(actionType: ActionType): ActionStrategy | undefined {
        return this.strategies.get(actionType);
    }

    getAllStrategies(): ActionStrategy[] {
        return Array.from(this.strategies.values());
    }
}

export const actionRegistry = new ActionStrategyRegistry();
