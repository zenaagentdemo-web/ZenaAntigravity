import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './PropertiesPage.css';

interface Property {
  id: string;
  address: string;
  milestones: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const PropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Property[] | { properties: Property[] }>('/api/properties');
      const propertiesData = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).properties || [];
      setProperties(propertiesData);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="properties-page">
        <div className="container">
          <h1 className="properties-page__title">Properties</h1>
          <div className="properties-page__loading">Loading properties...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="properties-page">
        <div className="container">
          <h1 className="properties-page__title">Properties</h1>
          <div className="properties-page__error">
            <p>{error}</p>
            <button onClick={loadProperties} className="properties-page__retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-page">
      <div className="container">
        <div className="properties-page__header">
          <div>
            <h1 className="properties-page__title">Properties</h1>
            <p className="properties-page__description">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            </p>
          </div>
          <button onClick={loadProperties} className="properties-page__refresh-btn">
            Refresh
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="properties-page__empty">
            <p>No properties found.</p>
          </div>
        ) : (
          <div className="properties-page__list">
            {properties.map(property => (
              <div
                key={property.id}
                className="property-card"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <h3 className="property-card__address">{property.address}</h3>

                {property.milestones && property.milestones.length > 0 && (
                  <div className="property-card__milestones">
                    <span className="property-card__milestone-label">
                      {property.milestones.length} {property.milestones.length === 1 ? 'milestone' : 'milestones'}
                    </span>
                    <span className="property-card__milestone-latest">
                      Latest: {property.milestones[property.milestones.length - 1].title}
                    </span>
                  </div>
                )}

                <div className="property-card__footer">
                  <span className="property-card__date">
                    Added {formatDate(property.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
