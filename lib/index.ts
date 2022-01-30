import { BindingDefinition, Context, ContextBindingData, ContextBindings, ExecutionContext, HttpMethod, HttpRequest, HttpRequestHeaders, HttpRequestParams, HttpRequestQuery, Logger, TraceContext } from "@azure/functions"
import { ChildProcess } from "child_process";
import spawn = require("cross-spawn");
import waitOn = require('wait-on');
import fetch from "node-fetch";
import * as NodeFetch from 'node-fetch';

export class TestContext implements Context {
    invocationId: string = "";;
    executionContext: ExecutionContext = {
        functionName: "",
        invocationId: "",
        functionDirectory: "",
    };
    bindings: ContextBindings = {};
    bindingData: ContextBindingData = {};
    traceContext: TraceContext = {
        attributes: {},
        traceparent: null,
        tracestate: null,
    };
    bindingDefinitions: BindingDefinition[] = [];
    log: Logger = Object.assign(
        (...args: any[]) => {},
        {
            error: (...args: any[]) => {},
            warn: (...args: any[]) => {},
            info: (...args: any[]) => {},
            verbose: (...args: any[]) => {},
        }
    );
    done(err?: string | Error, result?: any): void {
        throw new Error("Method not implemented.");
    }
    req: HttpRequest = new TestHttpRequest();
    res: { [key: string]: any; } = new TestHttpResponse();
}

export class TestHttpRequest implements HttpRequest {
    method: HttpMethod = "GET";
    url: string = "";
    headers: HttpRequestHeaders = {};
    query: HttpRequestQuery = {};
    params: HttpRequestParams = {};
    body?: any;
    rawBody?: any;
}

export class TestHttpResponse {
    body?: any;
}

export class FuncCli {
    private _funcProcess?: any;
    private _opts: { port?: number, cwd?: string } = {};
    private _invocationWaiters: InvocationWaiter[] = [];

    public get baseUrl(): string {
        return `http://localhost:${this._opts.port}`;
    }

    async start(opts: { port?: number, cwd?: string, env?: {[key: string]: string} }): Promise<void> {
        const port = opts.port ?? 7071;
        const cwd = opts.cwd ?? process.cwd();
        const env = Object.assign({}, process.env, opts.env ?? {});
        this._opts = { port, cwd };

        this._funcProcess = await spawnAndWait('func', ['start', '--verbose'], port, { cwd, env });
        this._funcProcess.stdout.on('data', (data?: Buffer) => {
            const dataText = data?.toString("utf8") ?? "";
            const lines = dataText.split(/\r?\n/);
            for (const line of lines) {
                const match = /\bExecuted 'Functions\.(.+?)' \((\w+),.+\)/.exec(line);
                if (match) {
                    const invocation = {
                        functionName: match[1],
                        status: match[2],
                    };

                    const completedWaiters: InvocationWaiter[] = [];
                    for (const waiter of this._invocationWaiters) {
                        if (waiter.functionName === invocation.functionName) {
                            waiter.times--;
                            waiter.results.push({ status: invocation.status });
                            if (waiter.times === 0) {
                                completedWaiters.push(waiter);
                                waiter.resolve(waiter.results);
                            }
                        }
                    }
                    this._invocationWaiters = this._invocationWaiters.filter(waiter => !completedWaiters.includes(waiter));
                }
            }
        });
    }

    async stop(): Promise<void> {
        if (!this._funcProcess) {
            throw "func process not started";
        }
        await killAndWait(this._funcProcess);
        this._funcProcess = undefined;
    }

    fetch(url: string, init?: NodeFetch.RequestInit): Promise<NodeFetch.Response> {
        if (!/^https?\:\/\//.test(url)) {
            url = `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
        }
        return fetch(url, init);
    }

    waitForInvocations(functionName: string, times: number = 1): Promise<InvocationResult[]> {
        return new Promise((resolve, reject) => {
            this._invocationWaiters.push({
                functionName,
                times,
                resolve,
                reject,
                results: [],
            });
        });
    }

    async waitForInvocation(functionName: string): Promise<InvocationResult> {
        const results = await this.waitForInvocations(functionName, 1);
        return results[0];
    }
}

interface InvocationWaiter {
    functionName: string,
    times: number,
    resolve: (value: InvocationResult[] | PromiseLike<InvocationResult[]>) => void,
    reject: (reason?: any) => void,
    results: InvocationResult[],
}

interface InvocationResult {
    status: string;
}

async function spawnAndWait(command: string, args: string[], waitPort: number, opts?: any) {
    const child = spawn(command, args, opts);
    await waitOn({
        resources: [
            `tcp:localhost:${waitPort}`
        ],
        timeout: 30000
    });
    return child;
}

async function killAndWait(proc: ChildProcess) {
    const k = require('tree-kill');
    k(proc.pid, 'SIGKILL');
    while (isRunning(proc.pid)) {
        await setTimeoutPromise(1000);
    }
}

async function setTimeoutPromise(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function isRunning(pid?: number) {
    if (!pid) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (e: any) {
        return e.code === 'EPERM';
    }
}

export interface TestAzureQueueMetadata {
    expirationTime?: string;
    insertionTime?: string;
    popReceipt?: string;
    nextVisibleTime?: string;
    dequeueCount?: number;
    id?: string;
}