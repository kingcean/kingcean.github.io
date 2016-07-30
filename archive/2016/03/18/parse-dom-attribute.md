We always need store something in one or more attributes of DOM when we are developing a web page especially using data binding or web component. The format of the data in the attribute may be complex like the one in style attribute which will be parsed by browser and be described as element style to apply so we do not need to do further things. But at the same time, if we want to have the same capability to parse a customized DOM attribute of which value format is like that to resolve as a JSON object, how can we do? For example, we have following element.

```html
<sample-input data-config="type: 'select', label: 'Gender', require: true, dropdown: [ 'Male', 'Female' ]">
</sample-input>
```

We want to resolve its data-config attribute to get its properties.

## Parse

We need read it as string firstly. And then deserialize it as following steps.

1. Add a couple of outermost braces so that it will be a JSON formatted string.
2. Resolve the JSON object.

So we write following Type Script code.

```typescript
export function attr(element: HTMLElement | string, name: string) {
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element as HTMLElement;
    if (!ele || !ele.tagName || !name) return undefined;
    var attrStr = ele.getAttribute(name);
    return eval("({" + attrStr + "})");
}
```

Sounds it's a piece of cake and we can get following object expected now.

```json
{
    type: 'select',
    label: 'Gender',
    require: true,
    dropdown: ['Male', 'Female']
}
```

However, considering if it is just a function and we want to get the function.

```html
<sample-input data-config="function () { return null; }">
</sample-input>
```

Or even if it is a real JSON formatted string. Of course it will be failed to parse because we add the additional braces.

```html
<sample-input data-config="{ type: 'select', label: 'Gender', require: true, dropdown: [ 'Male', 'Female' ] }">
</sample-input>
```

For string, number, Boolean or array, it will fail to parse, neither. So how about to remove those braces and we do not support the first case? I think we have a better way that is to check the attribute string and optimize the parse loci as following.

1. Test if it is empty.
2. Trim.
3. Find if character "{" or ":" is at the special position in the string. If so, we should not add the outermost braces; otherwise, do as what you do before.

Then we write following code.

```typescript
if (!attrStr) return null;
attrStr = attrStr.replace(/(^\s*)|(\s*$)/g, "");
var indexA = attrStr.indexOf(":");
var indexB = attrStr.indexOf("{");
attrStr = indexA > 0 && (indexB < 0 || indexA < indexB) ? eval("({" + attrStr + "})") : eval("(" + attrStr + ")");
```

What about the tags value separated by semicolon?

```html
<sample-input data-config="a;b;c">
</sample-input>
```

We need add following code to support.

```typescript
if (indexA < 0 && indexB < 0 && attrStr.indexOf("=") < 0 && attrStr.indexOf("'") < 0 &&
    attrStr.indexOf("\"") < 0 && attrStr.indexOf("(") < 0 && attrStr.indexOf(")") < 0 && attrStr.indexOf(" ") > 0) {
    attrStr = attrStr.indexOf(";") >= 0 ? attrStr.split(";") : attrStr as any;
}
```

Wow, sounds the function is done! But wait, I just want add one more case which is about data binding syntax as following to output a specific variable.

```html
<sample-input data-config="{{dataConfig}}">
</sample-input>
```

OK, we will add following code to resolve. And it is very simple.

```typescript
if (attrStr.indexOf("{{") === 0 && attrStr.lastIndexOf("}}") === attrStr.length - 2 && attrStr.length > 4) {
    attrStr = eval("(" + attrStr.substring(2, attrStr.length - 2) + ")");
}
```

Finally, we have finished the implementation of the DOM attribute parsing. Following is the code we write.

```typescript
/**
  * Parses the specific attribute object of an element.
  * @param element  the element to get attribute.
  * @param name  the attribute name.
  */
export function attr<T>(element: HTMLElement | string, name: string): T {
    var ele = !!element && typeof element === "string"
        ? document.getElementById(element) : element as HTMLElement;
    if (!ele || !ele.tagName || !name) return undefined;
    var attrStr = ele.getAttribute(name);
 
    if (!attrStr) return null;
    attrStr = attrStr.replace(/(^\s*)|(\s*$)/g, "");
    if (attrStr === "") return null;
    if (attrStr.indexOf("{{") === 0
        && attrStr.lastIndexOf("}}") === attrStr.length - 2
        && attrStr.length > 4) {
        return eval("(" + attrStr.substring(2, attrStr.length - 2) + ")");
    }
 
    var indexA = attrStr.indexOf(":");
    var indexB = attrStr.indexOf("{");
    if (indexA > 0 && (indexB < 0 || indexA < indexB)) {
        return eval("({" + attrStr + "})");
    }
 
    if (indexA < 0 && indexB < 0 && attrStr.indexOf("=") < 0
        && attrStr.indexOf("'") < 0 && attrStr.indexOf("\"") < 0
        && attrStr.indexOf("(") < 0 && attrStr.indexOf(")") < 0
        && attrStr.indexOf(" ") > 0) {
        return attrStr.indexOf(";") >= 0
            ? attrStr.split(";")
            : attrStr as any;
    }
 
    return eval("(" + attrStr + ")");
}
```

And now you can have a test and it will work as what we expect.

## Binding

However, sometimes people will not satisfy what they have already owned. Although we have a way to parse attribute in a DOM, perhaps we want to find an easy way to resolve an object which binds given attributes as its properties. That means we need a function to output an object with some properties which bind the specific attributes of a DOM and the property will be changed if the attribute is updated.

So let's implement it now! Firstly, we need parse all the given attributes to set as the properties of the object returned.

```typescript
export function bindAttr(
    element: HTMLElement | string, names: string[]): any {
    var ele = !!element && typeof element === "string"
        ? document.getElementById(element)
        : element as HTMLElement;
    if (!ele || !ele.tagName || !names) return undefined;
 
    var obj: any = {};
    names.forEach((attrName, i, arr) => {
        var attr = attr(element, attrName);
        obj[attrName] = attr;
    });
 
    return obj;
}
```

Now, we can load the attributes from a DOM to set as properties in an object to return. But if the attribute has been changed, we cannot get the notification. So we need add logic to register the event handler to listen. It will update the property during the attribute is changed.

```typescript
var listener = (ev: any) => {
    var attrName = ev.attrName || ev.propertyName;
    if (!attrName || !names || !names.some((name, ni, narr) => {
        return name === attrName;
    })) return;
    var attrObj = attr(element, attrName);
    obj[attrName] = attrObj;
};
ele.addEventListener(
    "DOMAttrModified",
    listener,
    false);
```

As you seen, this have registered an event handler now. And we also need remove this event handler if the binding object returned is no longer needed. So we make the object returned as disposable.

```typescript
obj.dispose = function () {
    ele.removeEventListener(
        "DOMAttrModified",
        listener,
        false);
};
```

And we can also add an argument to switch whether we need disable the listener. So we optimize this function as following.

```typescript
/**
  * Binds the objects parsed from specific attributes of an element
  *  to an object as its properties.
  * @param element  the element to get attribute.
  * @param names  the attribute name list.
  * @param loadOnce  true if just load once without attribute listening; 
  *     otherwise, false.
  */
export function bindAttr<T>(
    element: HTMLElement | string,
    names: string[],
    loadOnce = false): T {
    var ele = !!element && typeof element === "string"
        ? document.getElementById(element)
        : element as HTMLElement;
    if (!ele || !ele.tagName || !names) return undefined;
 
    var obj: any = {};
    names.forEach((attrName, i, arr) => {
        var attr = attr(element, attrName);
        obj[attrName] = attr;
    });
 
    if (!loadOnce) {
        var listener = (ev: any) => {
            var attrName = ev.attrName || ev.propertyName;
            if (!attrName || !names
                || !names.some((name, ni, narr) => {
                return name === attrName;
            })) return;
            var attrObj = attr(element, attrName);
            obj[attrName] = attrObj;
        };
        ele.addEventListener(
            "DOMAttrModified",
            listener,
            false);
        obj.dispose = () => {
            ele.removeEventListener(
                "DOMAttrModified",
                listener,
                false);
        };
    }
 
    return obj;
}
```

Enjoy!
