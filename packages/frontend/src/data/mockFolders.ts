/**
 * Mock Folder Data
 * 
 * Mock data for email folders, simulating what would be synced from Gmail/Outlook.
 * Used during frontend-only development phase.
 */

export interface EmailFolder {
    id: string;
    name: string;
    type: 'system' | 'custom' | 'synced';
    parentId?: string;
    color?: string;
    unreadCount: number;
    totalCount: number;
    syncedFrom?: 'gmail' | 'outlook' | 'custom';
    externalId?: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
}

// System folders that always exist
export const SYSTEM_FOLDERS: EmailFolder[] = [
    {
        id: 'inbox',
        name: 'Inbox',
        type: 'system',
        unreadCount: 12,
        totalCount: 156,
        icon: 'inbox',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'sent',
        name: 'Sent',
        type: 'system',
        unreadCount: 0,
        totalCount: 89,
        icon: 'send',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'drafts',
        name: 'Drafts',
        type: 'system',
        unreadCount: 3,
        totalCount: 5,
        icon: 'file-text',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'archive',
        name: 'Archive',
        type: 'system',
        unreadCount: 0,
        totalCount: 234,
        icon: 'archive',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'trash',
        name: 'Trash',
        type: 'system',
        unreadCount: 0,
        totalCount: 18,
        icon: 'trash',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'spam',
        name: 'Spam',
        type: 'system',
        unreadCount: 2,
        totalCount: 7,
        icon: 'alert-circle',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
];

// Simulated synced folders from Gmail/Outlook
export const SYNCED_FOLDERS: EmailFolder[] = [
    {
        id: 'clients',
        name: 'Clients',
        type: 'synced',
        unreadCount: 5,
        totalCount: 42,
        color: '#00D4FF',
        syncedFrom: 'gmail',
        externalId: 'Label_123',
        createdAt: '2024-06-15T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'buyers-active',
        name: 'Active Buyers',
        type: 'synced',
        parentId: 'clients',
        unreadCount: 3,
        totalCount: 28,
        color: '#00FF88',
        syncedFrom: 'gmail',
        externalId: 'Label_124',
        createdAt: '2024-06-15T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'vendors',
        name: 'Vendors',
        type: 'synced',
        parentId: 'clients',
        unreadCount: 2,
        totalCount: 14,
        color: '#8B5CF6',
        syncedFrom: 'gmail',
        externalId: 'Label_125',
        createdAt: '2024-06-15T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'properties',
        name: 'Properties',
        type: 'synced',
        unreadCount: 1,
        totalCount: 67,
        color: '#FFAA00',
        syncedFrom: 'gmail',
        externalId: 'Label_126',
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'legal',
        name: 'Legal & Contracts',
        type: 'synced',
        unreadCount: 0,
        totalCount: 31,
        color: '#FF4444',
        syncedFrom: 'outlook',
        externalId: 'folder_789',
        createdAt: '2024-08-10T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
];

// User-created custom folders
export const CUSTOM_FOLDERS: EmailFolder[] = [
    {
        id: 'vip',
        name: 'VIP Clients',
        type: 'custom',
        unreadCount: 2,
        totalCount: 15,
        color: '#FFD700',
        createdAt: '2024-10-01T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
    {
        id: 'followup',
        name: 'Follow Up Required',
        type: 'custom',
        unreadCount: 4,
        totalCount: 9,
        color: '#FF6B6B',
        createdAt: '2024-11-15T00:00:00Z',
        updatedAt: '2024-12-17T00:00:00Z',
    },
];

// All folders combined
export const ALL_FOLDERS: EmailFolder[] = [
    ...SYSTEM_FOLDERS,
    ...SYNCED_FOLDERS,
    ...CUSTOM_FOLDERS,
];

// Helper to get folder by ID
export const getFolderById = (id: string): EmailFolder | undefined => {
    return ALL_FOLDERS.find(folder => folder.id === id);
};

// Helper to get child folders
export const getChildFolders = (parentId: string): EmailFolder[] => {
    return ALL_FOLDERS.filter(folder => folder.parentId === parentId);
};

// Helper to get root folders (no parent)
export const getRootFolders = (): EmailFolder[] => {
    return ALL_FOLDERS.filter(folder => !folder.parentId);
};

// Recently used folders (for quick access)
export const RECENT_FOLDERS: string[] = ['clients', 'properties', 'vip'];
