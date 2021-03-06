import func from "../../Hello/index"
import { TestContext } from "@anthonychu/azure-functions-test-utils";

describe("Hello activity function unit tests", () => {

    it("should return a greeting", async () => {
        const context = new TestContext();
        context.bindings.name = "World";

        const result = await func(context);

        expect(result).toBe("Hello World!");
    });
    
});