import React, { useEffect, useState } from 'react';
import { api } from '../../utils/apiClient';
import './ExportProgress.css';

interface ExportProgressProps {
  exportId: string;
  onComplete: (downloadUrl: string) => void;
  onError: (error: string) => void;
}

interface ExportStatus {
  id: string;
  type: 'contacts' | 'properties' | 'deals';
  format: 'csv' | 'xlsx' | 'vcard';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  recordCount?: number;
  error?: string;
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
  exportId,
  onComplete,
  onError,
}) => {
  const [status, setStatus] = useState<ExportStatus | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await api.get<ExportStatus>(`/api/export/${exportId}`);
        const exportStatus = response.data;
        setStatus(exportStatus);

        // Update progress based on status
        if (exportStatus.status === 'pending') {
          setProgress(10);
        } else if (exportStatus.status === 'processing') {
          setProgress(50);
        } else if (exportStatus.status === 'completed') {
          setProgress(100);
          if (exportStatus.fileUrl) {
            onComplete(exportStatus.fileUrl);
          }
          clearInterval(pollInterval);
        } else if (exportStatus.status === 'failed') {
          onError(exportStatus.error || 'Export failed');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to check export status:', error);
        onError('Failed to check export status');
        clearInterval(pollInterval);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(checkStatus, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [exportId, onComplete, onError]);

  if (!status) {
    return (
      <div className="export-progress">
        <div className="export-progress__spinner" />
        <p className="export-progress__text">Initializing export...</p>
      </div>
    );
  }

  const getStatusText = () => {
    switch (status.status) {
      case 'pending':
        return 'Preparing export...';
      case 'processing':
        return `Processing ${status.recordCount || 0} records...`;
      case 'completed':
        return 'Export completed!';
      case 'failed':
        return 'Export failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="export-progress">
      <div className="export-progress__bar-container">
        <div
          className="export-progress__bar"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="export-progress__text">{getStatusText()}</p>
      {status.status === 'processing' && (
        <p className="export-progress__subtext">This may take a few moments...</p>
      )}
    </div>
  );
};
