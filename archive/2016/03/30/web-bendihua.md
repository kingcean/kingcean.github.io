有时候，我们需要设计和制作全球化的站点，这些站点有一个特点，那就是要适应许多地区和文化，其中包括，站点中的一些内容要根据实际使用情况进行本地化。许多情况下，后端会输出本地化之后的内容，甚至有时候，不同地区和语言的网站都是不同的。然而，如果在某一场景内，需要通过 Web 前端来进行已知内容的本地化控制，例如一些文本的设置，这时便需要通过 Web 前端本地化技术来实现。熟悉 C# 开发的工程师可能都非常了解资源文件在本地化方面起到的作用；然而，当进入 JavaScript 的世界后，似乎至少当前版本本身并没有内置支持这类自动化的本地化功能，因此，需要通过一些方式，来实现这一切。

## 基本需求

由于 Web 应用可能由多个组件构成，每个组件有其独立的本地化信息，为此，我们需要设计一套通用方案，来分别为这些组件提供这类服务而互补干扰，同时支持以下这些功能。

- 能够设置默认语言。
- 可以注册语言包。
- 可以获取指定本地化文本。
- 可以设置或获取某一特定语言的文本。
- 符合 ISO 639 规范。

为此，我们需要通过一个类来实现，这个类会被用于任何需要用到资源组的地方，不同模块可以初始化不同的实例，从而做到相互隔离。为了统一，以下均用 ECMA Script 5 来描述。

```javascript
var Local = function () {  
    this.defaultLang = null; // 默认语言。  
    this._strings = {}; // 语言包。  
};  
Local.prototype.regStrings = function (lang, value) {  
    // ToDo: Implement it. 注册语言包。  
};  
Local.prototype.getString = function (key, lang) {  
    // ToDo: Implement it. 获取某一本地文本。  
};  
Local.prototype.specificString = function (lang, key, value) {  
    // ToDo: Implement it. 获取或设置某一特定语言的某一文本。  
};
```

不过在此上面的这些 To-Do 之前，我们还需要先行搞定一件事情：获取当前的语言。

## 获取和设置当前语言

当前的语言指的是相对于当前页面的一个全局变量，用于标识当前使用哪个语言，我们需要用到一个变量来存储当前的语言，然后使用一个方法将其暴露出来，这个方法也提供设置功能。为了防止这个变量的引用暴露，我们在外面用一个匿名函数将其包起来，然后立即执行。

```javascript
(function () {  
    var _lang;  
    Local.lang = function (value) {  
        if (arguments.length > 0 && !!value) {  
            _lang = value.toString().toLowerCase();  
        }  
  
        return _lang;  
    }  
})();
```

然而，这样太不够自动化了。至少，我们还是有办法获取到当前用户的语言使用情况的。

```javascript
_lang = document.documentElement.lang
    || navigator.language  
    || navigator.userLanguage  
    || navigator.browserLanguage  
    || navigator.systemLanguage;
```

但是这段代码加在哪里最合适呢？事实上，我们可以对 Local.lang 函数进行改写，使其支持自动和手动两种模式。

- 如果传入参数为字符串，那么此即语言代号，记录之。
- 如果传入的参数为 true，则启用自动模式来设置值，设置值的方式如前面所述。如果实在获取不到，那么使用预设的一个默认值。
- 如果传入的参数为 false，那么意味着取消之前的设置，切换回默认值。
- 当没有传入参数，或传入参数为空时，返回当前值。如果当前没有值，采用自动模式自行先设置一个值，然后再取出来。

于是，该函数即被调整如下，同时多加入了一个属性，即默认语言。

```javascript
Local.defaultLang = "en";  
  
/** 
  * 获取或设置当前的语言标识符，使用 ISO 639 里的代码表示。 
  * @param value  可选。设置值。 
  */  
Local.lang = function (value) {  
    if (arguments.length > 0 && !!value) {  
        if (typeof value === "string") {  
            _lang = value;  
        } else if (typeof value === "boolean") {  
            _lang = value ? document.documentElement.lang
                    || navigator.language  
                    || navigator.userLanguage 
                    || navigator.browserLanguage 
                    || navigator.systemLanguage 
                : defaultLang;  
        }  
        if (!!_lang) _lang = _lang.toString().toLowerCase();  
    } else {  
        if (_lang == null) lang(true);  
    }  
  
    return _lang;  
}
```

因此，我们现在可以非常方便地获取或设置当前语言环境了。

```javascript
// 假设当前处于简体中文环境 "zh-Hans"。  
console.debug(Local.lang()); // zh-Hans  
console.debug(Local.lang("en")); // en  
console.debug(Local.lang()); // en  
console.debug(Local.lang(true)); // zh-Hans 
```

有了语言的获取和设置，我们要开始实现那个类了。

## 注册语言包

好极了！我们要开始实现一项很重要的功能，即注册语言包。通常情况下，使用者会希望以一个 JSON 的形式，批量将语言文本集合以 Key-Value 对的形式扔进来，Key 即用来作为索引的标识，而 Value 则为对应语言的文本内容。所支持的不同语言各需要一个对应的 JSON 数据，理论上里面应当包含相同的内容。当然，由于我们计划支持类似于继承的模型，以及事后更改的能力，所以关于所有 JSON 字段是否相同，并不需要严格遵循。那么，接下来，我们需要继续在 `Local` 类里面，去实现 `regStrings` 方法，代码如下。

```javascript
Local.prototype.regStrings = function (lang, value) {  
    if (!lang) return;  
    var key = lang.toString().toLowerCase();  
    if (!value) {  
        delete this._strings[key];  
        return;  
    }  
   
    if (typeof value === "number"  
        || typeof value === "string"  
        || typeof value === "boolean"  
        || typeof value === "function"  
        || value instanceof Array) return;  
    this._strings[key] = value;  
}
```

不过，本人感觉似乎不是很满意。有的时候，我们可能会调用该方法多次，哪怕是针对同一语言。这的确有可能发生，因为有的模块可能希望对该语言包进行批量扩充。因此，我们打算提供一套更好的方式，来满足这种需求。对此，我们还提供了一个额外的参数，来标明是否需要覆盖原先的设定，默认情况下为否，即只是扩充。

```javascript
/** 
  * 注册一个语言包。 
  * @param lang  语言编号。 
  * @param value  语言包对象。 
  * @param override  可选。如果需要覆盖，则为 true；否则，为 false，此为默认值。 
  */  
Local.prototype.regStrings = function (lang, value, override) {  
    if (!lang) return;  
    var key = lang.toString().toLowerCase();  
    if (!value) {  
        delete this._strings[key];  
        return;  
    }  
   
    if (typeof value === "number"  
        || typeof value === "string"  
        || typeof value === "boolean"  
        || typeof value === "function"  
        || value instanceof Array) return;  
    if (override || !this._strings[key]) {  
        this._strings[key] = value;  
    } else {  
        var obj = this._strings[key];  
        for (var prop in value) {  
            obj[prop] = value[prop];  
        }  
    }  
}
```

嗯，让我们来做一个测试吧。

```javascript
// Create a Local instance.  
var local = new Local();  
   
// Set up an English language pack.  
var lp_en = {  
    greetings: "Hello!",  
    goodbye: "Bye!"  
};  
local.regStrings("en", lp_en);  
   
// Set up an Simplified Chinese language pack.  
var lp_hans = {  
    greetings: "你好！",  
    goodbye: "再见！"  
};  
local.regStrings("zh-Hans", lp_hans);  
local.regStrings("zh-CN", lp_hans);  
local.regStrings("zh-SG", lp_hans);
```

现在，我们可以为一个组件注册多国语言包啦！

## 访问本地化后的内容

接下来，也是一个比较核心的东西，那就是如何去读取和设置某一具体的文本。
获取本地的某一文本，首先当然是要获取该语言包。因此，我们需要一些辅助方法，来先行做到这一点。（如果需要隐藏这些私有方法，大家可以自行解决，因为这不是本文的重点，故在此不再描述，本文主要是介绍其实现原理。）

```javascript
Local.prototype._getStrings = function (lang) {  
    if (lang == null) lang = Local.lang();  
    if (!lang) {  
        return undefined;  
    }  
   
    return this._strings[lang.toString().toLowerCase()];  
}
```

为了防止意外，在这个方法里，我们还需要提供一项功能，即，如果该语言包并不存在，我们需要返回一个空的 JSON 对象，而不是空或未定义。因此我们又将该方法修改成了如下所示。

```javascript
Local.prototype._getStrings = function (lang, init) {  
    if (lang == null) lang = Local.lang();  
    if (!lang) return {};  
   
    lang = lang.toString().toLowerCase();  
    if (!this._strings[lang]) {  
        if (init == true) {  
            this._strings[lang] = {};  
            return this._strings[lang];  
        }  
   
        return {};  
    }  
   
    return this._strings[lang];  
}
```

然后，我们可以实现 `Local.specificString` 成员方法，以来支持获取或设置某一特定语言的文本了。

```javascript
/** 
  * 获取或设置某一特定语言的某一文本。 
  * @param lang  语言编号。 
  * @param key  文本对应的 Key。 
  * @param value  可选。设置文本值。 
  */  
Local.prototype.specificString = function (lang, key, value) {  
    if (arguments.length > 2) {  
        var strings = this._getStrings(lang, true);  
        strings[key] = value;  
    }  
   
    return this._getStrings(lang)[key];  
}
```

另外，也可以提供一个直接获取本地语言的某一文本的方法。

```javascript
/** 
  * 获取或设置某一本地文本。 
  * @param key  文本对应的 Key。 
  * @param value  可选。设置文本值。 
  */  
Local.prototype.localString = function (key, value) {  
    return arguments.length > 1 ? this.specificString(Local.lang(), key, value) : this.specificString(Local.lang(), key);  
}
```

我们接着前面的测试示例，继续来看看现在的实现。

```javascript
// Append to the previous test code.  
// var local = new Local();  
// ...  
// Suppose current environment is in "en".  
   
// "你好"  
console.debug(local.localString("greetings"));  
   
// "好不好呀？"  
console.debug(local.localString("greetings", "好不好呀？"));  
   
// "好不好呀？"  
console.debug(local.localString("greetings"));  
   
// undefined  
console.debug(local.localString("what"));  
   
// "什么？"  
console.debug(local.localString("what", "什么？"));  
   
// "什么？"  
console.debug(local.localString("what"));  
   
// "Hello!"  
console.debug(local.specificString("greetings", "en"));  
   
// "Hi!"  
console.debug(local.specificString("greetings", "zh-Hans", "Hi!"));
```

不过，考虑到你当前的浏览器语言是 zh-Hans-cn 而不是 zh-Hans 或 zh-cn，那么，你或许会发现这并不能获得到你想要的文本，因为并没有类似于继承的功能在这其中实现。这可怎么办？

## 获取当前语言的文本

如果在无法精准匹配当前语言的情况下，如何寻找上一层级的语言包，则是获取语言文本的最重要的一环。为此，我们需要实现以下步骤。

1. 尝试获取预期语言的对应文本，有的话则返回之，没有的话继续。
2. 检查语言代号标识中是否包含短横线（-），有的话则继续，没有的话则返回从默认语言的语言包中检索的结果。
3. 找到最后一个短横线。
4. 删除该短横线后面的内容。
5. 返回第一步，重新来一遍。

代码如下。

```javascript
/** 
  * Gets the string in local or specific language. 
  * @param key  The template key. 
  * @param useKeyInsteadOfUndefined  true if use key as result instead of undefined; otherwise, false. 
  * @param lang  The opitonal ISO 639 code string for a sepecific one. 
  */  
Local.prototype.getString = function (key, useKeyInsteadOfUndefined, lang) {  
    var langCode = !lang ? Local.lang() : lang;  
    if (!langCode || langCode == "") langCode = this.defaultLang;  
    var str = this.specificString(langCode, key);  
    if (!!str || typeof str !== "undefined") return str;  
    while (langCode.lastIndexOf("-") > 1) {  
        langCode = langCode.substring(0, langCode.lastIndexOf("-"));  
        str = this.specificString(langCode, key);  
        if (!!str || typeof str !== "undefined") return str;  
    }  
   
    return useKeyInsteadOfUndefined ? key : undefined;  
}
```

现在，我们可以获取最匹配的文本了。接着前面的测试代码，我们再来测试一下。

```javascript
// 继续上一段测试代码。  
// var local = new Local();  
// ...  
// 假设当前语言环境是 zh-Hans。  
  
console.debug(local.getString("goodbye"));  // "再见！"  
console.debug(local.getString("hello"));  // Undefined  
console.debug(local.getString("hello", true));  // "hello"  
console.debug(local.getString("bye", false, "en"));  // "Bye!"
```

是不是很棒？等等，还有更棒的！有的时候，你可能需要将一批需要用到的文本复制到一个对象上，例如，当使用诸如 AngularJs 时，你需要将这些信息存储到 `$scope` 中的某个属性里，以方便在视图中使用。因此，我们还需要提供一些类似方法，来支持这一类的功能，可以将指定的一组文本映射到一个对象上并返回。

```javascript
/** 
  * Copies a set of strings to an object as properties. 
  * @param keys  The template keys. 
  */  
Local.prototype.copyStrings(keys) {  
    var obj = {};  
    keys.forEach(function (key, i, arr) {  
        obj[key] = this.localString(key);  
    });  
    return obj;  
}
```

我们还可以对其进行优化，以支持复制当前语言包下所有的字符串。

```javascript
/**
  * Copies a set of strings to an object as properties.
  * @param keys  The template keys.
  */
Local.prototype.copyStrings(keys) {  
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
 
    keys.forEach(function (key, i, arr) {
        obj[key] = this.localString(key);
    });
    return obj;
}
```

然后我们继续来个简单的测试。

```javascript
// 继续上一段测试代码。  
// var local = new Local();  
// ...  
// 假设当前语言环境是 zh-Hans。  
  
var strings = local.copyStrings(["bye", "hello"]);  
console.debug(strings.goodbye);  // "再见"  
console.debug(strings.greetings);  // "嗨！"  
console.debug(strings.hello);  // Undefined
```

现在，你已经拥有了一套基本的 Web 前端本地化解决方案了。
