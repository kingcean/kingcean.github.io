In HTML, sometimes we need get, set or adapt the size from or to an element by script. Following are often used.

- Gets or sets the size of a DOM.
- Gets the size of the window.
- Gets the size of the HTML document.
- Binds the width of a DOM to the one of window or another DOM.
- Binds the height of a DOM to the one of window or another DOM.

I will introduce the implementation in Type Script for them here.

## Get size

Firstly, we need define an interface for size information.

```typescript
export interface SizeContract {
    width: number;
    height: number;
}
```

And we want to implement the function to get following types of element.
- Document.
- Window.
- DOM in body.

So the function should be like this way.

```typescript
export function getSize(element: HTMLElement | string | Window | Document)
    : SizeContract {
    if (!element) return null;
 
    // ToDo: Implement it.
    return null;
}
```

If the argument element is an identifier string, we need get its element.

```typescript
if (typeof element === "string")
    element = document.getElementById(element as string);
if (!element) return null;
```

To get the size of a DOM, window or document, we can test which element type user passed to us. For document, we can check if there is any of following properties.

- body

  A property of HTML document object.
- documentElement

  A property of XML document object.

Following is code.

```typescript
if (!!(element as any as Document).body || !!(element as any as Document).documentElement) {
    var bodyWidth = !!document.body ? document.body.scrollWidth : 0;
    var documentWidth = !!document.documentElement ? document.documentElement.scrollWidth : 0;
    var bodyHeight = !!document.body ? document.body.scrollHeight : 0;
    var documentHeight = !!document.documentElement ? document.documentElement.scrollHeight : 0;
    return {
        width: bodyWidth > documentWidth ? bodyWidth : documentWidth,
        height: bodyHeight > documentHeight ? bodyHeight : documentHeight
    }
}
```

For window, it contains a parent property to point to the parent window.

```typescript
if (!!(element as any as Window).parent) {
    return {
        width: document.compatMode == "CSS1Compat" ? document.documentElement.clientWidth : document.body.clientWidth,
        height: document.compatMode == "CSS1Compat" ? document.documentElement.clientHeight : document.body.clientHeight
    };
}
```

Otherwise, it should be a DOM in body. And we can get its offset width and height.

```typescript
return {
    width: (element as HTMLElement).offsetWidth,
    height: (element as HTMLElement).offsetHeight
};
```

So we can use this function to get the size of the element now.

## Set size

To set the size to an HTML element is very simple. The function has 3 arguments, one is the element to set, others are width and height. It returns the size of the element.

```typescript
export function setSize(element: HTMLElement | string, width?: number | string, height?: number | string): SizeContract {
    if (!element) return null;
 
    // ToDo: Implement it.
    return null;
}
```

Of course, we need get its element if the argument is a string for the identifier.

```typescript
var ele = typeof element === "string" ? document.getElementById(element) : element;
if (!element) return null;
```

Then we can set its width in inline style. We need add the unit px if it is a number.

```typescript
if (width != null)
    ele.style.width = typeof width === "string" ? width : (width.toString() + "px");
```

And set its height.

```typescript
if (height != null)
    ele.style.height = typeof height === "string" ? height : (height.toString() + "px");
```

And return the size after setting.

```typescript
return {
    width: ele.offsetWidth,
    height: ele.offsetHeight
};
```

Next, we need add some functions to make it adaptive to parent container, window or other reference object.

## Adapt width

To bind the width to a target, we need pass these two elements to the function, and an additional compute function for width convertor. It should return a disposable object so that we can release the listening event anywhere.

```typescript
export function adaptWidth(element: HTMLElement, target?: HTMLElement | Window, compute?: (width: number) => number): { dispose(): void } {
 
    // ToDo: Implement it.
    return null;
}
```

Firstly. we need check if the arguments of source element or target element is null.

```typescript
if (!element || !target) return {
    dispose: () => { }
};
```

And we need implement a handler to set the width as same as the one of the target element.

1. Check if the target is a window.
2. Get its width.
3. Convert the width if there is a compute function.
4. Set the width.

Following is the code.

```typescript
var setWidth = () => {
    var width = !!(target as Window).parent ? (window.innerWidth ? window.innerWidth : document.body.clientWidth) : (target as HTMLElement).offsetWidth;
    if (!!compute) width = compute(width);
    setSize(element, width, null);
};
```

Then we need call this handler.

```typescript
setWidth();
```

This will be called only once. But we need call this every time when the target element has resized. So we need add an event listener to do so.

```typescript
target.addEventListener("resize", setWidth, false);
```

And return a disposable object for removing the event listener.

```typescript
return {
    dispose: () => {
        target.removeEventListener("resize", setWidth, false);
    }
};
```

So we have implemented width binding.

## Adapt height

Just like to adapt width, we modify something so that we can get following code for binding height.

```typescript
export function adaptHeight(element: HTMLElement, target?: HTMLElement | Window, compute?: (height: number) => number): { dispose(): void } {
 
    // Test arguments.
    if (!element || !target) return {
        dispose: () => { }
    };
 
    // A function to set height as same as target.
    var setHeight = () => {
        var height = !!(target as Window).parent ? (window.innerHeight ? window.innerHeight : document.body.clientHeight) : (target as HTMLElement).offsetHeight;
        if (!!compute) height = compute(height);
        setSize(element, null, height);
    };
 
    // Call the function to set height.
    setHeight();
 
    // Add event listener for the target resizing to set height.
    target.addEventListener("resize", setHeight, false);
 
    // Return a disposable object.
    return {
        dispose: () => {
            target.removeEventListener("resize", setHeight, false);
        }
    };
}
```

Now we can manage the size of any element in HTML now.
