It can improve user experience to support sliding by touching and mouse for some components, e.g. slider, content flipping, jump list menu, etc. In web development, we can use some event to implement it. But how can we abstract it for generic usages? Let's make some goals to support.

- Target to an element.
- Slide left/right/top/bottom event.
- Minimum horizontal/vertical displacement.
- Moving event.

Then we will translate these into Type Script.

## Contracts

We need following options contract to customized a slide behavior for a specific element.

```typescript
/**
  * Slide options.
  */
export interface SlideOptionsContruct {
 
    /**
      * The mininum horizontal value
      * to active related gesture handlers.
      */
    minX?: number;
 
    /**
      * The mininum vertical value
      * to active related gesture handlers.
      */
    minY?: number;
 
    /**
      * The handler rasied on turning up.
      * @param ele  The target element.
      * @param y  The distance moved in vertical.
      */
    turnUp?(ele: HTMLElement, y: number): void;
 
    /**
      * The handler rasied on turning right.
      * @param ele  The target element.
      * @param x  The distance moved in horizontal.
      */
    turnRight?(ele: HTMLElement, x: number): void;
 
    /**
      * The handler rasied on turning down.
      * @param ele  The target element.
      * @param y  The distance moved in vertical.
      */
    turnDown?(ele: HTMLElement, y: number): void;
 
    /**
      * The handler rasied on turning left.
      * @param ele  The target element.
      * @param x  The distance moved in horizontal.
      */
    turnLeft?(ele: HTMLElement, y: number): void;
 
    /**
      * The handler rasied before moving.
      * @param ele  The target element.
      */
    moveStart?(ele: HTMLElement): void;
 
    /**
      * The handler rasied after moving.
      * @param ele  The target element.
      * @param x  The distance moved in horizontal.
      * @param y  The distance moved in vertical.
      */
    moveEnd?(ele: HTMLElement, x: number, y: number): void;
 
    /**
      * The handler rasied on moving.
      * @param ele  The target element.
      * @param x  The distance moved in horizontal.
      * @param y  The distance moved in vertical.
      */
    moving?(ele: HTMLElement, x: number, y: number): void;
}
```

And the signature of the function to bind the slide gesture should be like this. It returns a disposable object so that the user can cancel remove the behavior.

```typescript
export function addSlide(element: HTMLElement | string, options: SlideOptionsContruct): { dispose(): void } {
    if (!options || !element) return {
        dispose: () => { }
    };
 
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element as HTMLElement;
    if (!ele) return {
        dispose: () => { }
    };
 
    // ToDo: Implement it.
    return null;
}
```

The function has 2 arguments, one is the target element, the second is the options. We need validate the arguments firstly and then add implementation. It needs support both touch and mouse.

## Touch

Touch includes finger touching, pen drawing and other screen touching input. To make words simple, I just use finger touching to refer all kinds of touching input here. For adding a gesture supports, we need know how browser raise event to the web pages.

1. When you use your finger touch the screen, a touch start event is raised.
2. During you slide in the screen by your finger, the touch move event is raised continuously.
3. When your finger leaves screen, a touch end event is raised.

So, we can use these event to implement. For touch start, we need record where the finger is at beginning.

```typescript
var start: { x: number, y: number } = null;
var touchStart = (ev: TouchEvent) => {
    start = {
        x: ev.targetTouches[0].pageX,
        y: ev.targetTouches[0].pageY
    };
    if (!!options.moveStart)
        options.moveStart(ele);
};
ele.addEventListener("touchstart", touchStart, false);
```

Then we can check this value later to compute the distance of sliding. Now we can implement touch move event by getting the current touching position minus the one beginning. And call the handler registered.
var touchMove = !!options.moving ? (ev: TouchEvent) => {
    var point = (ev.touches ? ev.touches[0] : ev) as Touch;
    if (!point) return;
    var coor = {
        x: point.pageX - start.x,
        y: point.pageY - start.y
    };
    options.moving(ele, coor.x, coor.y);
} : null;
if (!!touchMove)
    ele.addEventListener("touchmove", touchMove, false);
```

For end, we need compute if the end user has moved the element by checking the distance of current one and the minimum values. We need also judge if it is turn left or right, and turn up or turn down.

```typescript
var moved = (x: number, y: number) => {
    var isX = !y || (Math.abs(x) / Math.abs(y) > (minX + 0.01) / (minY + 0.01));
    if (isX) {
        if (x > minX && !!options.turnLeft)
            options.turnLeft(ele, x);
        else if (x < -minX && !!options.turnRight)
            options.turnRight(ele, -x);
    } else {
        if (y > minY && !!options.turnUp)
            options.turnUp(ele, y);
        else if (y < -minY && !!options.turnDown)
            options.turnDown(ele, -y);
    }
 
    if (!!options.moveEnd)
        options.moveEnd(ele, x, y);
};
```

Now, we can call this function in touch end event.

```typescript
var touchEnd = (ev: TouchEvent) => {
    if (start == null) return;
    var x = ev.changedTouches[0].pageX - start.x;
    var y = ev.changedTouches[0].pageY - start.y;
    start = null;
    moved(x, y);
};
ele.addEventListener("touchend", touchEnd, false);
```

Touch events listening is done.

## Mouse

Currently, it does not work for mouse if you just implement as this. So let's continue to add mouse events supports.

Before of this, we need have a way to get the position of the mouse in the document. The way to get the mouse position in the page is simple, it is by following way.

1. Load them from event object. If not support, continue to next step; otherwise, return.
2. Get where the page scrolls and where the mouse is in current screen. Then add them. Return.

Additional, if you are implementing a common function, you need also support touch, although it may not for this subject because we have the way to handle touch scenario. The way to get touch position is to load data from event data, too.

Following is the code.

```typescript
/**
  * Gets the position of the mouse in document.
  */
export function getMousePosition(): { x: number, y: number } {
    // Resolve mouse position.
    var x = (event as any).pageX || ((event as any).clientX + (document.documentElement.scrollLeft || document.body.scrollLeft));
    var y = (event as any).pageY || ((event as any).clientY + (document.documentElement.scrollTop || document.body.scrollTop));
 
    // Resolve touch position.
    var evTouches: TouchList
        = (event as any).touches;
    if (!!evTouches && !!evTouches.length && evTouches.length > 0 && !!evTouches[0]) {
        if (isNaN(x) || x == null)
            x = evTouches[0].pageX;
        if (isNaN(y) || y == null)
            y = evTouches[0].pageX;
    } else {
        evTouches
            = (event as any).changedTouches;
        if (!!evTouches && !!evTouches.length && evTouches.length > 0 && !!evTouches[0]) {
            if (isNaN(x) || x == null)
                x = evTouches[0].pageX;
            if (isNaN(y) || y == null)
                y = evTouches[0].pageX;
        }
    }
 
    // Return result as a coordinate.
    return { x: x, y: y };
}
```

So it can get mouse position or touch position. Now, let's turn back to the main function.

If an end user uses the mouse to slide, a series events will be raised.
1. A mouse down event.
2. Continuous mouse move events.
3. A mouse up event.

The user need keep pressing the mouse button to do the action. So everything about moving will be in mouse down event.

```typescript
var mouseDown = (ev: MouseEvent) => {
    var mStartP = getMousePosition();
 
    // ToDo: Implement it.
};
ele.addEventListener("mousedown", mouseDown, false);
```

After get the mouse position in mouse down event handler, we need register mouse move event handler to call moving handler registered in options.

```typescript
var mouseMove = (ev: MouseEvent) => {
    var mCurP = getMousePosition();
    var x = mCurP.x - mStartP.x;
    var y = mCurP.y - mStartP.y;
    options.moving(ele, x, y);
};
document.body.addEventListener("mousemove", mouseMove, false);
```

And also mouse up event handler. The mouse up handler needs call the end moving function. But before this, it needs remove the both of mouse move event handler and mouse up event handler itself; otherwise, they will not release after end moving. To implement the release logic, we can use a list to record which handlers should be processed. Then register the mouse up handler to run the list one by one.

```typescript
var mouseUpHandlers = [];
var mouseUp = (ev: MouseEvent) => {
    mouseUpHandlers.forEach((h, hi, ha) => {
        h(ev);
    });
};
mouseUpHandlers.push(
    () => {
        document.body.removeEventListener("mousemove", mouseMove, false);
    },
    () => {
        document.body.removeEventListener("mouseup", mouseUp, false);
    },
    (ev: MouseEvent) => {
        var mCurP = getMousePosition();
        var x = mCurP.x - mStartP.x;
        var y = mCurP.y - mStartP.y;
        moved(x, y);
    }
);
document.body.addEventListener("mouseup", mouseUp, false);
```

So it can handle mouse events now.

## Complete rest

After these, we need return a disposable object to support removing these event handlers.

```typescript
return {
    dispose: () => {
        // Remove touch events.
        ele.removeEventListener("touchstart", touchStart, false);
        if (!!touchMove)
            ele.removeEventListener("touchmove", touchMove, false);
        ele.removeEventListener("touchend", touchEnd, false);
 
        // Remove mouse event.
        ele.removeEventListener("mousedown", mouseDown, false);
    }
};
```

Now, we have completed this function. Following is the code.

```typescript
/**
  * Adds gesture handlers.
  * @param element  the target element.
  * @param options  the options.
  */
export function addSlide(element: HTMLElement | string, options: SlideOptionsContruct) : { dispose(): void } {
    if (!options || !element) return {
        dispose: () => { }
    };
 
    // Get the element.
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element as HTMLElement;
    if (!ele) return {
        dispose: () => { }
    };
 
    // Get the minimum moving distances.
    var minX: number = options.minX;
    var minY: number = options.minY;
    if (minX == null || minX < 0) minX = 1;
    minX = Math.abs(minX);
    if (minY == null || minY < 0) minY = 1;
    minY = Math.abs(minY);
 
    // The handler occured after moving.
    var moved = (x: number, y: number) => {
        var isX = !y || (Math.abs(x) / Math.abs(y) > (minX + 0.01) / (minY + 0.01));
        if (isX) {
            if (x > minX && !!options.turnLeft)
                options.turnLeft(ele, x);
            else if (x < -minX && !!options.turnRight)
                options.turnRight(ele, -x);
        } else {
            if (y > minY && !!options.turnUp)
                options.turnUp(ele, y);
            else if (y < -minY && !!options.turnDown)
                options.turnDown(ele, -y);
        }
 
        if (!!options.moveEnd)
            options.moveEnd(ele, x, y);
    };
 
    // Touch starting event handler.
    var start: { x: number, y: number } = null;
    var touchStart = (ev: TouchEvent) => {
        start = {
            x: ev.targetTouches[0].pageX,
            y: ev.targetTouches[0].pageY
        };
        if (!!options.moveStart)
            options.moveStart(ele);
    };
    ele.addEventListener("touchstart", touchStart, false);
 
    // Touch moving event handler.
    var touchMove = !!options.moving ? (ev: TouchEvent) => {
        var point = (ev.touches ? ev.touches[0] : ev) as Touch;
        if (!point) return;
        var coor = {
            x: point.pageX - start.x,
            y: point.pageY - start.y
        };
        options.moving(ele, coor.x, coor.y);
    } : null;
    if (!!touchMove)
        ele.addEventListener("touchmove", touchMove, false);
 
    // Touch ending event handler.
    var touchEnd = (ev: TouchEvent) => {
        if (start == null) return;
        var x = ev.changedTouches[0].pageX - start.x;
        var y = ev.changedTouches[0].pageY - start.y;
        start = null;
        moved(x, y);
    };
    ele.addEventListener("touchend", touchEnd, false);
 
    // Mouse event handler.
    var mouseDown = (ev: MouseEvent) => {
        // Record current mouse position
        // when mouse down.
        var mStartP = getMousePosition();
 
        // Mouse moving event handler.
        var mouseMove = (ev: MouseEvent) => {
            var mCurP = getMousePosition();
            var x = mCurP.x - mStartP.x;
            var y = mCurP.y - mStartP.y;
            options.moving(ele, x, y);
        };
        document.body.addEventListener("mousemove", mouseMove, false);
 
        // Mouse up event handler.
        // Need remove all mouse event handlers.
        var mouseUpHandlers = [];
        var mouseUp = (ev: MouseEvent) => {
            mouseUpHandlers.forEach((h, hi, ha) => {
                h(ev);
            });
        };
        mouseUpHandlers.push(
            () => {
                document.body.removeEventListener("mousemove", mouseMove, false);
            },
            () => {
                document.body.removeEventListener("mouseup", mouseUp, false);
            },
            (ev: MouseEvent) => {
                var mCurP = getMousePosition();
                var x = mCurP.x - mStartP.x;
                var y = mCurP.y - mStartP.y;
                moved(x, y);
            }
        );
        document.body.addEventListener("mouseup", mouseUp, false);
    };
    ele.addEventListener("mousedown", mouseDown, false);
 
    // Return a disposable object
    // for removing all event handlers.
    return {
        dispose: () => {
            // Remove touch events.
            ele.removeEventListener("touchstart", touchStart, false);
            if (!!touchMove)
                ele.removeEventListener("touchmove", touchMove, false);
            ele.removeEventListener("touchend", touchEnd, false);
 
            // Remove mouse event.
            ele.removeEventListener("mousedown", mouseDown, false);
        }
    };
}
```

## Test

Now you can have a test. Suppose we have following elements.

```html
<div id="demo_gesture">
    <div id="demo_gesture_fore">
        &nbsp;
    </div>
</div>
```

The style is following.

```css
#demo_gesture {
    max-width: 800px;
    height: 20px;
    background-color: #EEE;
    border: 1px solid #CCC;
    border-radius: 10px;
    position: relative;
    overflow: hidden;
}
#demo_gesture > #demo_gesture_fore {
    color: #CCC;
    text-align: center;
    width: 20px;
    height: 20px;
    background-color: #CCC;
    border-radius: 10px;
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
    cursor: pointer;
}
```

After document is ready, we can execute following JavaScript.

```typescript
var adjustPosition = function (ele, x) {
    x = (ele.position || 0) + x;
    if (x < 0)
        x = 0;
    else if (x > ele.parentElement.offsetWidth - ele.offsetWidth)
        x = ele.parentElement.offsetWidth - ele.offsetWidth;
    ele.style.left = x + "px";
    return x;
};
addSlide("demo_gesture_fore", {
    moving: function (ele, pos) {
        adjustPosition(ele, pos.x);
    },
    moveEnd: function (ele, pos) {
        ele.position = adjustPosition(ele, pos.x);
    }
});
```

Now, you can continue to implement lots of components which need sliding by touching or mouse.
