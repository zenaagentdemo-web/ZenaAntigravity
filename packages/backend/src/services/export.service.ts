import prisma from '../config/database.js';

export interface ExportOptions {
  userId: string;
  type: 'contacts' | 'properties' | 'deals';
  format: 'csv' | 'xlsx' | 'vcard';
  recordIds?: string[]; // For selective export
}

export interface ExportResult {
  id: string;
  fileUrl: string;
  content?: string | null;
  recordCount: number;
  status: 'completed' | 'failed';
  error?: string;
}

/**
 * Export service for generating CSV, Excel, and vCard exports
 * of contacts, properties, and deals
 */
export class ExportService {
  /**
   * Create a new export job
   */
  async createExport(options: ExportOptions): Promise<string> {
    const { userId, type, format, recordIds } = options;

    // Validate format for type
    if (type === 'contacts' && format === 'vcard') {
      // vCard is only valid for contacts
    } else if (format === 'vcard') {
      throw new Error('vCard format is only supported for contacts');
    }

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        userId,
        type,
        format,
        fileUrl: '', // Will be updated after generation
        recordCount: 0,
        status: 'pending',
      },
    });

    // Start export generation asynchronously
    this.generateExport(exportRecord.id, options).catch(error => {
      console.error(`Export generation failed for ${exportRecord.id}:`, error);
      // Update status to failed
      prisma.export.update({
        where: { id: exportRecord.id },
        data: { status: 'failed' },
      }).catch(console.error);
    });

    return exportRecord.id;
  }

  /**
   * Get export status and download URL
   */
  async getExport(exportId: string, userId: string): Promise<ExportResult> {
    const exportRecord = await prisma.export.findFirst({
      where: {
        id: exportId,
        userId,
      },
    });

    if (!exportRecord) {
      throw new Error('Export not found');
    }

    return {
      id: exportRecord.id,
      fileUrl: exportRecord.fileUrl,
      content: exportRecord.content,
      recordCount: exportRecord.recordCount,
      status: exportRecord.status as 'completed' | 'failed',
    };
  }

  /**
   * Generate export file
   */
  private async generateExport(exportId: string, options: ExportOptions): Promise<void> {
    const { userId, type, format, recordIds } = options;

    // Update status to processing
    await prisma.export.update({
      where: { id: exportId },
      data: { status: 'processing' },
    });

    try {
      let fileContent: string;
      let recordCount: number;

      switch (type) {
        case 'contacts':
          if (format === 'vcard') {
            const result = await this.exportContactsVCard(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          } else if (format === 'csv') {
            const result = await this.exportContactsCSV(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          } else {
            const result = await this.exportContactsExcel(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          }
          break;

        case 'properties':
          if (format === 'csv') {
            const result = await this.exportPropertiesCSV(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          } else {
            const result = await this.exportPropertiesExcel(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          }
          break;

        case 'deals':
          if (format === 'csv') {
            const result = await this.exportDealsCSV(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          } else {
            const result = await this.exportDealsExcel(userId, recordIds);
            fileContent = result.content;
            recordCount = result.count;
          }
          break;

        default:
          throw new Error(`Unsupported export type: ${type}`);
      }

      // In a real implementation, this would upload to S3
      // For now, we'll store as a data URL or file path
      const fileUrl = this.storeExportFile(exportId, fileContent, format);

      // Update export record with completion
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: 'completed',
          fileUrl,
          content: fileContent,
          recordCount,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Export generation error:', error);
      await prisma.export.update({
        where: { id: exportId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  /**
   * Create a simulated market report (PDF)
   */
  async createMarketReport(userId: string, address: string): Promise<string> {
    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        userId,
        type: 'properties',
        format: 'xlsx', // Using xlsx as proxy for pdf in this system
        fileUrl: '',
        recordCount: 1,
        status: 'pending',
      },
    });

    // Simulate delay for generation
    setTimeout(async () => {
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: {
          status: 'completed',
          fileUrl: `/api/export/${exportRecord.id}/download`,
          completedAt: new Date(),
        },
      });
    }, 2000);

    return exportRecord.id;
  }

  /**
   * Export contacts as CSV with universal column names
   * These column names are designed to be auto-detected by CRM import wizards
   * (Rex Software, MRI Vault, Palace, etc.)
   */
  private async exportContactsCSV(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    const contacts = await this.fetchContacts(userId, recordIds);

    // Update lastCrmExportAt for these contacts to track deltas
    if (contacts.length > 0) {
      await prisma.contact.updateMany({
        where: {
          id: { in: contacts.map(c => c.id) }
        },
        data: {
          lastCrmExportAt: new Date()
        }
      });
    }

    // Universal CSV headers - designed for CRM auto-detection
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Mobile',
      'Phone Work',
      'Contact Type',
      'Company',
      'Street Address',
      'Suburb',
      'City',
      'Notes',
    ];

    // CSV rows
    const rows = contacts.map(contact => {
      // Split name into first/last (best effort)
      const nameParts = (contact.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Get primary email and phone
      const primaryEmail = contact.emails[0] || '';
      const phones = contact.phones || [];
      const mobile = phones.find(p => p.includes('02') || p.includes('04')) || phones[0] || '';
      const workPhone = phones.find(p => p !== mobile) || '';

      // Get associated property address for context
      const properties = [
        ...contact.vendorProperties.map(p => p.address),
        ...contact.buyerProperties.map(p => p.address),
      ];
      const streetAddress = properties[0] || '';

      // Parse suburb/city from address if possible
      const addressParts = streetAddress.split(',').map(s => s.trim());
      const suburb = addressParts[1] || '';
      const city = addressParts[2] || '';

      // Combine notes
      const notes = (contact.relationshipNotes as any[])
        .map(note => note.content)
        .join(' | ');

      return [
        this.escapeCSV(firstName),
        this.escapeCSV(lastName),
        this.escapeCSV(primaryEmail),
        this.escapeCSV(mobile),
        this.escapeCSV(workPhone),
        this.escapeCSV(contact.role || 'Contact'),
        this.escapeCSV(''), // Company - empty for now
        this.escapeCSV(streetAddress),
        this.escapeCSV(suburb),
        this.escapeCSV(city),
        this.escapeCSV(notes),
      ];
    });

    // Build CSV content
    const csvLines = [headers, ...rows];
    const content = csvLines.map(row => row.join(',')).join('\n');

    return { content, count: contacts.length };
  }

  /**
   * Export contacts as Excel (XLSX)
   */
  private async exportContactsExcel(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    // For now, return CSV format
    // In production, use a library like 'exceljs' to generate actual XLSX
    return this.exportContactsCSV(userId, recordIds);
  }

  /**
   * Export contacts as vCard
   */
  private async exportContactsVCard(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    const contacts = await this.fetchContacts(userId, recordIds);

    const vcards = contacts.map(contact => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

      // Name
      lines.push(`FN:${contact.name}`);
      lines.push(`N:${contact.name};;;;`);

      // Emails
      contact.emails.forEach((email, index) => {
        const type = index === 0 ? 'WORK' : 'HOME';
        lines.push(`EMAIL;TYPE=${type}:${email}`);
      });

      // Phones
      contact.phones.forEach((phone, index) => {
        const type = index === 0 ? 'WORK' : 'CELL';
        lines.push(`TEL;TYPE=${type}:${phone}`);
      });

      // Role as organization
      lines.push(`ORG:${contact.role}`);

      // Notes
      const notes = (contact.relationshipNotes as any[])
        .map(note => note.content)
        .join('\\n');
      if (notes) {
        lines.push(`NOTE:${notes.replace(/\n/g, '\\n')}`);
      }

      lines.push('END:VCARD');

      return lines.join('\n');
    });

    const content = vcards.join('\n\n');

    return { content, count: contacts.length };
  }

  /**
   * Export properties as CSV with universal column names
   * These column names are designed to be auto-detected by CRM import wizards
   */
  private async exportPropertiesCSV(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    const properties = await this.fetchProperties(userId, recordIds);

    // Universal CSV headers for property/listing import
    const headers = [
      'Street Address',
      'Suburb',
      'City',
      'Postcode',
      'Property Type',
      'Bedrooms',
      'Bathrooms',
      'Listing Status',
      'Price Guide',
      'Vendor Name',
      'Vendor Email',
      'Vendor Mobile',
      'Agent Notes',
    ];

    // CSV rows
    const rows = properties.map(property => {
      // Parse address into components
      const addressParts = (property.address || '').split(',').map(s => s.trim());
      const streetAddress = addressParts[0] || property.address || '';
      const suburb = addressParts[1] || '';
      const city = addressParts[2] || '';

      // Get primary vendor
      const primaryVendor = property.vendors[0];
      const vendorName = primaryVendor?.name || '';
      const vendorEmail = primaryVendor?.emails?.[0] || '';
      const vendorMobile = primaryVendor?.phones?.[0] || '';

      // Get listing status from deals
      const stage = property.deals[0]?.stage || 'Active';

      // Combine milestones and risk into notes
      const milestones = (property.milestones as any[] || [])
        .map(m => `${m.type}: ${new Date(m.date).toLocaleDateString()}`)
        .join('; ');
      const notes = [milestones, property.riskOverview].filter(Boolean).join(' | ');

      return [
        this.escapeCSV(streetAddress),
        this.escapeCSV(suburb),
        this.escapeCSV(city),
        this.escapeCSV(''), // Postcode - empty for now
        this.escapeCSV('Residential'), // Property type - default
        this.escapeCSV(''), // Bedrooms - not in current model
        this.escapeCSV(''), // Bathrooms - not in current model
        this.escapeCSV(stage),
        this.escapeCSV(''), // Price guide - not in current model
        this.escapeCSV(vendorName),
        this.escapeCSV(vendorEmail),
        this.escapeCSV(vendorMobile),
        this.escapeCSV(notes),
      ];
    });

    // Build CSV content
    const csvLines = [headers, ...rows];
    const content = csvLines.map(row => row.join(',')).join('\n');

    // Update the lastCrmExportAt timestamp for the exported records
    const propertyIds = properties.map(p => p.id);
    await prisma.property.updateMany({
      where: {
        id: { in: propertyIds }
      },
      data: {
        lastCrmExportAt: new Date()
      }
    });

    return { content, count: properties.length };
  }

  /**
   * Export properties as Excel (XLSX)
   */
  private async exportPropertiesExcel(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    // For now, return CSV format
    // In production, use a library like 'exceljs' to generate actual XLSX
    return this.exportPropertiesCSV(userId, recordIds);
  }

  /**
   * Export deals as CSV
   */
  private async exportDealsCSV(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    const deals = await this.fetchDeals(userId, recordIds);

    // CSV header
    const headers = [
      'Property Address',
      'Stage',
      'Participants',
      'Next Action',
      'Next Action Owner',
      'Risk Level',
      'Risk Flags',
      'Timeline Summary',
      'Created Date',
      'Updated Date',
    ];

    // CSV rows
    const rows = deals.map(deal => {
      const propertyAddress = deal.property?.address || 'N/A';
      const participants = deal.contacts.map(c => c.name).join('; ');
      const riskFlags = deal.riskFlags.join('; ');

      return [
        this.escapeCSV(propertyAddress),
        this.escapeCSV(deal.stage),
        this.escapeCSV(participants),
        this.escapeCSV(deal.nextAction || ''),
        this.escapeCSV(deal.nextActionOwner),
        this.escapeCSV(deal.riskLevel),
        this.escapeCSV(riskFlags),
        this.escapeCSV(deal.summary),
        this.escapeCSV(deal.createdAt.toISOString()),
        this.escapeCSV(deal.updatedAt.toISOString()),
      ];
    });

    // Build CSV content
    const csvLines = [headers, ...rows];
    const content = csvLines.map(row => row.join(',')).join('\n');

    return { content, count: deals.length };
  }

  /**
   * Export deals as Excel (XLSX)
   */
  private async exportDealsExcel(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    // For now, return CSV format
    // In production, use a library like 'exceljs' to generate actual XLSX
    return this.exportDealsCSV(userId, recordIds);
  }

  /**
   * Fetch contacts with related data
   */
  private async fetchContacts(userId: string, recordIds?: string[]) {
    return prisma.contact.findMany({
      where: {
        userId,
        ...(recordIds && recordIds.length > 0 ? { id: { in: recordIds } } : {}),
      },
      include: {
        vendorProperties: true,
        buyerProperties: true,
      },
    });
  }

  /**
   * Fetch properties with related data
   */
  private async fetchProperties(userId: string, recordIds?: string[]) {
    return prisma.property.findMany({
      where: {
        userId,
        ...(recordIds && recordIds.length > 0 ? { id: { in: recordIds } } : {}),
      },
      include: {
        vendors: true,
        buyers: true,
        deals: true,
      },
    });
  }

  /**
   * Fetch deals with related data
   */
  private async fetchDeals(userId: string, recordIds?: string[]) {
    return prisma.deal.findMany({
      where: {
        userId,
        ...(recordIds && recordIds.length > 0 ? { id: { in: recordIds } } : {}),
      },
      include: {
        property: true,
        contacts: true,
      },
    });
  }

  /**
   * Escape CSV field value
   */
  private escapeCSV(value: string): string {
    if (!value) return '';

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  /**
   * Store export file (placeholder for S3 upload)
   */
  private storeExportFile(exportId: string, content: string, format: string): string {
    // In production, this would upload to S3 and return the URL
    // For now, return a placeholder URL
    return `/api/export/${exportId}/download`;
  }
}

export const exportService = new ExportService();
