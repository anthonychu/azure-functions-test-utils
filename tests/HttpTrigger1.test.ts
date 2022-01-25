import HttpTrigger1 from "../HttpTrigger1/index"
import { TestContext } from "../lib/index";

describe("HttpTrigger1 unit tests", () => {

    it("should prompt for a username", async () => {
        const context = new TestContext();
        await HttpTrigger1(context, context.req);
        expect(context.res.body).toEqual("This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.");
    });

    it("should echo back the username in query string", async () => {
        const context = new TestContext();
        context.req.query = { name: "test" };
        await HttpTrigger1(context, context.req);
        expect(context.res.body).toEqual("Hello, test. This HTTP triggered function executed successfully.");
    });

    it("should output the username in query string to queue", async () => {
        const context = new TestContext();
        context.req.query = { name: "test" };
        await HttpTrigger1(context, context.req);
        expect(context.res.body).toEqual("Hello, test. This HTTP triggered function executed successfully.");
    });

    it("should echo back the username in body", async () => {
        const context = new TestContext();
        context.req.body = { name: "test" };
        await HttpTrigger1(context, context.req);
        expect(context.res.body).toEqual("Hello, test. This HTTP triggered function executed successfully.");
    });

    it("should output the username in body to queue", async () => {
        const context = new TestContext();
        context.req.body = { name: "test" };
        await HttpTrigger1(context, context.req);
        expect(context.bindings.outputQueueItem).toEqual({ name: "test" });
    });

    it("should call context.log", async () => {
        const context = new TestContext();
        const spy = jest.spyOn(context, "log");
        await HttpTrigger1(context, context.req);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});