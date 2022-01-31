# Azure Functions Test Utilities

A library for testing Azure Functions.

## Installation

    $ npm install -D @anthonychu/azure-functions-test-utils

## Usage

### Unit tests

You can unit test Azure Functions just like any other JavaScript code. Each function is exported from a Node.js module. Import it into a test and run it.

To help with mocking the Azure Functions context and HTTP requests/responses, this library includes some classes:

* `TestContext`: A mock context for Azure Functions.
* `TestHttpRequest`: A mock HTTP request.
* `TestHttpResponse`: A mock HTTP response.

#### Example

```typescript
import func from "../../HttpTrigger1/index"
import { TestContext } from "@anthonychu/azure-functions-test-utils";

describe("HttpTrigger1 unit tests", () => {

    // Testing a simple HTTP function
    it("should prompt for a username", async () => {
        const context = new TestContext();

        await func(context, context.req);

        expect(context.res.body).toEqual("This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.");
    });

    // Testing context.log()
    it("should call context.log", async () => {
        const context = new TestContext();
        const spy = jest.spyOn(context, "log");

        await func(context, context.req);
        
        expect(spy).toHaveBeenCalledTimes(1);
    });

    // Testing output binding
    it("should output the username in body to queue", async () => {
        const context = new TestContext();
        context.req.body = { name: "test" };

        await func(context, context.req);

        expect(context.bindings.outputQueueItem).toEqual({ name: "test" });
    });
});
```

### End-to-end tests

You can run end-to-end tests against Azure Functions running locally using Azure Functions Core Tools. This library includes a `FuncCli` class to help you manage Azure Functions Core Tools.

Some members available on `FuncCli` are:

* Methods
    - `start(opts)`: Start Azure Functions Core Tools.
    - `stop()`: Stop Azure Functions Core Tools.
    - `waitForInvocation(functionName)`: Wait for an invocation of a function and return its status.
    - `waitForInvocations(functionName, times)`: Wait for a function to be invoked the specified number of times and return their statuses.
    - `fetch(url, opts)`: Make an HTTP request to the function app. Same as `node-fetch`, but you can pass a path as the URL and the Azure Functions Core Tools base URL will be automatically prepended.
* Properties
    - `baseUrl`: The base URL of the Azure Functions Core Tools.

#### Prerequisites

* Install Azure Functions Core Tools.

    `npm install -g azure-functions-core-tools@4`

    - Ensure you install the version required by your app.
    - Ensure you install it globally.

* If your app requires a Storage account or other resources, ensure you have created them in Azure or you have a local emulator running.

#### Advanced example

The app consists of two functions:

- `HttpTrigger1`: An HTTP function that returns a greeting and also sends a message to a queue.
- `QueueTrigger1`: A queue triggered function that is triggered when a message appears in the queue.

```typescript
import { FuncCli } from "@anthonychu/azure-functions-test-utils";
import { QueueClient } from "@azure/storage-queue";

jest.setTimeout(30000);

describe("End-to-end tests", () => {
    let funcCli: FuncCli;
    let queueClient: QueueClient;

    beforeAll(async () => {
        const storageConnectionString = "UseDevelopmentStorage=true";

        // create the queue if it doesn't exist
        queueClient = new QueueClient(storageConnectionString, "test-queue");
        await queueClient.createIfNotExists();

        const funcEnv = {
            "AzureWebJobsStorage": storageConnectionString,
            "FUNCTIONS_WORKER_RUNTIME": "node",
        };

        // start Azure Functions Core Tools
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
            // verify HTTP response
            expect(await result.text()).toEqual("This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.");
        });

        it("name in query string", async () => {
            // declare that we want to wait for one invocation of the queue function
            const queueTrigger1Invocation = funcCli.waitForInvocation("QueueTrigger1");

            // make an HTTP request to function that outputs a queue message
            const result = await funcCli.fetch("/api/HttpTrigger1?name=test");
            expect(await result.text()).toEqual("Hello, test. This HTTP triggered function executed successfully.");

            // wait for queue trigger to be invoked once
            const queueTrigger1Result = await queueTrigger1Invocation;
            expect(queueTrigger1Result.status).toEqual("Succeeded");
        });

    });
});
```

#### Durable Functions example

```typescript
import { FuncCli } from "@anthonychu/azure-functions-test-utils";

// extend the Jest timeout to allow for the Azure Functions Core Tools to start
jest.setTimeout(30000);

describe("End-to-end tests", () => {
    let funcCli: FuncCli;

    beforeAll(async () => {
        // configure environment variables needed to run the app
        const storageConnectionString = "UseDevelopmentStorage=true";
        const funcEnv = {
            "AzureWebJobsStorage": storageConnectionString,
            "FUNCTIONS_WORKER_RUNTIME": "node",
        };

        // start Azure Functions Core Tools
        funcCli = new FuncCli();
        await funcCli.start({ port: 7071, cwd: process.cwd(), env: funcEnv });
    });

    afterAll(async () => {
        await funcCli.stop();
    });

    describe("Durable Functions orchestration", () => {

        it("Orchestration starts and finishes", async () => {

            // call the Durable Functions HTTP starter to start an orchestration
            const httpStartResponse = await funcCli.fetch("/api/HelloHttpStart");
            const { id: instanceId, statusQueryGetUri } = await httpStartResponse.json();

            // wait for the orchestration to no longer be running
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

            // verify the orchestration completed successfully and instance id matches
            expect(result.runtimeStatus).toEqual("Completed");
            expect(result.instanceId).toEqual(instanceId);
        });
    });
});
```