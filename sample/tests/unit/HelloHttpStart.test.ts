import func from "../../HelloHttpStart/index";
import * as df from "durable-functions";
import { TestContext } from "@anthonychu/azure-functions-test-utils";

describe("HelloHttpStart unit tests", () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("should use client to start an orchestration", async () => {
        const testInstanceId = "123456";
        const client = {
            startNew: jest.fn().mockResolvedValue(testInstanceId),
            createCheckStatusResponse: jest.fn()
        };
        jest.spyOn(df, "getClient").mockReturnValue(client as any);
        const context = new TestContext();

        await func(context, context.req);

        expect(client.startNew).toHaveBeenCalledTimes(1);
        expect(client.createCheckStatusResponse).toHaveBeenCalledTimes(1);
        expect(client.createCheckStatusResponse).toHaveBeenCalledWith(context.req, testInstanceId);
    });
    
});