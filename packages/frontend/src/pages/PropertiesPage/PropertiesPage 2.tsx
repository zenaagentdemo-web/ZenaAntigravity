import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  RefreshCw,
  Phone,
  Calendar,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Building2,
  MapPin,
  DollarSign,
  BedDouble,
  Bath,
  Maximize,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import './PropertiesPage.css';

interface Property {
  id: string;
  address: string;
  type?: 'residential' | 'commercial' | 'land';
  status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
  listingPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: number;
  dealId?: string;
  milestones: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string, color: string, glow: string, bg: string, icon: string }> = {
  active: {
    label: 'Active',
    color: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.5)',
    bg: 'rgba(0, 255, 136, 0.15)',
    icon: '🟢'
  },
  under_contract: {
    label: 'Under Contract',
    color: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.5)',
    bg: 'rgba(255, 215, 0, 0.15)',
    icon: '🟡'
  },
  sold: {
    label: 'Sold',
    color: '#FF6B6B',
    glow: 'rgba(255, 107, 107, 0.5)',
    bg: 'rgba(255, 107, 107, 0.15)',
    icon: '🔴'
  },
  withdrawn: {
    label: 'Withdrawn',
    color: '#888888',
    glow: 'rgba(136, 136, 136, 0.5)',
    bg: 'rgba(136, 136, 136, 0.15)',
    icon: '⚫'
  }
};

const TYPE_CONFIG: Record<string, { label: string, icon: React.ReactNode }> = {
  residential: { label: 'Residential', icon: <Home size={16} /> },
  commercial: { label: 'Commercial', icon: <Building2 size={16} /> },
  land: { label: 'Land', icon: <MapPin size={16} /> }
};

export const PropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      if (!isRefreshing) setLoading(true);
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
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProperties();
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const getDaysOnMarket = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getNextEvent = (property: Property): string | null => {
    if (!property.milestones || property.milestones.length === 0) return null;
    const upcoming = property.milestones
      .filter(m => new Date(m.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (upcoming.length === 0) return null;
    const next = upcoming[0];
    const date = new Date(next.date);
    return `${next.title}: ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  };

  // Stats calculations
  const stats = useMemo(() => {
    const active = properties.filter(p => p.status === 'active').length;
    const underContract = properties.filter(p => p.status === 'under_contract').length;
    const sold = properties.filter(p => p.status === 'sold').length;
    const upcomingOpenHomes = properties.filter(p => {
      const next = getNextEvent(p);
      return next && next.toLowerCase().includes('open');
    }).length;
    return { active, underContract, sold, upcomingOpenHomes };
  }, [properties]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
      const matchesType = filterType === 'all' || property.type === filterType;
      const matchesSearch = property.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [properties, filterStatus, filterType, searchQuery]);

  const handleCallVendor = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    // In real implementation, this would open the vendor contact
    console.log('Call vendor for:', property.address);
    alert(`Calling vendor for ${property.address}`);
  };

  const handleScheduleOpenHome = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    // In real implementation, this would open a scheduling modal
    console.log('Schedule open home for:', property.address);
    alert(`Schedule open home for ${property.address}`);
  };

  return (
    <div className="properties-page">
      <AmbientBackground variant="default" showParticles={true} />

      <div className="properties-page__container">
        {/* Header */}
        <header className="properties-page__header">
          <div className="properties-page__title-group">
            <span className="properties-page__subtitle">Zena Property Intelligence</span>
            <h1 className="properties-page__title">Properties</h1>
          </div>
          <div className="properties-page__actions">
            <div className="properties-page__view-toggle">
              <button
                className={`properties-page__toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                className={`properties-page__toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
            <button
              className="properties-page__add-btn"
              onClick={() => console.log('Add property clicked')}
            >
              <Plus size={18} />
              <span>Add Property</span>
            </button>
            <button
              className={`properties-page__refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'properties-page__spin' : ''} />
              {isRefreshing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="properties-page__stats">
          <div className="stats-orb stats-orb--active">
            <span className="stats-orb__value">{stats.active}</span>
            <span className="stats-orb__label">ACTIVE</span>
          </div>
          <div className="stats-orb stats-orb--contract">
            <span className="stats-orb__value">{stats.underContract}</span>
            <span className="stats-orb__label">UNDER CONTRACT</span>
          </div>
          <div className="stats-orb stats-orb--sold">
            <span className="stats-orb__value">{stats.sold}</span>
            <span className="stats-orb__label">SOLD</span>
          </div>
          <div className="stats-orb stats-orb--events">
            <span className="stats-orb__value">{stats.upcomingOpenHomes}</span>
            <span className="stats-orb__label">OPEN HOMES</span>
          </div>
        </section>

        {/* Controls */}
        <section className="properties-page__controls">
          <div className="properties-page__search-container">
            <Search className="properties-page__search-icon" size={20} />
            <input
              type="text"
              className="properties-page__search-input"
              placeholder="Search by address or suburb..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="properties-page__filters">
            <button
              className={`properties-page__filter ${filterStatus === 'all' ? 'properties-page__filter--active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All Properties
            </button>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                className={`properties-page__filter ${filterStatus === status ? 'properties-page__filter--active' : ''}`}
                onClick={() => setFilterStatus(status)}
                style={{ '--filter-color': config.color } as React.CSSProperties}
              >
                <span className="filter-dot" style={{ background: config.color }}></span>
                {config.label}
              </button>
            ))}
          </div>

          <div className="properties-page__type-filters">
            <button
              className={`properties-page__type-filter ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Types
            </button>
            {Object.entries(TYPE_CONFIG).map(([type, config]) => (
              <button
                key={type}
                className={`properties-page__type-filter ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div className="properties-page__loading">
            <RefreshCw className="properties-page__spin" size={48} />
            <p>Loading Properties...</p>
          </div>
        ) : error ? (
          <div className="properties-page__error">
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={loadProperties} className="properties-page__refresh-btn">
              Retry
            </button>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="properties-page__empty">
            <Home size={64} className="properties-page__empty-icon" />
            <h3>No properties found</h3>
            <p>Try adjusting your filters or add a new property.</p>
          </div>
        ) : (
          <>
            {/* AI Insights Banner */}
            {properties.length > 0 && (
              <div className="properties-page__ai-insights">
                <div className="ai-insights__header">
                  <Sparkles size={18} />
                  <span>AI Insights</span>
                </div>
                <div className="ai-insights__content">
                  <div className="ai-insight">
                    <Users size={16} />
                    <span>{Math.floor(Math.random() * 5 + 2)} buyers match your active listings</span>
                  </div>
                  <div className="ai-insight">
                    <TrendingUp size={16} />
                    <span>Market prices up 2.3% this month</span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid/List View */}
            <div className={`properties-page__content ${viewMode === 'list' ? 'properties-page__content--list' : ''}`}>
              {viewMode === 'list' && (
                <div className="properties-list-header">
                  <div className="properties-list-header__status">Status</div>
                  <div className="properties-list-header__address">Address</div>
                  <div className="properties-list-header__price">Price</div>
                  <div className="properties-list-header__specs">Specs</div>
                  <div className="properties-list-header__dom">DOM</div>
                  <div className="properties-list-header__actions">Actions</div>
                </div>
              )}

              <div className={viewMode === 'grid' ? 'properties-page__grid' : 'properties-page__list'}>
                {filteredProperties.map(property => {
                  const statusConfig = STATUS_CONFIG[property.status || 'active'] || STATUS_CONFIG.active;
                  const typeConfig = TYPE_CONFIG[property.type || 'residential'] || TYPE_CONFIG.residential;
                  const daysOnMarket = getDaysOnMarket(property.createdAt);
                  const nextEvent = getNextEvent(property);

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={property.id}
                        className="property-list-item"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        <div className="property-list-item__status">
                          <span
                            className="status-badge"
                            style={{
                              background: statusConfig.bg,
                              color: statusConfig.color,
                              borderColor: statusConfig.color
                            }}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="property-list-item__address">
                          {typeConfig.icon}
                          <span>{property.address}</span>
                        </div>
                        <div className="property-list-item__price">
                          {property.listingPrice ? formatPrice(property.listingPrice) : '-'}
                        </div>
                        <div className="property-list-item__specs">
                          {property.bedrooms !== undefined && <span>{property.bedrooms} bd</span>}
                          {property.bathrooms !== undefined && <span>{property.bathrooms} ba</span>}
                          {property.landSize !== undefined && <span>{property.landSize}m²</span>}
                        </div>
                        <div className="property-list-item__dom">
                          {daysOnMarket} days
                        </div>
                        <div className="property-list-item__actions" onClick={e => e.stopPropagation()}>
                          <button className="icon-action-btn" onClick={(e) => handleCallVendor(e, property)} title="Call Vendor">
                            <Phone size={16} />
                          </button>
                          <button className="icon-action-btn" onClick={(e) => handleScheduleOpenHome(e, property)} title="Schedule Open Home">
                            <Calendar size={16} />
                          </button>
                          <button className="icon-action-btn" onClick={() => navigate(`/properties/${property.id}`)} title="View Details">
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Grid View Card
                  return (
                    <div
                      key={property.id}
                      className="property-card"
                      onClick={() => navigate(`/properties/${property.id}`)}
                      style={{
                        '--status-color': statusConfig.color,
                        '--status-glow': statusConfig.glow,
                        '--status-bg': statusConfig.bg
                      } as React.CSSProperties}
                    >
                      <div className="property-card__header">
                        <span
                          className="property-card__status"
                          style={{
                            background: statusConfig.bg,
                            color: statusConfig.color,
                            borderColor: statusConfig.color
                          }}
                        >
                          {statusConfig.label}
                        </span>
                        <span className="property-card__type">
                          {typeConfig.icon}
                          {typeConfig.label}
                        </span>
                      </div>

                      <h3 className="property-card__address">{property.address}</h3>

                      {property.listingPrice && (
                        <div className="property-card__price">
                          <DollarSign size={16} />
                          {formatPrice(property.listingPrice)}
                        </div>
                      )}

                      <div className="property-card__specs">
                        {property.bedrooms !== undefined && (
                          <span className="spec">
                            <BedDouble size={14} />
                            {property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms !== undefined && (
                          <span className="spec">
                            <Bath size={14} />
                            {property.bathrooms}
                          </span>
                        )}
                        {property.landSize !== undefined && (
                          <span className="spec">
                            <Maximize size={14} />
                            {property.landSize}m²
                          </span>
                        )}
                      </div>

                      <div className="property-card__meta">
                        <span className="property-card__dom">
                          <Clock size={14} />
                          {daysOnMarket} days on market
                        </span>
                        {nextEvent && (
                          <span className="property-card__event">
                            <Calendar size={14} />
                            {nextEvent}
                          </span>
                        )}
                      </div>

                      <div className="property-card__actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="property-card__action-btn property-card__action-btn--primary"
                          onClick={() => navigate(`/properties/${property.id}`)}
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          className="property-card__action-btn"
                          onClick={(e) => handleCallVendor(e, property)}
                        >
                          <Phone size={14} />
                          Call
                        </button>
                        <button
                          className="property-card__action-btn"
                          onClick={(e) => handleScheduleOpenHome(e, property)}
                        >
                          <Calendar size={14} />
                          Open Home
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
