In the field of web front-end software development, I believe you have known Promise if you have experience in jQuery, ES6 or Node.js. Promise object is used for deferred and asynchronous computations. It represents following cases.

- An operation has not completed but we can expect its result.
- Done with or without a result value.
- Failed with or without an error reason.
- Will not turn back the state after it has completed.

But if you were going to implement Promise, how will you do? Today, I will introduce one of the implementation in Type Script for web app.

## Usages

ES6 Promise can be created like following example.

```javascript
var promise = new Promise(
    function (resolve, reject) {
        // Main logic.
        setTimeout(function () {
            // Main logic callback.
            var now = new Date();
            if (now.getSeconds() % 2 === 0)
                // Go to success route.
                resolve(now);
            else
                // Go to failure route.
                reject(now);
        }, 1000);
    });
 
// Register callback.
promise.then(
    function (value) {
        // Success callback.
        console.debug("Success", value);
    },
    function (reasone) {
        // Failure callback.
        console.debug("Error", reasone);
    });
```

We want to run a function asynchronously. It is to check if the second in next second is an even number. A couple of callback are registered, one is for if the function runs succeeded and another is for failed.

In runtime, it works like following way.

1. In the working thread, a Promise instance object is created.
2. Process the main logic handler which is an argument of Promise constructor. Perhaps there is a callback in main logic which will not be processed at this moment.
3. Register one or more callback couples for success and failure if needed. Any of them can be null which means do nothing for that route.
4. Process main logic callback after the rest is done in the working thread and the main logic callback is raised.
5. Go to success route or failure route.
6. The success callbacks or the failure callbacks registered are raised one by one. For success callback, it will raise failure callback if it fails to process.
7. Generate a next Promise to process if the success callback or failure callback returns a value.

The class Promise is what we will implement.

## How to implement

Considering there is a Promise in ES6 already, so we will name our new class as LitePromise here.

What should be in the class?

- A constructor which can pass an argument which is a function to run. The function has 2 arguments and both of them are delegates. These delegates are provided by Promise class for using in the function. The first delegate is used to pass a result to handle success callbacks; the other is to pass failure reason to handle fail callbacks.
- A member method to register on fulfilled callback for success and on rejected callback for failure. This method should return another Promise so that we can register callbacks after this Promise has completed. Both of the callback can pass an argument which is the result or error reason. And both of the callback can return a value as the next Promise result value or failure reason.

So we got following code.

```typescript
export class LitePromise<T> implements PromiseLike<T> {
 
    public constructor(executor: (
        resolve: (value?: T | PromiseLike<T>) => void,
        reject: (reason?: any) => void) => void) {
        // ToDo: Implement it.
    }
 
    public then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => TResult | PromiseLike<TResult> | void): LitePromise<TResult> {
        return new LitePromise<TResult>((resolve, reject) => {
            // ToDo: Implement it.
        })
    }
 
    public catch(onrejected?: (reason: any) => T | PromiseLike<T> | void): LitePromise<T> {
        return this.then(null, onrejected);
    }
}
```

To continue to implement this, we need have some fields to store useful information.

- A state including pending, success or fail.
- A value for result or failure reason.

So we have following code.

```typescript
private _state: boolean = null;
private _value: T;
```

Here, state is null represents it is pending; true is successful; false is failure. Now lets implement resolve method.

1. Check state. The function should not do anything if the state is not pending currently.
2. Check if the value is the Promise itself. It forbids for this case.
3. Set state as success and set the result value.
4. Handle all deferred information registered.
5. We also need a try-catch for handle exception. If fails, it need go to reject route.

```typescript
private _resolve(value: T | PromiseLike<T>) {
    if (this._state !== null)
        return;
 
    if (value === this)
        throw new TypeError('A promise cannot be resolved with itself.');
 
    this._state = true;
    this._value = value as T;
 
    // ToDo: Handle all deferred information.
}
```

And we need add a try-catch for exception during processing this method. It will go to reject route if it fails.

```typescript
private _resolve(value: T | PromiseLike<T>) {
    try {
        // Original implementation for resolving.
    } catch (e) {
        // Reject route.
    }
}
```

However, if the result value is another Promise object, we should raise its callback instead of current logic. So we need add an additional flag indicating this.

```typescript
private _delegating = false;
```

And add following logic before set state and value.

```typescript
if (value && (typeof value === 'object' || typeof value === 'function') && typeof (value as PromiseLike<T>).then === "function") {
    this._delegating = true;
    (value as PromiseLike<T>).then(this._resolve, this._reject);
    return;
}
```

For reject route, we just need check if the state is not in pending and set the state as failure and set the value as the error reason. Then handle all deferred information registered.

```typescript
private _reject(reason) {
    if (this._state !== null)
        return
    this._state = false;
    this._value = reason;
 
    // ToDo: Handle all deferred information.
}
```

For deferred information, we need save its following things.

- On fulfilled callback for success.
- On rejected callback for failure.
- A resolve handler for next Promise.
- A reject handler for next Promise.

So it will be as the following interface.

```typescript
export interface DeferredContract<T, TResult> {
    onFulfilled: (value: T) => TResult | PromiseLike<TResult>;
    onRejected: (reason: any) => TResult | PromiseLike<TResult> | void;
    resolve: (value?: TResult | PromiseLike<TResult>) => void;
    reject: (reason?: any) => void;
}
```

And add a deferred list property in Promise class.

```typescript
private _deferreds: DeferredContract<T, any>[] = [];
```

To handle one of deferred information registered, we need check if the state is in pending. If so, we just add it into the list; otherwise, raise callback.

```typescript
private _handle<TResult>(deferred: DeferredContract<T, TResult>) {
    if (this._state === null) {
        this._deferreds.push(deferred);
        return;
    }
 
    setTimeout(() => {
        // Raise callback.
    }, 0);
}
```

We can raise callback as following steps.

1. Check state to determine if it is to raise success callback or failure callback.
2. Call its resolve delegate or reject delegate if the callback is not set. And then return.
3. Raise the callback in a try-catch. Go to reject route if fails; otherwise, resolve.

Code is like following.

```typescript
// Check state.
var cb = this._state ? deferred.onFulfilled : deferred.onRejected;
if (cb === null) {
    // Default callback.
    (this._state ? deferred.resolve : deferred.reject)(this._value as any);
    return;
}
 
// Callback.
var ret: TResult | PromiseLike<TResult>;
try {
    ret = cb(this._value) as any;
}
catch (e) {
    deferred.reject(e);
    return
}
 
// Resolve.
deferred.resolve(ret);
```

As what we have discussed before, the member method then which is used to register deferred callbacks will return next Promise. The constructor need pass a function as its argument. The function is to handle the deferred information. So we can implement it there now as following.

```typescript
this._handle<TResult>({
    onFulfilled: onfulfilled,
    onRejected: onrejected,
    resolve: resolve,
    reject: reject
});
```

Then we need add a method to handle all deferred information and clear after it has completed.

```typescript
private _finale() {
    for (var i = 0, len = this._deferreds.length; i < len; i++)
        this._handle(this._deferreds[i]);
    this._deferreds = null;
}
```

The rest thing is to implement the constructor. We just check if the delegating flag is off to resolve result or reject.

```typescript
try {
    executor((value) => {
        if (!this._delegating) this._resolve(value)
    }, (reason) => {
        if (!this._delegating) this._reject(reason)
    });
} catch (e) {
    if (!this._delegating) this._reject(e)
}
```

The LitePromise class is done now.

## Helper

So let's continue to implement a helper function. A function is to create a Promise that is resolved with an array of results when all of the provided Promises resolve, or rejected when any Promise is rejected. We need use a counter to check the state for all Promise passed. The Promise returned will resolve when all have completed. It will reject if any of them is not in correct way. Following is the code.

```typescript
namespace LitePromise {
    export function all(values: any[]): LitePromise<any[]> {
        var args = Array.prototype.slice.call(
            arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : arguments)
        return new LitePromise<any[]>((resolve, reject) => {
            if (args.length === 0) return resolve([]);
            var remaining = args.length;
            var res = (i, value) => {
                try {
                    // Check if it is a promise.
                    if (value
                        && (typeof value === 'object' || typeof value === 'function')
                        && typeof (value as PromiseLike<any>).then === "function") {
                        (value as PromiseLike<any>).then(
                            (val) => {
                                res(i, val)
                            },
                            reject);
                        return;
                    }
 
                    // Simple value.
                    args[i] = value;
 
                    // Wait for all.
                    if (--remaining === 0) {
                        resolve(args);
                    }
                } catch (ex) {
                    reject(ex);
                }
            }
            for (var i = 0; i < args.length; i++) {
                res(i, args[i]);
            }
        });
    }
}
```

For helper function race, which creates a Promise that is resolved or rejected when any of the provided Promises are resolved or rejected, is like the function all, so I will not introduce here.

```typescript
export function race<T>(values: Iterable<T | PromiseLike<T>>): Promise<T> {
    // ToDo: Implement it.
}
```

You can implement it by yourself.
