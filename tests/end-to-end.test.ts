import { FuncCli } from "../lib/index";
import { QueueClient } from "@azure/storage-queue";

jest.setTimeout(30000);

describe("end-to-end tests", () => {
    let funcCli: FuncCli;
    let queueClient: QueueClient;

    beforeAll(async () => {
        const storageConnectionString = "UseDevelopmentStorage=true";
        queueClient = new QueueClient(storageConnectionString, "test-queue");
        await queueClient.createIfNotExists();

        const funcEnv = {
            "AzureWebJobsStorage": storageConnectionString,
            "FUNCTIONS_WORKER_RUNTIME": "node",
        };

        funcCli = new FuncCli();
        await funcCli.start({ port: 7071, cwd: process.cwd(), env: funcEnv });
    });

    beforeEach(async () => {
        // clear messages from queue and wait for operation to complete
        await queueClient.clearMessages();
        let messageCount: number = 0;
        while (true) {
            const props = await queueClient.getProperties();
            messageCount = props.approximateMessagesCount ?? 0;

            if (messageCount) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                break;
            }
        };
    });

    afterAll(async () => {
        await funcCli.stop();
    });

    it("no name provided", async () => {
        const result = await funcCli.fetch("/api/HttpTrigger1");
        expect(await result.text()).toEqual("This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.");
    });

    it("name in query string", async () => {
        const queueTrigger1Invocation = funcCli.waitForInvocation("QueueTrigger1");
        const result = await funcCli.fetch("/api/HttpTrigger1?name=test");
        expect(await result.text()).toEqual("Hello, test. This HTTP triggered function executed successfully.");
        const queueTrigger1Result = await queueTrigger1Invocation;
        expect(queueTrigger1Result.status).toEqual("Succeeded");
    });

    it("name in body", async () => {
        const queueTrigger1Invocation = funcCli.waitForInvocation("QueueTrigger1");
        const result = await funcCli.fetch("/api/HttpTrigger1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "test" })
        });
        expect(await result.text()).toEqual("Hello, test. This HTTP triggered function executed successfully.");
        const queueTrigger1Result = await queueTrigger1Invocation;
        expect(queueTrigger1Result.status).toEqual("Succeeded");
    });
});