import { FuncCli } from "@anthonychu/azure-functions-test-utils";
import { QueueClient } from "@azure/storage-queue";

jest.setTimeout(30000);

describe("End-to-end tests", () => {
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

    afterAll(async () => {
        await funcCli.stop();
    });

    describe("HTTP trigger to queue trigger", () => {

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

    describe("Durable Functions orchestration", () => {

        it("Orchestration starts and finishes", async () => {
            const httpStartResponse = await funcCli.fetch("/api/HelloHttpStart");
            const { id: instanceId, statusQueryGetUri } = await httpStartResponse.json();

            let result: any; 
            while (true) {
                const statusResponse = await funcCli.fetch(statusQueryGetUri);
                result = await statusResponse.json();

                if (result.runtimeStatus !== "Completed") {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    break;
                }
            }

            expect(result.runtimeStatus).toEqual("Completed");
            expect(result.instanceId).toEqual(instanceId);
        });
    });
});