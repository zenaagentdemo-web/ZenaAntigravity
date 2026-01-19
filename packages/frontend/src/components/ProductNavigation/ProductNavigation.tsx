
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductNavigation.css';

export interface ProductButtonInfo {
    label: string;
    path: string;
    id: string;
}

interface ProductNavigationProps {
    buttons: ProductButtonInfo[];
}

export const ProductNavigation: React.FC<ProductNavigationProps> = ({ buttons }) => {
    const navigate = useNavigate();

    if (buttons.length === 0) return null;

    return (
        <div className="product-navigation">
            {buttons.map((btn, i) => (
                <button
                    key={i}
                    className="product-button"
                    onClick={() => navigate(btn.path)}
                >
                    <span className="product-button__icon">✨</span>
                    {btn.label}
                </button>
            ))}

            <button
                className="back-to-zena"
                onClick={() => navigate('/ask')}
            >
                ← Back to Zena
            </button>
        </div>
    );
};
