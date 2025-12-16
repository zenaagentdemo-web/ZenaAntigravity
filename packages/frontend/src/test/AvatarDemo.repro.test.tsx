import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarDemoPage } from '../pages/AvatarDemoPage/AvatarDemoPage';
import { BrowserRouter } from 'react-router-dom';

describe('AvatarDemoPage Reproduction', () => {
    it('renders without crashing', () => {
        render(
            <BrowserRouter>
                <AvatarDemoPage />
            </BrowserRouter>
        );

        // Check for the main heading
        expect(screen.getByText('Avatar Animation Prototype')).toBeDefined();

        // Check for the avatar image (by alt text)
        expect(screen.getByAltText('Zena AI Avatar')).toBeDefined();

        // Check for the button
        expect(screen.getByText('Press and Hold to Speak')).toBeDefined();
    });
});
