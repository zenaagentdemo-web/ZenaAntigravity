import { DealFlowService } from "./src/services/deal-flow.service.js";

const dealFlowService = new DealFlowService();
const userId = "1100e036-d5e0-4c10-a9af-cf529d1a8a9b";

async function test() {
    try {
        console.log("Testing getPipelineDeals for seller...");
        const sellerPipeline = await dealFlowService.getPipelineDeals(userId, "seller");
        console.log("Seller pipeline fetched successfully. Deal count:", sellerPipeline.summary.totalDeals);

        console.log("Testing getPipelineDeals for buyer...");
        const buyerPipeline = await dealFlowService.getPipelineDeals(userId, "buyer");
        console.log("Buyer pipeline fetched successfully. Deal count:", buyerPipeline.summary.totalDeals);

    } catch (error) {
        console.error("ERROR in DealFlowService:");
        console.error(error);
    }
}

test();
