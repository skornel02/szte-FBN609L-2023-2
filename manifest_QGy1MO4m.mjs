import './chunks/astro_lrAK35tJ.mjs';

if (typeof process !== "undefined") {
  let proc = process;
  if ("argv" in proc && Array.isArray(proc.argv)) {
    if (proc.argv.includes("--verbose")) ; else if (proc.argv.includes("--silent")) ; else ;
  }
}

/**
 * Tokenize input string.
 */
function lexer(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
        var char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            var name = "";
            var j = i + 1;
            while (j < str.length) {
                var code = str.charCodeAt(j);
                if (
                // `0-9`
                (code >= 48 && code <= 57) ||
                    // `A-Z`
                    (code >= 65 && code <= 90) ||
                    // `a-z`
                    (code >= 97 && code <= 122) ||
                    // `_`
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError("Missing parameter name at ".concat(i));
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            var count = 1;
            var pattern = "";
            var j = i + 1;
            if (str[j] === "?") {
                throw new TypeError("Pattern cannot start with \"?\" at ".concat(j));
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError("Capturing groups are not allowed at ".concat(j));
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError("Unbalanced pattern at ".concat(i));
            if (!pattern)
                throw new TypeError("Missing pattern at ".concat(i));
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
    if (options === void 0) { options = {}; }
    var tokens = lexer(str);
    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
    var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
    var result = [];
    var key = 0;
    var i = 0;
    var path = "";
    var tryConsume = function (type) {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    var mustConsume = function (type) {
        var value = tryConsume(type);
        if (value !== undefined)
            return value;
        var _a = tokens[i], nextType = _a.type, index = _a.index;
        throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
    };
    var consumeText = function () {
        var result = "";
        var value;
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        var char = tryConsume("CHAR");
        var name = tryConsume("NAME");
        var pattern = tryConsume("PATTERN");
        if (name || pattern) {
            var prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix: prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        var value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        var open = tryConsume("OPEN");
        if (open) {
            var prefix = consumeText();
            var name_1 = tryConsume("NAME") || "";
            var pattern_1 = tryConsume("PATTERN") || "";
            var suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name_1 || (pattern_1 ? key++ : ""),
                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                prefix: prefix,
                suffix: suffix,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
/**
 * Compile a string to a template function for the path.
 */
function compile(str, options) {
    return tokensToFunction(parse(str, options), options);
}
/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction(tokens, options) {
    if (options === void 0) { options = {}; }
    var reFlags = flags(options);
    var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
    // Compile all the tokens into regexps.
    var matches = tokens.map(function (token) {
        if (typeof token === "object") {
            return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
        }
    });
    return function (data) {
        var path = "";
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (typeof token === "string") {
                path += token;
                continue;
            }
            var value = data ? data[token.name] : undefined;
            var optional = token.modifier === "?" || token.modifier === "*";
            var repeat = token.modifier === "*" || token.modifier === "+";
            if (Array.isArray(value)) {
                if (!repeat) {
                    throw new TypeError("Expected \"".concat(token.name, "\" to not repeat, but got an array"));
                }
                if (value.length === 0) {
                    if (optional)
                        continue;
                    throw new TypeError("Expected \"".concat(token.name, "\" to not be empty"));
                }
                for (var j = 0; j < value.length; j++) {
                    var segment = encode(value[j], token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError("Expected all \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                    }
                    path += token.prefix + segment + token.suffix;
                }
                continue;
            }
            if (typeof value === "string" || typeof value === "number") {
                var segment = encode(String(value), token);
                if (validate && !matches[i].test(segment)) {
                    throw new TypeError("Expected \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                }
                path += token.prefix + segment + token.suffix;
                continue;
            }
            if (optional)
                continue;
            var typeOfMessage = repeat ? "an array" : "a string";
            throw new TypeError("Expected \"".concat(token.name, "\" to be ").concat(typeOfMessage));
        }
        return path;
    };
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options && options.sensitive ? "" : "i";
}

function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments.map((segment) => {
    return "/" + segment.map((part) => {
      if (part.spread) {
        return `:${part.content.slice(3)}(.*)?`;
      } else if (part.dynamic) {
        return `:${part.content}`;
      } else {
        return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }).join("");
  }).join("");
  let trailing = "";
  if (addTrailingSlash === "always" && segments.length) {
    trailing = "/";
  }
  const toPath = compile(template + trailing);
  return toPath;
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    })
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  return {
    ...serializedManifest,
    assets,
    componentMetadata,
    clientDirectives,
    routes
  };
}

const manifest = deserializeManifest({"adapterName":"","routes":[{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-j7pv25f6]{max-width:1024px}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/","type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-10","type":"page","pattern":"^\\/jegyzokonyv-10\\/?$","segments":[[{"content":"jegyzokonyv-10","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-10.astro","pathname":"/jegyzokonyv-10","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-11","type":"page","pattern":"^\\/jegyzokonyv-11\\/?$","segments":[[{"content":"jegyzokonyv-11","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-11.astro","pathname":"/jegyzokonyv-11","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"object[data-astro-cid-v6ggcyrl]{border:none;width:100%;height:90vh}\nmain[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-1","type":"page","pattern":"^\\/jegyzokonyv-1\\/?$","segments":[[{"content":"jegyzokonyv-1","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-1.astro","pathname":"/jegyzokonyv-1","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"object[data-astro-cid-v6ggcyrl]{border:none;width:100%;height:90vh}\nmain[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-2","type":"page","pattern":"^\\/jegyzokonyv-2\\/?$","segments":[[{"content":"jegyzokonyv-2","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-2.astro","pathname":"/jegyzokonyv-2","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-3","type":"page","pattern":"^\\/jegyzokonyv-3\\/?$","segments":[[{"content":"jegyzokonyv-3","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-3.astro","pathname":"/jegyzokonyv-3","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-4","type":"page","pattern":"^\\/jegyzokonyv-4\\/?$","segments":[[{"content":"jegyzokonyv-4","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-4.astro","pathname":"/jegyzokonyv-4","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-5","type":"page","pattern":"^\\/jegyzokonyv-5\\/?$","segments":[[{"content":"jegyzokonyv-5","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-5.astro","pathname":"/jegyzokonyv-5","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-6","type":"page","pattern":"^\\/jegyzokonyv-6\\/?$","segments":[[{"content":"jegyzokonyv-6","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-6.astro","pathname":"/jegyzokonyv-6","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-7","type":"page","pattern":"^\\/jegyzokonyv-7\\/?$","segments":[[{"content":"jegyzokonyv-7","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-7.astro","pathname":"/jegyzokonyv-7","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-8","type":"page","pattern":"^\\/jegyzokonyv-8\\/?$","segments":[[{"content":"jegyzokonyv-8","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-8.astro","pathname":"/jegyzokonyv-8","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/szte-FBN609L-2023-2/_astro/hoisted.OO6LGCG_.js"}],"styles":[{"type":"external","src":"/szte-FBN609L-2023-2/_astro/index.LNbUDhu7.css"},{"type":"inline","content":"main[data-astro-cid-xyyvcguv]{max-width:1024px}.giscus-comments[data-astro-cid-xyyvcguv]{margin-top:2rem;margin-bottom:4rem}@media print{.divider[data-astro-cid-xyyvcguv],.giscus-comments[data-astro-cid-xyyvcguv]{display:none}}\n@media print{nav[data-astro-cid-5blmo7yk]{display:none}}@page{size:A4;margin:0}@media print{html,body{width:210mm;height:297mm}.pagebreak[data-astro-cid-sckkx6r4]{page-break-before:always}}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}.bom{width:80%;max-width:350px;margin:0 auto;padding:0 1rem 1rem;background-color:#c8c8c8c4;border-radius:1rem}.bom>h3{border-bottom:1px solid #000000;text-align:center;font-size:120%}.bom>ul>li{list-style:square;margin:.25rem 1rem}\n"}],"routeData":{"route":"/jegyzokonyv-9","type":"page","pattern":"^\\/jegyzokonyv-9\\/?$","segments":[[{"content":"jegyzokonyv-9","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/jegyzokonyv-9.astro","pathname":"/jegyzokonyv-9","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}}],"site":"https://skornel02.github.io","base":"/szte-FBN609L-2023-2","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-1.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-10.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-11.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-2.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-3.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-4.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-5.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-6.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-7.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-8.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/jegyzokonyv-9.astro",{"propagation":"none","containsHead":true}],["/home/runner/work/szte-FBN609L-2023-2/szte-FBN609L-2023-2/website/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var i=t=>{let e=async()=>{await(await t())()};\"requestIdleCallback\"in window?window.requestIdleCallback(e):setTimeout(e,200)};(self.Astro||(self.Astro={})).idle=i;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener(\"change\",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var r=(i,c,s)=>{let n=async()=>{await(await i())()},t=new IntersectionObserver(e=>{for(let o of e)if(o.isIntersecting){t.disconnect(),n();break}});for(let e of s.children)t.observe(e)};(self.Astro||(self.Astro={})).visible=r;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-10@_@astro":"pages/jegyzokonyv-10.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-11@_@astro":"pages/jegyzokonyv-11.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-1@_@astro":"pages/jegyzokonyv-1.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-2@_@astro":"pages/jegyzokonyv-2.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-3@_@astro":"pages/jegyzokonyv-3.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-4@_@astro":"pages/jegyzokonyv-4.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-5@_@astro":"pages/jegyzokonyv-5.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-6@_@astro":"pages/jegyzokonyv-6.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-7@_@astro":"pages/jegyzokonyv-7.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-8@_@astro":"pages/jegyzokonyv-8.astro.mjs","\u0000@astro-page:src/pages/jegyzokonyv-9@_@astro":"pages/jegyzokonyv-9.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000empty-middleware":"_empty-middleware.mjs","/src/pages/jegyzokonyv-10.astro":"chunks/pages/jegyzokonyv-10_95T4VjBe.mjs","/src/pages/jegyzokonyv-11.astro":"chunks/pages/jegyzokonyv-11_3k8i7nit.mjs","/src/pages/jegyzokonyv-2.astro":"chunks/pages/jegyzokonyv-2_nwzqG70X.mjs","/src/pages/jegyzokonyv-3.astro":"chunks/pages/jegyzokonyv-3_oNZsE9U0.mjs","/src/pages/jegyzokonyv-4.astro":"chunks/pages/jegyzokonyv-4_cMRi6XRB.mjs","/src/pages/jegyzokonyv-5.astro":"chunks/pages/jegyzokonyv-5_ho7gWcuf.mjs","/src/pages/jegyzokonyv-6.astro":"chunks/pages/jegyzokonyv-6_1KHiC5KJ.mjs","/src/pages/jegyzokonyv-7.astro":"chunks/pages/jegyzokonyv-7_6RNqjamU.mjs","/src/pages/jegyzokonyv-8.astro":"chunks/pages/jegyzokonyv-8_CVZzaSxi.mjs","/src/pages/jegyzokonyv-9.astro":"chunks/pages/jegyzokonyv-9_PyCP-vjv.mjs","\u0000@astrojs-manifest":"manifest_QGy1MO4m.mjs","/astro/hoisted.js?q=0":"_astro/hoisted.OO6LGCG_.js","astro:scripts/before-hydration.js":""},"assets":[]});

export { manifest };
