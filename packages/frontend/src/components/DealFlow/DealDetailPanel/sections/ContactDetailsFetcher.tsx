import React, { useEffect } from 'react';
import { api } from '../../../../utils/apiClient';

interface ContactDetailsFetcherProps {
    contactId: string;
    isExpanded: boolean;
    currentEmail?: string;
    currentPhone?: string;
    onDetailsLoaded: (details: { email?: string; phone?: string }) => void;
}

export const ContactDetailsFetcher: React.FC<ContactDetailsFetcherProps> = ({
    contactId,
    isExpanded,
    currentEmail,
    currentPhone,
    onDetailsLoaded
}) => {
    useEffect(() => {
        if (isExpanded && (!currentEmail || !currentPhone)) {
            const fetchDetails = async () => {
                try {
                    const response = await api.get<{ contact: any }>(`/api/contacts/${contactId}`);
                    const contact = response.data.contact;
                    if (contact) {
                        // Extract first email/phone if arrays, or use direct fields
                        const email = contact.email || (contact.emails && contact.emails[0]);
                        const phone = contact.phone || (contact.phones && contact.phones[0]);

                        if (email || phone) {
                            onDetailsLoaded({ email, phone });
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch contact details:', err);
                }
            };
            fetchDetails();
        }
    }, [isExpanded, contactId]); // Only run when expanded status changes

    return null; // Logic only component
};
