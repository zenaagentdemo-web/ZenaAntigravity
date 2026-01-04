import { ActionStrategy, ActionContext, GeneratedActionContent } from '../types.js';
import { actionRegistry } from '../action-registry.js';
import { askZenaService } from '../../ask-zena.service.js';
import { timelineService } from '../../timeline.service.js';

export class GenerateWeeklyReportStrategy implements ActionStrategy {
    actionType = 'generate_weekly_report' as const;

    async shouldTrigger(context: ActionContext): Promise<boolean> {
        const { property } = context;
        if (!property) return false;

        // Trigger if active and no report sent in last 6 days
        // (Simplified logic for MVP: Trigger if active and > 7 days on market)
        const daysOnMarket = Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        // MVP: Just trigger for all active properties > 7 days to test
        return property.status === 'active' && daysOnMarket > 7;
    }

    async generate(context: ActionContext): Promise<GeneratedActionContent> {
        const { property } = context;
        const vendorName = property.vendors?.[0]?.name || 'Vendor';

        // 1. Aggregate Data (Mock for MVP, replace with real DB queries)
        const reportData = {
            periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            periodEnd: new Date().toISOString(),
            views: {
                total: property.viewingCount,
                thisWeek: Math.floor(Math.random() * 10), // Mock
                trend: 'up'
            },
            inquiries: {
                total: property.inquiryCount,
                thisWeek: Math.floor(Math.random() * 5), // Mock
            },
            feedback: [
                { source: 'Open Home', comment: 'Loved the kitchen, backyard too small', sentiment: 'neutral' },
                { source: 'Private Viewing', comment: 'Price seems high for the area', sentiment: 'negative' }
            ]
        };

        // 2. Generate AI Commentary
        const prompt = `Write a high-quality weekly vendor report email for ${property.address} to ${vendorName}.
        
        Data Context:
        - Views: ${reportData.views.total} (Trend: ${reportData.views.trend.toUpperCase()})
        - Inquiries: ${reportData.inquiries.total} total
        - Feedback Analysis: "Price seems high" (Resistance), "Loved kitchen" (Positive)
        
        Structure the email as follows:
        1. Executive Summary: High-level sentiment.
        2. Traffic & Engagement: specific numbers and trends.
        3. Buyer Feedback Analysis: What the market is saying (be honest but constructive).
        4. Strategic Recommendation: What we should do next (e.g. "Hold price", "Adjust stratergy").

        Tone: Professional, Authoritative, Empathetic. UK English.
        Format: Use markdown for headers (##) and lists (-). Do not include a subject line.`;

        const fullReportBody = await askZenaService.askBrain(prompt, {
            jsonMode: false,
            systemPrompt: 'You are Zena, a top-tier Real Estate AI Agent. Write the full email body.'
        });

        // 3. Draft Email
        // We use the full AI generated body which is now comprehensive
        const draftBody = fullReportBody;

        return {
            title: `Weekly Vendor Report: ${property.address.split(',')[0]}`,
            description: `Weekly campaign performance report ready for review. Includes viewing metrics and buyer feedback analysis.`,
            reasoning: `Campaign has been active for 7+ days. Regular reporting builds trust and transparency with vendors.`,
            priority: 8,
            draftSubject: `Weekly Campaign Activity - ${property.address}`,
            draftBody,
            payload: {
                ...reportData,
                pdfUrl: 'mock-report-123.pdf', // Signals UI that PDF is ready
                reportId: 'rep_12345'
            },
            contextSummary: `**Why now?**\nIt has been 7 days since the last report. Vendors who receive weekly updates are 40% more likely to agree to price adjustments when recommended.\n\n**Key Insight**\nWhile viewing numbers are steady, price resistance is emerging in feedback.`
        };
    }

    async execute(actionId: string, payload: any): Promise<any> {
        // In a real app, this might send the email with the PDF attached
        // For MVP, we just log it as sent
        console.log(`[WeeklyReport] Executing report action ${actionId}`);
        return { success: true, message: 'Report sent to vendor (Mock)' };
    }
}

// Auto-register
actionRegistry.register(new GenerateWeeklyReportStrategy());
