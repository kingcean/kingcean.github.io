To design a web app for different countries and regions, we need add globalization and localization supports. For C# user, you can use resource file and other utilities. But for web software development, how can we build a module to organize these information? You may use back-end template engine to render pages, and web services to send back data in local; but for client side, I will introduce a way to set up string resources for localization in Type Script.

## Requirement

Because perhaps a web app is made by different components. Each component can has its own local information. So we will use a class to store local information for each component. The class should contain following functions.

- Gets or sets a default language pack.
- Registers strings.
- Gets a local string.
- Gets or sets a string of a specific language.
- The language code is marked by ISO 639.

So we get following class.

```typescript
class Local {
    public defaultLang: string;
 
    public regStrings(lang: string, value: any) {
        // ToDo: Implement it
    }
 
    public getString(key: string, lang?: string): string {
        // ToDo: Implement it
        return null;
    }

    public specificString(lang: string, key: string, value?: string): string {
        // ToDo: Implement it
        return null;
    }
}
```

We can initialize an instance of Local class to maintain a strings resource for each language.

## Local culture

Before implement Local class, we need an important helper that is to resolve local culture information. We can use a variable to save the language and provide a function to get and set.

```typescript
namespace Local {
 
    var _lang: string;
 
    export function lang(value?: string): string {
        if (arguments.length > 0 && !!value) {
            _lang = value.toString().toLowerCase();
        }
 
        return _lang;
    }
}
```

But in fact, we can load culture information from end user's browser.

```typescript
_lang = document.documentElement.lang
    || navigator.language
    || navigator.userLanguage
    || navigator.browserLanguage
    || navigator.systemLanguage;
```

To add a way to load automatically, we can extend the original function to support to pass both auto resolving or specific value. So we change the type of the argument from string to string or Boolean for following cases.

- Do nothing but just return current language if no argument passed. If current language code is not set, call itself to pass the argument as true.
- Set as the language code if the type of value is a string.
- Load culture information from browser if the value is true.
- Use the default language if the value is false.

So we can add a variable for default language code and update the function to get or set the current language code.

```typescript
namespace Local {
 
    var _lang: string;
 
    /**
      * Gets or sets the default language.
      */
    export var defaultLang = "en";
 
    /**
      * Gets or sets current ISO 639 code.
      * @param value  The optional market code to set.
      */
    export function lang(value?: string | boolean): string {
        if (arguments.length > 0 && !!value) {
            if (typeof value === "string") {
                _lang = value;
            } else if (typeof value === "boolean") {
                _lang = value ? document.documentElement.lang || navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage : defaultLang;
            }
            if (!!_lang) _lang = _lang.toString().toLowerCase();
        } else {
            if (_lang == null) lang(true);
        }
 
        return _lang;
    }
}
```

So when we need get current language, we just call this function without any argument. Now you can have a test for it.

```javascript
// Suppose current environment is in English "en".
 
// Expect to print "en".
console.debug(Local.lang());
 
// Expect to print "zh-Hans".
console.debug(Local.lang("zh-Hans"));
 
// Expect to print "zh-Hans".
console.debug(Local.lang());
 
// Expect to print "en".
console.debug(Local.lang(true));
```

It can return the correct language code.

## Register language packs

Now let's turn back to the `Local` class.

Firstly, we need a data container to store all strings in the class.

```typescript
private _strings = {};
```

To register a strings set for a language, we can just add the set to the strings container.

```typescript
public regStrings(lang: string, value: any) {
    if (!lang) return;
    var key = lang.toString().toLowerCase();
    if (!value) {
        delete this._strings[key];
        return;
    }
 
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean" || typeof value === "function" || value instanceof Array) return;
    this._strings[key] = value;
}
```

Sometimes, we need just append a language pack to original one. So we can extend it.

```typescript
/**
  * Registers a language pack.
  * @param lang  The market code.
  * @param value  The language pack.
  * @param override  true if override original one if existed; otherwise, false.
  */
public regStrings(lang: string, value: any, override = false) {
    if (!lang) return;
    var key = lang.toString().toLowerCase();
    if (!value) {
        delete this._strings[key];
        return;
    }
 
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean" || typeof value === "function" || value instanceof Array) return;
    if (override || !this._strings[key]) {
        this._strings[key] = value;
    } else {
        var obj = this._strings[key];
        for (var prop in value) {
            obj[prop] = value[prop];
        }
    }
}
```

Let's have a test.

```javascript
// Create a Local instance.
var local = new Local();
 
// Set up an English language pack.
var lp_en = {
    greetings: "Hello!",
    goodbye: "Bye!"
};
local.regStrings("en", lp_en);
 
// Set up an Simplified Chinese language pack.
var lp_hans = {
    greetings: "你好！",
    goodbye: "再见！"
};
local.regStrings("zh-Hans", lp_hans);
local.regStrings("zh-CN", lp_hans);
local.regStrings("zh-SG", lp_hans);
```

So we can register any language pack in the business components now.

## Access the string

To get a specific string in local, we need have a way to resolve the language pack firstly. So we will have a private member method as following to resolve a string set by loading from the strings container directly.

```typescript
private _getStrings(lang?: string): any {
    if (lang == null) lang = Local.lang();
    if (!lang) {
        return undefined;
    }
 
    return this._strings[lang.toString().toLowerCase()];
}
```

We also need a way to register an empty one if no such language set. So we modify this method as following.

```typescript
private _getStrings(lang?: string, init?: boolean): any {
    if (lang == null) lang = Local.lang();
    if (!lang) return {};
 
    lang = lang.toString().toLowerCase();
    if (!this._strings[lang]) {
        if (init == true) {
            this._strings[lang] = {};
            return this._strings[lang];
        }
 
        return {};
    }
 
    return this._strings[lang];
}
```

Then, we can add a member method for getting a string for a specific language.

```typescript
public specificString(lang: string, key: string) : string {
    return this._getStrings(lang)[key];
}
```

This method can be optimized to add a setter way.

```typescript
/**
  * Gets or sets the string for a specific market.
  * @param lang  The market code.
  * @param key  The template key.
  * @param value  The opitonal value to set.
  */
public specificString(lang: string, key: string, value?: string) : string {
    if (arguments.length > 2) {
        var strings = this._getStrings(lang, true);
        strings[key] = value;
    }
 
    return this._getStrings(lang)[key];
}
```

And following is for getting the string in local language.

```typescript
/**
  * Gets or sets local string.
  * @param key  The template key.
  * @param value  The opitonal value to set.
  */
public localString(key: string, value?: string): string {
    return arguments.length > 1 ? this.specificString(Local.lang(), key, value) : this.specificString(Local.lang(), key);
}
```

Let's continue the previous test.

```javascript
// Append to the previous test code.
// var local = new Local();
// ...
// Suppose current environment is in "en".
 
// "Hello!"
console.debug(local.localString("greetings"));
 
// "Hi!"
console.debug(local.localString("greetings", "Hi!"));
 
// "Hi!"
console.debug(local.localString("greetings"));
 
// undefined
console.debug(local.localString("what"));
 
// "What?"
console.debug(local.localString("what", "What?"));
 
// "What?"
console.debug(local.localString("what"));
 
// "你好！"
console.debug(local.specificString("greetings", "zh-Hans"));
 
// "嗨！"
console.debug(local.specificString("greetings", "zh-Hans", "嗨！"));
```

However, considering a scenario that if there is only an English strings set which is coded as en but the current environment is set to en-us, it will resolve nothing. We need a new method to get a closed string from current culture or the specific one.

## Resolve a string in local

For this goal, we can do as following steps.

1. Try to get the string of specific language. If has, just return it; otherwise, continue.
2. Check if has a dash in the language code. If has, continue; otherwise, return the string in default language.
3. Search the last dash "-" in the current or given language code.
4. Remove any characters after that dash, and the dash itself. So we get its parent language code.
5. Turn back to the first step.

So we get following code.

```typescript
/**
  * Gets the string in local or specific language.
  * @param key  The template key.
  * @param useKeyInsteadOfUndefined  true if use key as result instead of undefined; otherwise, false.
  * @param lang  The opitonal ISO 639 code string for a sepecific one.
  */
public getString(key: string, useKeyInsteadOfUndefined = false, lang?: string): string {
    var langCode = !lang ? Local.lang() : lang;
    if (!langCode || langCode == "")
        langCode = this.defaultLang;
    var str = this.specificString(langCode, key);
    if (!!str || typeof str !== "undefined")
        return str;
    while (langCode.lastIndexOf("-") > 1) {
        langCode = langCode.substring(0, langCode.lastIndexOf("-"));
        str = this.specificString(langCode, key);
        if (!!str || typeof str !== "undefined") return str;
    }
 
    return useKeyInsteadOfUndefined ? key : undefined;
}
```

So that we can get a string for current environment now. Let's have a test.

```javascript
// Append to the previous test code.
// var local = new Local();
// ...
// Suppose current environment is in "en".
 
// "Bye!"
console.debug(local.getString("goodbye"));
 
// Undefined
console.debug(local.getString("hello"));
 
// "hello"
console.debug(local.getString("hello", true));
 
// "再见！"
console.debug(local.getString("bye", false, "zh-Hans"));
```

Sometimes, you may want to copy the strings in local for usages, e.g. you need add a property with local strings in scope object in AngularJs. So we can add a copy method for specific strings.

```typescript
public copyStrings(keys: string[]): any {
    var obj = {};
    keys.forEach((key, i, arr) => {
        obj[key] = this.localString(key);
    });
    return obj;
}
```

And we can optimize it to support what if the user want to copy all the strings from local language pack.

```typescript
/**
  * Copies a set of strings to an object as properties.
  * @param keys  The template keys.
  */
public copyStrings(keys?: string[]): any {
    var obj = {};
    if (keys == null) {
        var lp = this._getStrings();
        for (var key in lp) {
            if (!key || typeof key !== "string")
                continue;
            obj[key] = lp[key];
        }
 
        return obj;
    }
 
    keys.forEach((key, i, arr) => {
        obj[key] = this.localString(key);
    });
    return obj;
}
```

Following is the test code append to previous one.

```javascript
// Append to the previous test code.
// var local = new Local();
// ...
// Suppose current environment is in "en".
 
var strings = local.copyStrings(["greetings", "goodbye"]);

// "Bye!"
console.debug(strings.goodbye); 
 
// Undefined
console.debug(strings.hello);
 
// "Hi!"
console.debug(strings.greetings);
```

Well, you will see it works as what we expect so that you can use this anywhere for localization.
