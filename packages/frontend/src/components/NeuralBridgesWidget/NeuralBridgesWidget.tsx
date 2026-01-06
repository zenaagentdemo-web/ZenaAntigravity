import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Cloud, Mail, Calendar } from 'lucide-react';
import './NeuralBridgesWidget.css';

interface BridgeStatus {
  id: string;
  name: string;
  status: 'active' | 'syncing' | 'offline';
  icon: React.ReactNode;
}

export const NeuralBridgesWidget: React.FC = () => {
  const navigate = useNavigate();

  const bridges: BridgeStatus[] = [
    { id: 'crm', name: 'CRM', status: 'active', icon: <Users size={16} /> },
    { id: 'storage', name: 'Storage', status: 'active', icon: <Cloud size={16} /> },
    { id: 'communication', name: 'Email', status: 'syncing', icon: <Mail size={16} /> },
    { id: 'calendar', name: 'Calendar', status: 'active', icon: <Calendar size={16} /> }
  ];

  return (
    <div className="neural-bridges-widget" onClick={() => navigate('/connections')}>
      <div className="neural-bridges-widget__glow" />

      <div className="neural-bridges-widget__header">
        <div className="neural-bridges-widget__header-top">
          <h3 className="neural-bridges-widget__title">Smart Connections</h3>
        </div>
        <p className="neural-bridges-widget__description">
          Securely export contacts & property data to your CRM and unify your storage, communication, and calendar intelligence.
        </p>
      </div>

      <div className="neural-bridges-widget__mini-grid">
        {bridges.map(bridge => (
          <div key={bridge.id} className={`mini-bridge-item mini-bridge-item--${bridge.status}`}>
            <span className="mini-bridge-item__icon">{bridge.icon}</span>
          </div>
        ))}
      </div>

      <div className="neural-bridges-widget__footer">
        TAP TO SYNC DATA
      </div>
    </div>
  );
};
