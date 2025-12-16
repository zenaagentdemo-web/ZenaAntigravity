import { useState, useCallback } from 'react';
import { Expression } from './constants';

interface ExpressionState {
    currentExpression: Expression;
    setExpression: (expression: Expression) => void;
}

interface UseExpressionsOptions {
    initialExpression?: Expression;
}

/**
 * Hook for managing facial expressions with smooth transitions
 */
export function useExpressions({
    initialExpression = 'neutral'
}: UseExpressionsOptions = {}): ExpressionState {
    const [currentExpression, setCurrentExpression] = useState<Expression>(initialExpression);

    const setExpression = useCallback((expression: Expression) => {
        // Could add transition animation here if needed
        setCurrentExpression(expression);
    }, []);

    return { currentExpression, setExpression };
}

/**
 * Get CSS class modifiers for expression
 */
export function getExpressionClasses(expression: Expression): string {
    return `zena-animated--${expression}`;
}
