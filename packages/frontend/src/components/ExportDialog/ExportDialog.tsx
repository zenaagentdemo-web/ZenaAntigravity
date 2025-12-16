import React, { useState } from 'react';
import './ExportDialog.css';

export type ExportType = 'contacts' | 'properties' | 'deals';
export type ExportFormat = 'csv' | 'xlsx' | 'vcard';

interface ExportDialogProps {
  isOpen: boolean;
  exportType: ExportType;
  onClose: () => void;
  onExport: (format: ExportFormat, selectedIds?: string[]) => Promise<void>;
  availableRecords?: Array<{ id: string; label: string }>;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  exportType,
  onClose,
  onExport,
  availableRecords = [],
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectiveExport, setSelectiveExport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const getAvailableFormats = (): ExportFormat[] => {
    if (exportType === 'contacts') {
      return ['csv', 'xlsx', 'vcard'];
    }
    return ['csv', 'xlsx'];
  };

  const getFormatLabel = (format: ExportFormat): string => {
    switch (format) {
      case 'csv':
        return 'CSV (Comma-Separated Values)';
      case 'xlsx':
        return 'Excel (XLSX)';
      case 'vcard':
        return 'vCard (Contact Cards)';
    }
  };

  const getExportTypeLabel = (): string => {
    switch (exportType) {
      case 'contacts':
        return 'Contacts';
      case 'properties':
        return 'Properties';
      case 'deals':
        return 'Deals';
    }
  };

  const handleToggleRecord = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === availableRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableRecords.map((r) => r.id)));
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const idsToExport = selectiveExport && selectedIds.size > 0 
        ? Array.from(selectedIds) 
        : undefined;
      await onExport(selectedFormat, idsToExport);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const availableFormats = getAvailableFormats();

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog__header">
          <h2 className="export-dialog__title">Export {getExportTypeLabel()}</h2>
          <button className="export-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="export-dialog__content">
          {/* Format Selection */}
          <div className="export-dialog__section">
            <h3 className="export-dialog__section-title">Select Format</h3>
            <div className="export-dialog__formats">
              {availableFormats.map((format) => (
                <label key={format} className="export-dialog__format-option">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={selectedFormat === format}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                  />
                  <span className="export-dialog__format-label">
                    {getFormatLabel(format)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Selective Export */}
          {availableRecords.length > 0 && (
            <div className="export-dialog__section">
              <label className="export-dialog__checkbox">
                <input
                  type="checkbox"
                  checked={selectiveExport}
                  onChange={(e) => {
                    setSelectiveExport(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedIds(new Set());
                    }
                  }}
                />
                <span>Export only selected records</span>
              </label>

              {selectiveExport && (
                <div className="export-dialog__records">
                  <div className="export-dialog__records-header">
                    <button
                      className="export-dialog__select-all"
                      onClick={handleSelectAll}
                    >
                      {selectedIds.size === availableRecords.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                    <span className="export-dialog__selected-count">
                      {selectedIds.size} of {availableRecords.length} selected
                    </span>
                  </div>

                  <div className="export-dialog__records-list">
                    {availableRecords.map((record) => (
                      <label key={record.id} className="export-dialog__record-item">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => handleToggleRecord(record.id)}
                        />
                        <span>{record.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Info */}
          <div className="export-dialog__info">
            <p>
              {selectiveExport && selectedIds.size > 0
                ? `${selectedIds.size} ${getExportTypeLabel().toLowerCase()} will be exported.`
                : `All ${getExportTypeLabel().toLowerCase()} will be exported.`}
            </p>
          </div>
        </div>

        <div className="export-dialog__footer">
          <button
            className="button button--secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            className="button button--primary"
            onClick={handleExport}
            disabled={isExporting || (selectiveExport && selectedIds.size === 0)}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};
