import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const { mockGet, mockPost, mockVoice, mockAvatarState } = vi.hoisted(() => ({
    mockGet: vi.fn().mockResolvedValue({ data: { history: [] } }),
    mockPost: vi.fn(),
    mockVoice: {
        sendVoiceQuery: vi.fn(),
    },
    mockAvatarState: {
        animationState: 'idle',
        setAnimationState: vi.fn(),
        amplitude: 0,
        isVoiceActive: false,
        startListening: vi.fn(),
        stopListening: vi.fn(),
    }
}));

// Mock the dependencies BEFORE importing the components
vi.mock('../../utils/apiClient', () => ({
    api: {
        get: mockGet,
        post: mockPost,
    },
}));

vi.mock('../../hooks/useVoiceInteraction', () => ({
    useVoiceInteraction: vi.fn().mockReturnValue(mockVoice),
}));

vi.mock('../../hooks/useAvatarAnimationState', () => ({
    useAvatarAnimationState: vi.fn().mockReturnValue(mockAvatarState),
}));

// Mock THREE and WebGLRenderer
vi.mock('three', () => ({
    WebGLRenderer: class {
        setSize = vi.fn();
        setPixelRatio = vi.fn();
        render = vi.fn();
        dispose = vi.fn();
        domElement = document.createElement('canvas');
    },
    Scene: class { },
    PerspectiveCamera: class { },
    Clock: class { getDelta = () => 0.016 },
    BufferGeometry: class { setAttribute = vi.fn() },
    Points: class { },
    ShaderMaterial: class { },
    Float32BufferAttribute: class { },
    Color: class { },
    Vector3: class { set = vi.fn() },
    AdditiveBlending: 0,
}));

vi.mock('../../components/AmbientBackground/AmbientBackground', () => ({
    AmbientBackground: () => <div />
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Now import components
import { AskZenaPage } from './AskZenaPage';
import { AskZenaImmersive } from './AskZenaImmersive';
import { BrowserRouter } from 'react-router-dom';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>{children}</BrowserRouter>
);

describe('Ask Zena Blank Slate Invariants', () => {
    describe('AskZenaPage (Standard)', () => {
        it('should NOT show welcome section when messages are empty (Blank Slate)', () => {
            const { container } = render(<AskZenaPage />, { wrapper: Wrapper });
            const welcome = container.querySelector('.ask-zena-page__welcome');
            expect(welcome).toBeNull();
        });
    });

    describe('AskZenaImmersive', () => {
        it('should NOT show avatar or greetings initially (Blank Slate)', () => {
            const { container } = render(<AskZenaImmersive />, { wrapper: Wrapper });
            const greeting = container.querySelector('.ask-zena-page__greeting');
            const status = container.querySelector('.ask-zena-page__status-text');
            expect(greeting).toBeNull();
            expect(status).toBeNull();
        });

        it('should show input field ALWAYS', () => {
            render(<AskZenaImmersive />, { wrapper: Wrapper });
            const input = screen.getByPlaceholderText(/type your message/i);
            expect(input).toBeDefined();
        });
    });
});
