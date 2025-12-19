import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AskZenaPage } from './AskZenaPage';
import { AskZenaImmersive } from './AskZenaImmersive';
import { BrowserRouter } from 'react-router-dom';

// Mock the dependencies
vi.mock('../../utils/apiClient', () => ({
    api: {
        get: vi.fn().mockResolvedValue({ data: { history: [] } }),
        post: vi.fn(),
    },
}));

vi.mock('../../hooks/useVoiceInteraction', () => ({
    useVoiceInteraction: vi.fn().mockReturnValue({
        sendVoiceQuery: vi.fn(),
    }),
}));

vi.mock('../../hooks/useAvatarAnimationState', () => ({
    useAvatarAnimationState: vi.fn().mockReturnValue({
        animationState: 'idle',
        setAnimationState: vi.fn(),
        amplitude: 0,
        isVoiceActive: false,
        startListening: vi.fn(),
        stopListening: vi.fn(),
    }),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock THREE and WebGLRenderer
vi.mock('three', async () => {
    const actual = await vi.importActual('three');
    return {
        ...actual,
        WebGLRenderer: vi.fn().mockReturnValue({
            setSize: vi.fn(),
            setPixelRatio: vi.fn(),
            render: vi.fn(),
            dispose: vi.fn(),
            domElement: document.createElement('canvas'),
        }),
    };
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>{children}</BrowserRouter>
);

describe('Ask Zena Blank Slate Invariants', () => {
    describe('AskZenaPage (Standard)', () => {
        it('should NOT show welcome section when messages are empty (Blank Slate)', () => {
            const { queryByTestId, container } = render(<AskZenaPage />, { wrapper: Wrapper });

            // The implementation_plan says we remove the welcome section
            const welcome = container.querySelector('.ask-zena-page__welcome');
            expect(welcome).toBeNull();
        });
    });

    describe('AskZenaImmersive', () => {
        it('should NOT show avatar or greetings initially (Blank Slate)', () => {
            const { container } = render(<AskZenaImmersive />, { wrapper: Wrapper });

            const avatar = container.querySelector('.ask-zena-page__avatar-stage');
            // Based on plan, we hide contents of stage or stage itself
            // Let's check for specific children that should be hidden
            const greeting = container.querySelector('.ask-zena-page__greeting');
            const status = container.querySelector('.ask-zena-page__status-text');

            expect(greeting).toBeNull();
            expect(status).toBeNull();
        });

        it('should show input field ALWAYS', () => {
            render(<AskZenaImmersive />, { wrapper: Wrapper });
            const input = screen.getByPlaceholderText(/type your question/i);
            expect(input).toBeDefined();
        });
    });
});
