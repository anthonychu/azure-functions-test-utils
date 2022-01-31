import { DummyOrchestrationContext } from "durable-functions";
import func from "../../HelloOrchestrator/index"

describe("HelloOrchestrator unit tests", () => {

    it("should return 3 outputs", async () => {
        const context = new DummyOrchestrationContext();
        const callActivityMock = jest.fn();
        callActivityMock
            .mockReturnValueOnce("Hello Tokyo!")
            .mockReturnValueOnce("Hello Seattle!")
            .mockReturnValueOnce("Hello London!");
        context.df.callActivity = callActivityMock;

        func(context);

        expect(context.doneValue?.output).toEqual(["Hello Tokyo!", "Hello Seattle!", "Hello London!"]);
    });
    
});