import func from "../../QueueTrigger1/index"
import { TestAzureQueueMetadata, TestContext } from "@anthonychu/azure-functions-test-utils";

describe("QueueTrigger1 unit tests", () => {

    it("should call context.log", async () => {
        const context = new TestContext();
        const queueMetadata: TestAzureQueueMetadata = {
            dequeueCount: 3,
        };
        context.bindingData = queueMetadata;
        const spy = jest.spyOn(context, "log");

        await func(context, { name: "test" });
        
        expect(spy).toHaveBeenCalledTimes(1);
    });

});