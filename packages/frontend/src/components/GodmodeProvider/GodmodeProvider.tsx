import React from 'react';
import { GodmodeContext, useGodmodeLogic } from '../../hooks/useGodmode';

export interface GodmodeProviderProps {
    children: React.ReactNode;
}

/**
 * GodmodeProvider component that manages Godmode settings and pending actions.
 * Provides context to the entire application for instant access to actions.
 */
export const GodmodeProvider: React.FC<GodmodeProviderProps> = ({ children }) => {
    const godmodeLogic = useGodmodeLogic();

    return (
        <GodmodeContext.Provider value={godmodeLogic}>
            {children}
        </GodmodeContext.Provider>
    );
};

export default GodmodeProvider;
