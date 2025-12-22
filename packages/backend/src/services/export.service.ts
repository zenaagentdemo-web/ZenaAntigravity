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
   * Export contacts as CSV
   */
  private async exportContactsCSV(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    const contacts = await this.fetchContacts(userId, recordIds);

    // CSV header
    const headers = [
      'Name',
      'Email Addresses',
      'Phone Numbers',
      'Role',
      'Associated Properties',
      'Relationship Notes',
    ];

    // CSV rows
    const rows = contacts.map(contact => {
      const emails = contact.emails.join('; ');
      const phones = contact.phones.join('; ');
      const properties = [
        ...contact.vendorProperties.map(p => p.address),
        ...contact.buyerProperties.map(p => p.address),
      ].join('; ');
      const notes = (contact.relationshipNotes as any[])
        .map(note => note.content)
        .join(' | ');

      return [
        this.escapeCSV(contact.name),
        this.escapeCSV(emails),
        this.escapeCSV(phones),
        this.escapeCSV(contact.role),
        this.escapeCSV(properties),
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
   * Export properties as CSV
   */
  private async exportPropertiesCSV(
    userId: string,
    recordIds?: string[]
  ): Promise<{ content: string; count: number }> {
    const properties = await this.fetchProperties(userId, recordIds);

    // CSV header
    const headers = [
      'Address',
      'Vendor Names',
      'Vendor Emails',
      'Associated Contacts',
      'Stage',
      'Campaign Milestones',
      'Risk Overview',
    ];

    // CSV rows
    const rows = properties.map(property => {
      const vendorNames = property.vendors.map(v => v.name).join('; ');
      const vendorEmails = property.vendors
        .flatMap(v => v.emails)
        .join('; ');
      const contactNames = [
        ...property.vendors.map(v => v.name),
        ...property.buyers.map(b => b.name),
      ].join('; ');

      const stage = property.deals[0]?.stage || 'N/A';

      const milestones = (property.milestones as any[])
        .map(m => `${m.type}: ${new Date(m.date).toLocaleDateString()}`)
        .join(' | ');

      return [
        this.escapeCSV(property.address),
        this.escapeCSV(vendorNames),
        this.escapeCSV(vendorEmails),
        this.escapeCSV(contactNames),
        this.escapeCSV(stage),
        this.escapeCSV(milestones),
        this.escapeCSV(property.riskOverview || ''),
      ];
    });

    // Build CSV content
    const csvLines = [headers, ...rows];
    const content = csvLines.map(row => row.join(',')).join('\n');

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
