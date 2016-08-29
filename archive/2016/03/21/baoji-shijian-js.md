We always need process a business logic after a multiple hit such as double or more click event. And sometimes there is no such event handler to register so that we need find a way to do so. One of solutions is to design a task including following goals.

- Can register a handler to process after a multiple hit.
- The task can be run anywhere including in the event such as click.
- It executes the handler only when the task is run by the given times.
- The hit count will be reset if it is timeout after previous running.

I will introduce how to implement in both [Type Script](#type-script) and [C#](#c-sharp).

## Type Script

Firstly, we can define an options interface for initializing the task. We expect the user can set a process handler, and can customize how many hits to start processing and end, and config the timeout between two hits.

```typescript
/**
  * Options of multiple hit task.
  */
export interface MultipleHitOptionsContract {
 
    /**
      * The business handler to process.
      * @param index  The index of current hit.
      * @param modelArg  An optional argument.
      */
    process(index: number, modelArg?: any): void;
 
    /**
      * Start for hitting.
      */
    start?: number;
 
    /**
      * Hitting count.
      */
    count?: number;
 
    /**
      * The timespan in millisecond for hitting.
      */
    timeout?: number;
 
    /**
      * The object to be used as the current object
      * for handler processing.
      */
    thisArg?: any;
}
```

Then we can write a function to generate a task. It requires the option and returns a value indicating whether the handler is processed.

```typescript
export function multipleHit(
    options: MultipleHitOptionsContract)
    : (modelArg?: any) => boolean {
    if (!options || !options.process || options.count === 0)
        return null;
 
    // ToDo: Implement it.
    return null;
}
```

If the maximum hit count is not set, and start index is set to 0 or null, we just process the handler direct and return true.

```typescript
if (!options.start && options.count == null) {
    return (modelArg?: any) => {
        options.process.call(options.thisArg, 0, modelArg);
        return true;
    };
}
```

Otherwise, we need a counter and a date to record how many and when the current hit is processed.

```typescript
var count = 0;
var time: Date = null;
```

Then we need create a function to return.

```typescript
return (modelArg?: any) => {
    options.process.call(options.thisArg, count - 1, modelArg);
    return true;
};
```

Before executing the handler, we need check the previous time and record current one.

```typescript
var timespan = time != null ? new Date().getTime() - time.getTime() : null;
time = new Date();
if (timespan == null || timespan > options.timeout) {
    count = 1;
    return false;
}
```

And check the count to determine if need execute.

```typescript
count++;
var start = !!options.start ? options.start : 0;
if (count < start || (options.count != null && options.count <= count - start))
    return false;
```

So we get following task generator now.

```typescript
/**
  * Generates a multiple hit task.
  * @param options  The options to load.
  */
export function multipleHit(
    options: MultipleHitOptionsContract)
    : (modelArg?: any) => boolean {
    if (!options || !options.process || options.count === 0) return null;
    if (!options.start && options.count == null) {
        return (modelArg?: any) => {
            options.process.call(options.thisArg, 0, modelArg);
            return true;
        };
    }
 
    var count = 0;
    var time: Date = null;
    return (modelArg?: any) => {
        var timespan = time != null ? new Date().getTime() - time.getTime() : null;
        time = new Date();
        if (timespan == null || timespan > options.timeout) {
            count = 1;
            return false;
        }
 
        count++;
        var start = !!options.start ? options.start : 0;
        if (count < start || (options.count != null && options.count <= count - start))
            return false;
        options.process.call(options.thisArg, count - 1, modelArg);
        return true;
    };
}
```

Now we can have a test.

```typescript
export function multipleHitTest() {
    var task = multipleHit({
        timeout: 300,
        start: 3,
        count: 100,
        process: function (index, model) {
            console.debug(index.toString() + " at " + model);
        }
    });
    document.body.addEventListener(
        "click",
        function (ev) {
            task(new Date().toLocaleDateString());
        },
        false);
}
```

It will log debug info to console only when you click 3 times to 100 times quickly in the page.

## C Sharp

We need implement a class to provide a member method to process anywhere. The method should return a value indicating whether the context condition is matched. User can set start index, end index and timeout.

```csharp
public class MultipleHitTask
{
    public int Start
    { get; set; }
 
    public int End
    { get; set; }
 
    public TimeSpan Timeout
    { get; private set; }
 
    public DateTime LatestProcess
    { get; private set; }
 
    public int HitCount
    { get; private set; }
 
    public event EventHandler Processed;
 
    public bool Process()
    {
        throw new NotImplementedException();
    }
}
```

The event is used to register to occur so that user can add the handler. The current index should be provided.

```csharp
/// <summary>
/// The event arguments with counting.
/// </summary>
public class IndexEventArgs: EventArgs
{
    /// <summary>
    /// Gets the index.
    /// </summary>
    public int Index { get; private set; }
 
    /// <summary>
    /// Initializes a new instance
    /// of the IndexEventArgs class.
    /// </summary>
    /// <param name="index">The index.</param>
    public IndexEventArgs(int index)
    {
        Index = index;
    }
}
```

So the event in the class should also update like this way.

```csharp
public event EventHandler<IndexEventArgs> Processed;
```

In the process method, we should execute the handler.

```csharp
var args = new IndexEventArgs(HitCount - 1);
Processed(this, args);
return true;
```

And we need add the checking logic.

```csharp
var now = DateTime.Now;
if (LatestProcess == null || now - LatestProcess > Timeout)
{
    HitCount = 0;
}

HitCount++;
if (HitCount <= Start || HitCount > End)
    return false;
```

So following is the class.

```csharp
/// <summary>
/// Multiple hit task.
/// </summary>
public class MultipleHitTask
{
    /// <summary>
    /// Gets or sets the start index of hit to process.
    /// </summary>
    public int Start { get; set; }
 
    /// <summary>
    /// Gets or sets the end index of hit to process.
    /// </summary>
    public int End { get; set; }
 
    /// <summary>
    /// Gets the timeout.
    /// </summary>
    public TimeSpan Timeout { get; private set; }
 
    /// <summary>
    /// Gets the time of latest processing.
    /// </summary>
    public DateTime LatestProcess { get; private set; }
 
    /// <summary>
    /// Gets the hit count.
    /// </summary>
    public int HitCount { get; private set; }
 
    /// <summary>
    /// Adds or removes the event handler occured
    /// after processing
    /// </summary>
    public event EventHandler<IndexEventArgs> Processed;
 
    /// <summary>
    /// Processes the task.
    /// </summary>
    /// <returns>true if match the condition to execute;
    /// otherwise, false.</returns>
    public bool Process()
    {
        var now = DateTime.Now;
        if (LatestProcess == null || now - LatestProcess > Timeout)
        {
            HitCount = 0;
        }
 
        HitCount++;
        if (HitCount <= Start || HitCount > End)
            return false;
        var args = new IndexEventArgs(HitCount - 1);
        Processed(this, args);
        return true;
    }
}
```

You can create an instance of this class and register the event handler. Then execute process member method anywhere.
