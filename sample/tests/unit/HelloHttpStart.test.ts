const testInstanceId = "123456";
const mockClient = {
    startNew: jest.fn(async () => testInstanceId),
    createCheckStatusResponse: jest.fn(),
};
const mockDF = {
    getClient: jest.fn(() => {
        return mockClient;
    }),
};
jest.mock("durable-functions", () => {
    return mockDF;
});

import HelloHttpStart from "../../HelloHttpStart/index"
import { TestContext } from "@anthonychu/azure-functions-test-utils";

describe("HelloHttpStart unit tests", () => {
    it("should use client to start an orchestration", async () => {
        const context = new TestContext();
        await HelloHttpStart(context, context.req);
        expect(mockClient.startNew).toHaveBeenCalledTimes(1);
        expect(mockClient.createCheckStatusResponse).toHaveBeenCalledTimes(1);
        expect(mockClient.createCheckStatusResponse).toHaveBeenCalledWith(context.req, testInstanceId);
    });
});