import QueueTrigger1 from "../QueueTrigger1/index"
import { TestContext } from "../lib/index";

describe("QueueTrigger1 unit tests", () => {

    it("should call context.log", async () => {
        const context = new TestContext();
        const spy = jest.spyOn(context, "log");
        await QueueTrigger1(context, { name: "test" });
        expect(spy).toHaveBeenCalledTimes(1);
    });
});