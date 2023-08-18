(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (__dirname){(function (){
const fs = require('fs').promises;
const path = require('path');

async function listAll({folder = __dirname} = {}) {
  const all = {};
  const files = await fs.readdir(folder);
  for (const f of files) {
    if (f.endsWith('.json') && f !== 'package.json') {
      const text = await fs.readFile(path.join(folder, f), 'utf8');
      all[path.basename(f, '.json')] = JSON.parse(text);
    }
  }
  return all;
}

module.exports = {listAll};

}).call(this)}).call(this,"/node_modules/@webref/css")
},{"fs":2,"path":112}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
'use strict';

const List = require('../utils/List.cjs');

function createConvertor(walk) {
    return {
        fromPlainObject(ast) {
            walk(ast, {
                enter(node) {
                    if (node.children && node.children instanceof List.List === false) {
                        node.children = new List.List().fromArray(node.children);
                    }
                }
            });

            return ast;
        },
        toPlainObject(ast) {
            walk(ast, {
                leave(node) {
                    if (node.children && node.children instanceof List.List) {
                        node.children = node.children.toArray();
                    }
                }
            });

            return ast;
        }
    };
}

exports.createConvertor = createConvertor;

},{"../utils/List.cjs":102}],4:[function(require,module,exports){
'use strict';

const createCustomError = require('../utils/create-custom-error.cjs');

function SyntaxError(message, input, offset) {
    return Object.assign(createCustomError.createCustomError('SyntaxError', message), {
        input,
        offset,
        rawMessage: message,
        message: message + '\n' +
            '  ' + input + '\n' +
            '--' + new Array((offset || input.length) + 1).join('-') + '^'
    });
}

exports.SyntaxError = SyntaxError;

},{"../utils/create-custom-error.cjs":104}],5:[function(require,module,exports){
'use strict';

function noop(value) {
    return value;
}

function generateMultiplier(multiplier) {
    const { min, max, comma } = multiplier;

    if (min === 0 && max === 0) {
        return comma ? '#?' : '*';
    }

    if (min === 0 && max === 1) {
        return '?';
    }

    if (min === 1 && max === 0) {
        return comma ? '#' : '+';
    }

    if (min === 1 && max === 1) {
        return '';
    }

    return (
        (comma ? '#' : '') +
        (min === max
            ? '{' + min + '}'
            : '{' + min + ',' + (max !== 0 ? max : '') + '}'
        )
    );
}

function generateTypeOpts(node) {
    switch (node.type) {
        case 'Range':
            return (
                ' [' +
                (node.min === null ? '-∞' : node.min) +
                ',' +
                (node.max === null ? '∞' : node.max) +
                ']'
            );

        default:
            throw new Error('Unknown node type `' + node.type + '`');
    }
}

function generateSequence(node, decorate, forceBraces, compact) {
    const combinator = node.combinator === ' ' || compact ? node.combinator : ' ' + node.combinator + ' ';
    const result = node.terms
        .map(term => internalGenerate(term, decorate, forceBraces, compact))
        .join(combinator);

    if (node.explicit || forceBraces) {
        return (compact || result[0] === ',' ? '[' : '[ ') + result + (compact ? ']' : ' ]');
    }

    return result;
}

function internalGenerate(node, decorate, forceBraces, compact) {
    let result;

    switch (node.type) {
        case 'Group':
            result =
                generateSequence(node, decorate, forceBraces, compact) +
                (node.disallowEmpty ? '!' : '');
            break;

        case 'Multiplier':
            // return since node is a composition
            return (
                internalGenerate(node.term, decorate, forceBraces, compact) +
                decorate(generateMultiplier(node), node)
            );

        case 'Type':
            result = '<' + node.name + (node.opts ? decorate(generateTypeOpts(node.opts), node.opts) : '') + '>';
            break;

        case 'Property':
            result = '<\'' + node.name + '\'>';
            break;

        case 'Keyword':
            result = node.name;
            break;

        case 'AtKeyword':
            result = '@' + node.name;
            break;

        case 'Function':
            result = node.name + '(';
            break;

        case 'String':
        case 'Token':
            result = node.value;
            break;

        case 'Comma':
            result = ',';
            break;

        default:
            throw new Error('Unknown node type `' + node.type + '`');
    }

    return decorate(result, node);
}

function generate(node, options) {
    let decorate = noop;
    let forceBraces = false;
    let compact = false;

    if (typeof options === 'function') {
        decorate = options;
    } else if (options) {
        forceBraces = Boolean(options.forceBraces);
        compact = Boolean(options.compact);
        if (typeof options.decorate === 'function') {
            decorate = options.decorate;
        }
    }

    return internalGenerate(node, decorate, forceBraces, compact);
}

exports.generate = generate;

},{}],6:[function(require,module,exports){
'use strict';

const SyntaxError = require('./SyntaxError.cjs');
const generate = require('./generate.cjs');
const parse = require('./parse.cjs');
const walk = require('./walk.cjs');



exports.SyntaxError = SyntaxError.SyntaxError;
exports.generate = generate.generate;
exports.parse = parse.parse;
exports.walk = walk.walk;

},{"./SyntaxError.cjs":4,"./generate.cjs":5,"./parse.cjs":7,"./walk.cjs":9}],7:[function(require,module,exports){
'use strict';

const tokenizer = require('./tokenizer.cjs');

const TAB = 9;
const N = 10;
const F = 12;
const R = 13;
const SPACE = 32;
const EXCLAMATIONMARK = 33;    // !
const NUMBERSIGN = 35;         // #
const AMPERSAND = 38;          // &
const APOSTROPHE = 39;         // '
const LEFTPARENTHESIS = 40;    // (
const RIGHTPARENTHESIS = 41;   // )
const ASTERISK = 42;           // *
const PLUSSIGN = 43;           // +
const COMMA = 44;              // ,
const HYPERMINUS = 45;         // -
const LESSTHANSIGN = 60;       // <
const GREATERTHANSIGN = 62;    // >
const QUESTIONMARK = 63;       // ?
const COMMERCIALAT = 64;       // @
const LEFTSQUAREBRACKET = 91;  // [
const RIGHTSQUAREBRACKET = 93; // ]
const LEFTCURLYBRACKET = 123;  // {
const VERTICALLINE = 124;      // |
const RIGHTCURLYBRACKET = 125; // }
const INFINITY = 8734;         // ∞
const NAME_CHAR = new Uint8Array(128).map((_, idx) =>
    /[a-zA-Z0-9\-]/.test(String.fromCharCode(idx)) ? 1 : 0
);
const COMBINATOR_PRECEDENCE = {
    ' ': 1,
    '&&': 2,
    '||': 3,
    '|': 4
};

function scanSpaces(tokenizer) {
    return tokenizer.substringToPos(
        tokenizer.findWsEnd(tokenizer.pos)
    );
}

function scanWord(tokenizer) {
    let end = tokenizer.pos;

    for (; end < tokenizer.str.length; end++) {
        const code = tokenizer.str.charCodeAt(end);
        if (code >= 128 || NAME_CHAR[code] === 0) {
            break;
        }
    }

    if (tokenizer.pos === end) {
        tokenizer.error('Expect a keyword');
    }

    return tokenizer.substringToPos(end);
}

function scanNumber(tokenizer) {
    let end = tokenizer.pos;

    for (; end < tokenizer.str.length; end++) {
        const code = tokenizer.str.charCodeAt(end);
        if (code < 48 || code > 57) {
            break;
        }
    }

    if (tokenizer.pos === end) {
        tokenizer.error('Expect a number');
    }

    return tokenizer.substringToPos(end);
}

function scanString(tokenizer) {
    const end = tokenizer.str.indexOf('\'', tokenizer.pos + 1);

    if (end === -1) {
        tokenizer.pos = tokenizer.str.length;
        tokenizer.error('Expect an apostrophe');
    }

    return tokenizer.substringToPos(end + 1);
}

function readMultiplierRange(tokenizer) {
    let min = null;
    let max = null;

    tokenizer.eat(LEFTCURLYBRACKET);

    min = scanNumber(tokenizer);

    if (tokenizer.charCode() === COMMA) {
        tokenizer.pos++;
        if (tokenizer.charCode() !== RIGHTCURLYBRACKET) {
            max = scanNumber(tokenizer);
        }
    } else {
        max = min;
    }

    tokenizer.eat(RIGHTCURLYBRACKET);

    return {
        min: Number(min),
        max: max ? Number(max) : 0
    };
}

function readMultiplier(tokenizer) {
    let range = null;
    let comma = false;

    switch (tokenizer.charCode()) {
        case ASTERISK:
            tokenizer.pos++;

            range = {
                min: 0,
                max: 0
            };

            break;

        case PLUSSIGN:
            tokenizer.pos++;

            range = {
                min: 1,
                max: 0
            };

            break;

        case QUESTIONMARK:
            tokenizer.pos++;

            range = {
                min: 0,
                max: 1
            };

            break;

        case NUMBERSIGN:
            tokenizer.pos++;

            comma = true;

            if (tokenizer.charCode() === LEFTCURLYBRACKET) {
                range = readMultiplierRange(tokenizer);
            } else if (tokenizer.charCode() === QUESTIONMARK) {
                // https://www.w3.org/TR/css-values-4/#component-multipliers
                // > the # and ? multipliers may be stacked as #?
                // In this case just treat "#?" as a single multiplier
                // { min: 0, max: 0, comma: true }
                tokenizer.pos++;
                range = {
                    min: 0,
                    max: 0
                };
            } else {
                range = {
                    min: 1,
                    max: 0
                };
            }

            break;

        case LEFTCURLYBRACKET:
            range = readMultiplierRange(tokenizer);
            break;

        default:
            return null;
    }

    return {
        type: 'Multiplier',
        comma,
        min: range.min,
        max: range.max,
        term: null
    };
}

function maybeMultiplied(tokenizer, node) {
    const multiplier = readMultiplier(tokenizer);

    if (multiplier !== null) {
        multiplier.term = node;

        // https://www.w3.org/TR/css-values-4/#component-multipliers
        // > The + and # multipliers may be stacked as +#;
        // Represent "+#" as nested multipliers:
        // { ...<multiplier #>,
        //   term: {
        //     ...<multipler +>,
        //     term: node
        //   }
        // }
        if (tokenizer.charCode() === NUMBERSIGN &&
            tokenizer.charCodeAt(tokenizer.pos - 1) === PLUSSIGN) {
            return maybeMultiplied(tokenizer, multiplier);
        }

        return multiplier;
    }

    return node;
}

function maybeToken(tokenizer) {
    const ch = tokenizer.peek();

    if (ch === '') {
        return null;
    }

    return {
        type: 'Token',
        value: ch
    };
}

function readProperty(tokenizer) {
    let name;

    tokenizer.eat(LESSTHANSIGN);
    tokenizer.eat(APOSTROPHE);

    name = scanWord(tokenizer);

    tokenizer.eat(APOSTROPHE);
    tokenizer.eat(GREATERTHANSIGN);

    return maybeMultiplied(tokenizer, {
        type: 'Property',
        name
    });
}

// https://drafts.csswg.org/css-values-3/#numeric-ranges
// 4.1. Range Restrictions and Range Definition Notation
//
// Range restrictions can be annotated in the numeric type notation using CSS bracketed
// range notation—[min,max]—within the angle brackets, after the identifying keyword,
// indicating a closed range between (and including) min and max.
// For example, <integer [0, 10]> indicates an integer between 0 and 10, inclusive.
function readTypeRange(tokenizer) {
    // use null for Infinity to make AST format JSON serializable/deserializable
    let min = null; // -Infinity
    let max = null; // Infinity
    let sign = 1;

    tokenizer.eat(LEFTSQUAREBRACKET);

    if (tokenizer.charCode() === HYPERMINUS) {
        tokenizer.peek();
        sign = -1;
    }

    if (sign == -1 && tokenizer.charCode() === INFINITY) {
        tokenizer.peek();
    } else {
        min = sign * Number(scanNumber(tokenizer));

        if (NAME_CHAR[tokenizer.charCode()] !== 0) {
            min += scanWord(tokenizer);
        }
    }

    scanSpaces(tokenizer);
    tokenizer.eat(COMMA);
    scanSpaces(tokenizer);

    if (tokenizer.charCode() === INFINITY) {
        tokenizer.peek();
    } else {
        sign = 1;

        if (tokenizer.charCode() === HYPERMINUS) {
            tokenizer.peek();
            sign = -1;
        }

        max = sign * Number(scanNumber(tokenizer));

        if (NAME_CHAR[tokenizer.charCode()] !== 0) {
            max += scanWord(tokenizer);
        }
    }

    tokenizer.eat(RIGHTSQUAREBRACKET);

    return {
        type: 'Range',
        min,
        max
    };
}

function readType(tokenizer) {
    let name;
    let opts = null;

    tokenizer.eat(LESSTHANSIGN);
    name = scanWord(tokenizer);

    if (tokenizer.charCode() === LEFTPARENTHESIS &&
        tokenizer.nextCharCode() === RIGHTPARENTHESIS) {
        tokenizer.pos += 2;
        name += '()';
    }

    if (tokenizer.charCodeAt(tokenizer.findWsEnd(tokenizer.pos)) === LEFTSQUAREBRACKET) {
        scanSpaces(tokenizer);
        opts = readTypeRange(tokenizer);
    }

    tokenizer.eat(GREATERTHANSIGN);

    return maybeMultiplied(tokenizer, {
        type: 'Type',
        name,
        opts
    });
}

function readKeywordOrFunction(tokenizer) {
    const name = scanWord(tokenizer);

    if (tokenizer.charCode() === LEFTPARENTHESIS) {
        tokenizer.pos++;

        return {
            type: 'Function',
            name
        };
    }

    return maybeMultiplied(tokenizer, {
        type: 'Keyword',
        name
    });
}

function regroupTerms(terms, combinators) {
    function createGroup(terms, combinator) {
        return {
            type: 'Group',
            terms,
            combinator,
            disallowEmpty: false,
            explicit: false
        };
    }

    let combinator;

    combinators = Object.keys(combinators)
        .sort((a, b) => COMBINATOR_PRECEDENCE[a] - COMBINATOR_PRECEDENCE[b]);

    while (combinators.length > 0) {
        combinator = combinators.shift();

        let i = 0;
        let subgroupStart = 0;

        for (; i < terms.length; i++) {
            const term = terms[i];

            if (term.type === 'Combinator') {
                if (term.value === combinator) {
                    if (subgroupStart === -1) {
                        subgroupStart = i - 1;
                    }
                    terms.splice(i, 1);
                    i--;
                } else {
                    if (subgroupStart !== -1 && i - subgroupStart > 1) {
                        terms.splice(
                            subgroupStart,
                            i - subgroupStart,
                            createGroup(terms.slice(subgroupStart, i), combinator)
                        );
                        i = subgroupStart + 1;
                    }
                    subgroupStart = -1;
                }
            }
        }

        if (subgroupStart !== -1 && combinators.length) {
            terms.splice(
                subgroupStart,
                i - subgroupStart,
                createGroup(terms.slice(subgroupStart, i), combinator)
            );
        }
    }

    return combinator;
}

function readImplicitGroup(tokenizer) {
    const terms = [];
    const combinators = {};
    let token;
    let prevToken = null;
    let prevTokenPos = tokenizer.pos;

    while (token = peek(tokenizer)) {
        if (token.type !== 'Spaces') {
            if (token.type === 'Combinator') {
                // check for combinator in group beginning and double combinator sequence
                if (prevToken === null || prevToken.type === 'Combinator') {
                    tokenizer.pos = prevTokenPos;
                    tokenizer.error('Unexpected combinator');
                }

                combinators[token.value] = true;
            } else if (prevToken !== null && prevToken.type !== 'Combinator') {
                combinators[' '] = true;  // a b
                terms.push({
                    type: 'Combinator',
                    value: ' '
                });
            }

            terms.push(token);
            prevToken = token;
            prevTokenPos = tokenizer.pos;
        }
    }

    // check for combinator in group ending
    if (prevToken !== null && prevToken.type === 'Combinator') {
        tokenizer.pos -= prevTokenPos;
        tokenizer.error('Unexpected combinator');
    }

    return {
        type: 'Group',
        terms,
        combinator: regroupTerms(terms, combinators) || ' ',
        disallowEmpty: false,
        explicit: false
    };
}

function readGroup(tokenizer) {
    let result;

    tokenizer.eat(LEFTSQUAREBRACKET);
    result = readImplicitGroup(tokenizer);
    tokenizer.eat(RIGHTSQUAREBRACKET);

    result.explicit = true;

    if (tokenizer.charCode() === EXCLAMATIONMARK) {
        tokenizer.pos++;
        result.disallowEmpty = true;
    }

    return result;
}

function peek(tokenizer) {
    let code = tokenizer.charCode();

    if (code < 128 && NAME_CHAR[code] === 1) {
        return readKeywordOrFunction(tokenizer);
    }

    switch (code) {
        case RIGHTSQUAREBRACKET:
            // don't eat, stop scan a group
            break;

        case LEFTSQUAREBRACKET:
            return maybeMultiplied(tokenizer, readGroup(tokenizer));

        case LESSTHANSIGN:
            return tokenizer.nextCharCode() === APOSTROPHE
                ? readProperty(tokenizer)
                : readType(tokenizer);

        case VERTICALLINE:
            return {
                type: 'Combinator',
                value: tokenizer.substringToPos(
                    tokenizer.pos + (tokenizer.nextCharCode() === VERTICALLINE ? 2 : 1)
                )
            };

        case AMPERSAND:
            tokenizer.pos++;
            tokenizer.eat(AMPERSAND);

            return {
                type: 'Combinator',
                value: '&&'
            };

        case COMMA:
            tokenizer.pos++;
            return {
                type: 'Comma'
            };

        case APOSTROPHE:
            return maybeMultiplied(tokenizer, {
                type: 'String',
                value: scanString(tokenizer)
            });

        case SPACE:
        case TAB:
        case N:
        case R:
        case F:
            return {
                type: 'Spaces',
                value: scanSpaces(tokenizer)
            };

        case COMMERCIALAT:
            code = tokenizer.nextCharCode();

            if (code < 128 && NAME_CHAR[code] === 1) {
                tokenizer.pos++;
                return {
                    type: 'AtKeyword',
                    name: scanWord(tokenizer)
                };
            }

            return maybeToken(tokenizer);

        case ASTERISK:
        case PLUSSIGN:
        case QUESTIONMARK:
        case NUMBERSIGN:
        case EXCLAMATIONMARK:
            // prohibited tokens (used as a multiplier start)
            break;

        case LEFTCURLYBRACKET:
            // LEFTCURLYBRACKET is allowed since mdn/data uses it w/o quoting
            // check next char isn't a number, because it's likely a disjoined multiplier
            code = tokenizer.nextCharCode();

            if (code < 48 || code > 57) {
                return maybeToken(tokenizer);
            }

            break;

        default:
            return maybeToken(tokenizer);
    }
}

function parse(source) {
    const tokenizer$1 = new tokenizer.Tokenizer(source);
    const result = readImplicitGroup(tokenizer$1);

    if (tokenizer$1.pos !== source.length) {
        tokenizer$1.error('Unexpected input');
    }

    // reduce redundant groups with single group term
    if (result.terms.length === 1 && result.terms[0].type === 'Group') {
        return result.terms[0];
    }

    return result;
}

exports.parse = parse;

},{"./tokenizer.cjs":8}],8:[function(require,module,exports){
'use strict';

const SyntaxError = require('./SyntaxError.cjs');

const TAB = 9;
const N = 10;
const F = 12;
const R = 13;
const SPACE = 32;

class Tokenizer {
    constructor(str) {
        this.str = str;
        this.pos = 0;
    }
    charCodeAt(pos) {
        return pos < this.str.length ? this.str.charCodeAt(pos) : 0;
    }
    charCode() {
        return this.charCodeAt(this.pos);
    }
    nextCharCode() {
        return this.charCodeAt(this.pos + 1);
    }
    nextNonWsCode(pos) {
        return this.charCodeAt(this.findWsEnd(pos));
    }
    findWsEnd(pos) {
        for (; pos < this.str.length; pos++) {
            const code = this.str.charCodeAt(pos);
            if (code !== R && code !== N && code !== F && code !== SPACE && code !== TAB) {
                break;
            }
        }

        return pos;
    }
    substringToPos(end) {
        return this.str.substring(this.pos, this.pos = end);
    }
    eat(code) {
        if (this.charCode() !== code) {
            this.error('Expect `' + String.fromCharCode(code) + '`');
        }

        this.pos++;
    }
    peek() {
        return this.pos < this.str.length ? this.str.charAt(this.pos++) : '';
    }
    error(message) {
        throw new SyntaxError.SyntaxError(message, this.str, this.pos);
    }
}

exports.Tokenizer = Tokenizer;

},{"./SyntaxError.cjs":4}],9:[function(require,module,exports){
'use strict';

const noop = function() {};

function ensureFunction(value) {
    return typeof value === 'function' ? value : noop;
}

function walk(node, options, context) {
    function walk(node) {
        enter.call(context, node);

        switch (node.type) {
            case 'Group':
                node.terms.forEach(walk);
                break;

            case 'Multiplier':
                walk(node.term);
                break;

            case 'Type':
            case 'Property':
            case 'Keyword':
            case 'AtKeyword':
            case 'Function':
            case 'String':
            case 'Token':
            case 'Comma':
                break;

            default:
                throw new Error('Unknown type: ' + node.type);
        }

        leave.call(context, node);
    }

    let enter = noop;
    let leave = noop;

    if (typeof options === 'function') {
        enter = options;
    } else if (options) {
        enter = ensureFunction(options.enter);
        leave = ensureFunction(options.leave);
    }

    if (enter === noop && leave === noop) {
        throw new Error('Neither `enter` nor `leave` walker handler is set or both aren\'t a function');
    }

    walk(node);
}

exports.walk = walk;

},{}],10:[function(require,module,exports){
'use strict';

const index = require('../tokenizer/index.cjs');
const sourceMap = require('./sourceMap.cjs');
const tokenBefore = require('./token-before.cjs');
const types = require('../tokenizer/types.cjs');

const REVERSESOLIDUS = 0x005c; // U+005C REVERSE SOLIDUS (\)

function processChildren(node, delimeter) {
    if (typeof delimeter === 'function') {
        let prev = null;

        node.children.forEach(node => {
            if (prev !== null) {
                delimeter.call(this, prev);
            }

            this.node(node);
            prev = node;
        });

        return;
    }

    node.children.forEach(this.node, this);
}

function processChunk(chunk) {
    index.tokenize(chunk, (type, start, end) => {
        this.token(type, chunk.slice(start, end));
    });
}

function createGenerator(config) {
    const types$1 = new Map();

    for (let name in config.node) {
        const item = config.node[name];
        const fn = item.generate || item;

        if (typeof fn === 'function') {
            types$1.set(name, item.generate || item);
        }
    }

    return function(node, options) {
        let buffer = '';
        let prevCode = 0;
        let handlers = {
            node(node) {
                if (types$1.has(node.type)) {
                    types$1.get(node.type).call(publicApi, node);
                } else {
                    throw new Error('Unknown node type: ' + node.type);
                }
            },
            tokenBefore: tokenBefore.safe,
            token(type, value) {
                prevCode = this.tokenBefore(prevCode, type, value);

                this.emit(value, type, false);

                if (type === types.Delim && value.charCodeAt(0) === REVERSESOLIDUS) {
                    this.emit('\n', types.WhiteSpace, true);
                }
            },
            emit(value) {
                buffer += value;
            },
            result() {
                return buffer;
            }
        };

        if (options) {
            if (typeof options.decorator === 'function') {
                handlers = options.decorator(handlers);
            }

            if (options.sourceMap) {
                handlers = sourceMap.generateSourceMap(handlers);
            }

            if (options.mode in tokenBefore) {
                handlers.tokenBefore = tokenBefore[options.mode];
            }
        }

        const publicApi = {
            node: (node) => handlers.node(node),
            children: processChildren,
            token: (type, value) => handlers.token(type, value),
            tokenize: processChunk
        };

        handlers.node(node);

        return handlers.result();
    };
}

exports.createGenerator = createGenerator;

},{"../tokenizer/index.cjs":98,"../tokenizer/types.cjs":100,"./sourceMap.cjs":11,"./token-before.cjs":12}],11:[function(require,module,exports){
'use strict';

const sourceMapGenerator_js = require('source-map-js/lib/source-map-generator.js');

const trackNodes = new Set(['Atrule', 'Selector', 'Declaration']);

function generateSourceMap(handlers) {
    const map = new sourceMapGenerator_js.SourceMapGenerator();
    const generated = {
        line: 1,
        column: 0
    };
    const original = {
        line: 0, // should be zero to add first mapping
        column: 0
    };
    const activatedGenerated = {
        line: 1,
        column: 0
    };
    const activatedMapping = {
        generated: activatedGenerated
    };
    let line = 1;
    let column = 0;
    let sourceMappingActive = false;

    const origHandlersNode = handlers.node;
    handlers.node = function(node) {
        if (node.loc && node.loc.start && trackNodes.has(node.type)) {
            const nodeLine = node.loc.start.line;
            const nodeColumn = node.loc.start.column - 1;

            if (original.line !== nodeLine ||
                original.column !== nodeColumn) {
                original.line = nodeLine;
                original.column = nodeColumn;

                generated.line = line;
                generated.column = column;

                if (sourceMappingActive) {
                    sourceMappingActive = false;
                    if (generated.line !== activatedGenerated.line ||
                        generated.column !== activatedGenerated.column) {
                        map.addMapping(activatedMapping);
                    }
                }

                sourceMappingActive = true;
                map.addMapping({
                    source: node.loc.source,
                    original,
                    generated
                });
            }
        }

        origHandlersNode.call(this, node);

        if (sourceMappingActive && trackNodes.has(node.type)) {
            activatedGenerated.line = line;
            activatedGenerated.column = column;
        }
    };

    const origHandlersEmit = handlers.emit;
    handlers.emit = function(value, type, auto) {
        for (let i = 0; i < value.length; i++) {
            if (value.charCodeAt(i) === 10) { // \n
                line++;
                column = 0;
            } else {
                column++;
            }
        }

        origHandlersEmit(value, type, auto);
    };

    const origHandlersResult = handlers.result;
    handlers.result = function() {
        if (sourceMappingActive) {
            map.addMapping(activatedMapping);
        }

        return {
            css: origHandlersResult(),
            map
        };
    };

    return handlers;
}

exports.generateSourceMap = generateSourceMap;

},{"source-map-js/lib/source-map-generator.js":118}],12:[function(require,module,exports){
'use strict';

const types = require('../tokenizer/types.cjs');

const PLUSSIGN = 0x002B;    // U+002B PLUS SIGN (+)
const HYPHENMINUS = 0x002D; // U+002D HYPHEN-MINUS (-)

const code = (type, value) => {
    if (type === types.Delim) {
        type = value;
    }

    if (typeof type === 'string') {
        const charCode = type.charCodeAt(0);
        return charCode > 0x7F ? 0x8000 : charCode << 8;
    }

    return type;
};

// https://www.w3.org/TR/css-syntax-3/#serialization
// The only requirement for serialization is that it must "round-trip" with parsing,
// that is, parsing the stylesheet must produce the same data structures as parsing,
// serializing, and parsing again, except for consecutive <whitespace-token>s,
// which may be collapsed into a single token.

const specPairs = [
    [types.Ident, types.Ident],
    [types.Ident, types.Function],
    [types.Ident, types.Url],
    [types.Ident, types.BadUrl],
    [types.Ident, '-'],
    [types.Ident, types.Number],
    [types.Ident, types.Percentage],
    [types.Ident, types.Dimension],
    [types.Ident, types.CDC],
    [types.Ident, types.LeftParenthesis],

    [types.AtKeyword, types.Ident],
    [types.AtKeyword, types.Function],
    [types.AtKeyword, types.Url],
    [types.AtKeyword, types.BadUrl],
    [types.AtKeyword, '-'],
    [types.AtKeyword, types.Number],
    [types.AtKeyword, types.Percentage],
    [types.AtKeyword, types.Dimension],
    [types.AtKeyword, types.CDC],

    [types.Hash, types.Ident],
    [types.Hash, types.Function],
    [types.Hash, types.Url],
    [types.Hash, types.BadUrl],
    [types.Hash, '-'],
    [types.Hash, types.Number],
    [types.Hash, types.Percentage],
    [types.Hash, types.Dimension],
    [types.Hash, types.CDC],

    [types.Dimension, types.Ident],
    [types.Dimension, types.Function],
    [types.Dimension, types.Url],
    [types.Dimension, types.BadUrl],
    [types.Dimension, '-'],
    [types.Dimension, types.Number],
    [types.Dimension, types.Percentage],
    [types.Dimension, types.Dimension],
    [types.Dimension, types.CDC],

    ['#', types.Ident],
    ['#', types.Function],
    ['#', types.Url],
    ['#', types.BadUrl],
    ['#', '-'],
    ['#', types.Number],
    ['#', types.Percentage],
    ['#', types.Dimension],
    ['#', types.CDC], // https://github.com/w3c/csswg-drafts/pull/6874

    ['-', types.Ident],
    ['-', types.Function],
    ['-', types.Url],
    ['-', types.BadUrl],
    ['-', '-'],
    ['-', types.Number],
    ['-', types.Percentage],
    ['-', types.Dimension],
    ['-', types.CDC], // https://github.com/w3c/csswg-drafts/pull/6874

    [types.Number, types.Ident],
    [types.Number, types.Function],
    [types.Number, types.Url],
    [types.Number, types.BadUrl],
    [types.Number, types.Number],
    [types.Number, types.Percentage],
    [types.Number, types.Dimension],
    [types.Number, '%'],
    [types.Number, types.CDC], // https://github.com/w3c/csswg-drafts/pull/6874

    ['@', types.Ident],
    ['@', types.Function],
    ['@', types.Url],
    ['@', types.BadUrl],
    ['@', '-'],
    ['@', types.CDC], // https://github.com/w3c/csswg-drafts/pull/6874

    ['.', types.Number],
    ['.', types.Percentage],
    ['.', types.Dimension],

    ['+', types.Number],
    ['+', types.Percentage],
    ['+', types.Dimension],

    ['/', '*']
];
// validate with scripts/generate-safe
const safePairs = specPairs.concat([
    [types.Ident, types.Hash],

    [types.Dimension, types.Hash],

    [types.Hash, types.Hash],

    [types.AtKeyword, types.LeftParenthesis],
    [types.AtKeyword, types.String],
    [types.AtKeyword, types.Colon],

    [types.Percentage, types.Percentage],
    [types.Percentage, types.Dimension],
    [types.Percentage, types.Function],
    [types.Percentage, '-'],

    [types.RightParenthesis, types.Ident],
    [types.RightParenthesis, types.Function],
    [types.RightParenthesis, types.Percentage],
    [types.RightParenthesis, types.Dimension],
    [types.RightParenthesis, types.Hash],
    [types.RightParenthesis, '-']
]);

function createMap(pairs) {
    const isWhiteSpaceRequired = new Set(
        pairs.map(([prev, next]) => (code(prev) << 16 | code(next)))
    );

    return function(prevCode, type, value) {
        const nextCode = code(type, value);
        const nextCharCode = value.charCodeAt(0);
        const emitWs =
            (nextCharCode === HYPHENMINUS &&
                type !== types.Ident &&
                type !== types.Function &&
                type !== types.CDC) ||
            (nextCharCode === PLUSSIGN)
                ? isWhiteSpaceRequired.has(prevCode << 16 | nextCharCode << 8)
                : isWhiteSpaceRequired.has(prevCode << 16 | nextCode);

        if (emitWs) {
            this.emit(' ', types.WhiteSpace, true);
        }

        return nextCode;
    };
}

const spec = createMap(specPairs);
const safe = createMap(safePairs);

exports.safe = safe;
exports.spec = spec;

},{"../tokenizer/types.cjs":100}],13:[function(require,module,exports){
'use strict';

const index$1 = require('./syntax/index.cjs');
const version = require('./version.cjs');
const create = require('./syntax/create.cjs');
const List = require('./utils/List.cjs');
const Lexer = require('./lexer/Lexer.cjs');
const index = require('./definition-syntax/index.cjs');
const clone = require('./utils/clone.cjs');
const names$1 = require('./utils/names.cjs');
const ident = require('./utils/ident.cjs');
const string = require('./utils/string.cjs');
const url = require('./utils/url.cjs');
const types = require('./tokenizer/types.cjs');
const names = require('./tokenizer/names.cjs');
const TokenStream = require('./tokenizer/TokenStream.cjs');

const {
    tokenize,
    parse,
    generate,
    lexer,
    createLexer,

    walk,
    find,
    findLast,
    findAll,

    toPlainObject,
    fromPlainObject,

    fork
} = index$1;

exports.version = version.version;
exports.createSyntax = create;
exports.List = List.List;
exports.Lexer = Lexer.Lexer;
exports.definitionSyntax = index;
exports.clone = clone.clone;
exports.isCustomProperty = names$1.isCustomProperty;
exports.keyword = names$1.keyword;
exports.property = names$1.property;
exports.vendorPrefix = names$1.vendorPrefix;
exports.ident = ident;
exports.string = string;
exports.url = url;
exports.tokenTypes = types;
exports.tokenNames = names;
exports.TokenStream = TokenStream.TokenStream;
exports.createLexer = createLexer;
exports.find = find;
exports.findAll = findAll;
exports.findLast = findLast;
exports.fork = fork;
exports.fromPlainObject = fromPlainObject;
exports.generate = generate;
exports.lexer = lexer;
exports.parse = parse;
exports.toPlainObject = toPlainObject;
exports.tokenize = tokenize;
exports.walk = walk;

},{"./definition-syntax/index.cjs":6,"./lexer/Lexer.cjs":14,"./syntax/create.cjs":41,"./syntax/index.cjs":44,"./tokenizer/TokenStream.cjs":95,"./tokenizer/names.cjs":99,"./tokenizer/types.cjs":100,"./utils/List.cjs":102,"./utils/clone.cjs":103,"./utils/ident.cjs":105,"./utils/names.cjs":106,"./utils/string.cjs":107,"./utils/url.cjs":108,"./version.cjs":111}],14:[function(require,module,exports){
'use strict';

const error = require('./error.cjs');
const names = require('../utils/names.cjs');
const genericConst = require('./generic-const.cjs');
const generic = require('./generic.cjs');
const units = require('./units.cjs');
const prepareTokens = require('./prepare-tokens.cjs');
const matchGraph = require('./match-graph.cjs');
const match = require('./match.cjs');
const trace = require('./trace.cjs');
const search = require('./search.cjs');
const structure = require('./structure.cjs');
const parse = require('../definition-syntax/parse.cjs');
const generate = require('../definition-syntax/generate.cjs');
const walk = require('../definition-syntax/walk.cjs');

const cssWideKeywordsSyntax = matchGraph.buildMatchGraph(genericConst.cssWideKeywords.join(' | '));

function dumpMapSyntax(map, compact, syntaxAsAst) {
    const result = {};

    for (const name in map) {
        if (map[name].syntax) {
            result[name] = syntaxAsAst
                ? map[name].syntax
                : generate.generate(map[name].syntax, { compact });
        }
    }

    return result;
}

function dumpAtruleMapSyntax(map, compact, syntaxAsAst) {
    const result = {};

    for (const [name, atrule] of Object.entries(map)) {
        result[name] = {
            prelude: atrule.prelude && (
                syntaxAsAst
                    ? atrule.prelude.syntax
                    : generate.generate(atrule.prelude.syntax, { compact })
            ),
            descriptors: atrule.descriptors && dumpMapSyntax(atrule.descriptors, compact, syntaxAsAst)
        };
    }

    return result;
}

function valueHasVar(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].value.toLowerCase() === 'var(') {
            return true;
        }
    }

    return false;
}

function buildMatchResult(matched, error, iterations) {
    return {
        matched,
        iterations,
        error,
        ...trace
    };
}

function matchSyntax(lexer, syntax, value, useCssWideKeywords) {
    const tokens = prepareTokens(value, lexer.syntax);
    let result;

    if (valueHasVar(tokens)) {
        return buildMatchResult(null, new Error('Matching for a tree with var() is not supported'));
    }

    if (useCssWideKeywords) {
        result = match.matchAsTree(tokens, lexer.cssWideKeywordsSyntax, lexer);
    }

    if (!useCssWideKeywords || !result.match) {
        result = match.matchAsTree(tokens, syntax.match, lexer);
        if (!result.match) {
            return buildMatchResult(
                null,
                new error.SyntaxMatchError(result.reason, syntax.syntax, value, result),
                result.iterations
            );
        }
    }

    return buildMatchResult(result.match, null, result.iterations);
}

class Lexer {
    constructor(config, syntax, structure$1) {
        this.cssWideKeywordsSyntax = cssWideKeywordsSyntax;
        this.syntax = syntax;
        this.generic = false;
        this.units = { ...units };
        this.atrules = Object.create(null);
        this.properties = Object.create(null);
        this.types = Object.create(null);
        this.structure = structure$1 || structure.getStructureFromConfig(config);

        if (config) {
            if (config.units) {
                for (const group of Object.keys(units)) {
                    if (Array.isArray(config.units[group])) {
                        this.units[group] = config.units[group];
                    }
                }
            }

            if (config.types) {
                for (const name in config.types) {
                    this.addType_(name, config.types[name]);
                }
            }

            if (config.generic) {
                this.generic = true;
                for (const [name, value] of Object.entries(generic.createGenericTypes(this.units))) {
                    this.addType_(name, value);
                }
            }

            if (config.atrules) {
                for (const name in config.atrules) {
                    this.addAtrule_(name, config.atrules[name]);
                }
            }

            if (config.properties) {
                for (const name in config.properties) {
                    this.addProperty_(name, config.properties[name]);
                }
            }
        }
    }

    checkStructure(ast) {
        function collectWarning(node, message) {
            warns.push({ node, message });
        }

        const structure = this.structure;
        const warns = [];

        this.syntax.walk(ast, function(node) {
            if (structure.hasOwnProperty(node.type)) {
                structure[node.type].check(node, collectWarning);
            } else {
                collectWarning(node, 'Unknown node type `' + node.type + '`');
            }
        });

        return warns.length ? warns : false;
    }

    createDescriptor(syntax, type, name, parent = null) {
        const ref = {
            type,
            name
        };
        const descriptor = {
            type,
            name,
            parent,
            serializable: typeof syntax === 'string' || (syntax && typeof syntax.type === 'string'),
            syntax: null,
            match: null
        };

        if (typeof syntax === 'function') {
            descriptor.match = matchGraph.buildMatchGraph(syntax, ref);
        } else {
            if (typeof syntax === 'string') {
                // lazy parsing on first access
                Object.defineProperty(descriptor, 'syntax', {
                    get() {
                        Object.defineProperty(descriptor, 'syntax', {
                            value: parse.parse(syntax)
                        });

                        return descriptor.syntax;
                    }
                });
            } else {
                descriptor.syntax = syntax;
            }

            // lazy graph build on first access
            Object.defineProperty(descriptor, 'match', {
                get() {
                    Object.defineProperty(descriptor, 'match', {
                        value: matchGraph.buildMatchGraph(descriptor.syntax, ref)
                    });

                    return descriptor.match;
                }
            });
        }

        return descriptor;
    }
    addAtrule_(name, syntax) {
        if (!syntax) {
            return;
        }

        this.atrules[name] = {
            type: 'Atrule',
            name: name,
            prelude: syntax.prelude ? this.createDescriptor(syntax.prelude, 'AtrulePrelude', name) : null,
            descriptors: syntax.descriptors
                ? Object.keys(syntax.descriptors).reduce(
                    (map, descName) => {
                        map[descName] = this.createDescriptor(syntax.descriptors[descName], 'AtruleDescriptor', descName, name);
                        return map;
                    },
                    Object.create(null)
                )
                : null
        };
    }
    addProperty_(name, syntax) {
        if (!syntax) {
            return;
        }

        this.properties[name] = this.createDescriptor(syntax, 'Property', name);
    }
    addType_(name, syntax) {
        if (!syntax) {
            return;
        }

        this.types[name] = this.createDescriptor(syntax, 'Type', name);
    }

    checkAtruleName(atruleName) {
        if (!this.getAtrule(atruleName)) {
            return new error.SyntaxReferenceError('Unknown at-rule', '@' + atruleName);
        }
    }
    checkAtrulePrelude(atruleName, prelude) {
        const error = this.checkAtruleName(atruleName);

        if (error) {
            return error;
        }

        const atrule = this.getAtrule(atruleName);

        if (!atrule.prelude && prelude) {
            return new SyntaxError('At-rule `@' + atruleName + '` should not contain a prelude');
        }

        if (atrule.prelude && !prelude) {
            if (!matchSyntax(this, atrule.prelude, '', false).matched) {
                return new SyntaxError('At-rule `@' + atruleName + '` should contain a prelude');
            }
        }
    }
    checkAtruleDescriptorName(atruleName, descriptorName) {
        const error$1 = this.checkAtruleName(atruleName);

        if (error$1) {
            return error$1;
        }

        const atrule = this.getAtrule(atruleName);
        const descriptor = names.keyword(descriptorName);

        if (!atrule.descriptors) {
            return new SyntaxError('At-rule `@' + atruleName + '` has no known descriptors');
        }

        if (!atrule.descriptors[descriptor.name] &&
            !atrule.descriptors[descriptor.basename]) {
            return new error.SyntaxReferenceError('Unknown at-rule descriptor', descriptorName);
        }
    }
    checkPropertyName(propertyName) {
        if (!this.getProperty(propertyName)) {
            return new error.SyntaxReferenceError('Unknown property', propertyName);
        }
    }

    matchAtrulePrelude(atruleName, prelude) {
        const error = this.checkAtrulePrelude(atruleName, prelude);

        if (error) {
            return buildMatchResult(null, error);
        }

        const atrule = this.getAtrule(atruleName);

        if (!atrule.prelude) {
            return buildMatchResult(null, null);
        }

        return matchSyntax(this, atrule.prelude, prelude || '', false);
    }
    matchAtruleDescriptor(atruleName, descriptorName, value) {
        const error = this.checkAtruleDescriptorName(atruleName, descriptorName);

        if (error) {
            return buildMatchResult(null, error);
        }

        const atrule = this.getAtrule(atruleName);
        const descriptor = names.keyword(descriptorName);

        return matchSyntax(this, atrule.descriptors[descriptor.name] || atrule.descriptors[descriptor.basename], value, false);
    }
    matchDeclaration(node) {
        if (node.type !== 'Declaration') {
            return buildMatchResult(null, new Error('Not a Declaration node'));
        }

        return this.matchProperty(node.property, node.value);
    }
    matchProperty(propertyName, value) {
        // don't match syntax for a custom property at the moment
        if (names.property(propertyName).custom) {
            return buildMatchResult(null, new Error('Lexer matching doesn\'t applicable for custom properties'));
        }

        const error = this.checkPropertyName(propertyName);

        if (error) {
            return buildMatchResult(null, error);
        }

        return matchSyntax(this, this.getProperty(propertyName), value, true);
    }
    matchType(typeName, value) {
        const typeSyntax = this.getType(typeName);

        if (!typeSyntax) {
            return buildMatchResult(null, new error.SyntaxReferenceError('Unknown type', typeName));
        }

        return matchSyntax(this, typeSyntax, value, false);
    }
    match(syntax, value) {
        if (typeof syntax !== 'string' && (!syntax || !syntax.type)) {
            return buildMatchResult(null, new error.SyntaxReferenceError('Bad syntax'));
        }

        if (typeof syntax === 'string' || !syntax.match) {
            syntax = this.createDescriptor(syntax, 'Type', 'anonymous');
        }

        return matchSyntax(this, syntax, value, false);
    }

    findValueFragments(propertyName, value, type, name) {
        return search.matchFragments(this, value, this.matchProperty(propertyName, value), type, name);
    }
    findDeclarationValueFragments(declaration, type, name) {
        return search.matchFragments(this, declaration.value, this.matchDeclaration(declaration), type, name);
    }
    findAllFragments(ast, type, name) {
        const result = [];

        this.syntax.walk(ast, {
            visit: 'Declaration',
            enter: (declaration) => {
                result.push.apply(result, this.findDeclarationValueFragments(declaration, type, name));
            }
        });

        return result;
    }

    getAtrule(atruleName, fallbackBasename = true) {
        const atrule = names.keyword(atruleName);
        const atruleEntry = atrule.vendor && fallbackBasename
            ? this.atrules[atrule.name] || this.atrules[atrule.basename]
            : this.atrules[atrule.name];

        return atruleEntry || null;
    }
    getAtrulePrelude(atruleName, fallbackBasename = true) {
        const atrule = this.getAtrule(atruleName, fallbackBasename);

        return atrule && atrule.prelude || null;
    }
    getAtruleDescriptor(atruleName, name) {
        return this.atrules.hasOwnProperty(atruleName) && this.atrules.declarators
            ? this.atrules[atruleName].declarators[name] || null
            : null;
    }
    getProperty(propertyName, fallbackBasename = true) {
        const property = names.property(propertyName);
        const propertyEntry = property.vendor && fallbackBasename
            ? this.properties[property.name] || this.properties[property.basename]
            : this.properties[property.name];

        return propertyEntry || null;
    }
    getType(name) {
        return hasOwnProperty.call(this.types, name) ? this.types[name] : null;
    }

    validate() {
        function validate(syntax, name, broken, descriptor) {
            if (broken.has(name)) {
                return broken.get(name);
            }

            broken.set(name, false);
            if (descriptor.syntax !== null) {
                walk.walk(descriptor.syntax, function(node) {
                    if (node.type !== 'Type' && node.type !== 'Property') {
                        return;
                    }

                    const map = node.type === 'Type' ? syntax.types : syntax.properties;
                    const brokenMap = node.type === 'Type' ? brokenTypes : brokenProperties;

                    if (!hasOwnProperty.call(map, node.name) || validate(syntax, node.name, brokenMap, map[node.name])) {
                        broken.set(name, true);
                    }
                }, this);
            }
        }

        let brokenTypes = new Map();
        let brokenProperties = new Map();

        for (const key in this.types) {
            validate(this, key, brokenTypes, this.types[key]);
        }

        for (const key in this.properties) {
            validate(this, key, brokenProperties, this.properties[key]);
        }

        brokenTypes = [...brokenTypes.keys()].filter(name => brokenTypes.get(name));
        brokenProperties = [...brokenProperties.keys()].filter(name => brokenProperties.get(name));

        if (brokenTypes.length || brokenProperties.length) {
            return {
                types: brokenTypes,
                properties: brokenProperties
            };
        }

        return null;
    }
    dump(syntaxAsAst, pretty) {
        return {
            generic: this.generic,
            units: this.units,
            types: dumpMapSyntax(this.types, !pretty, syntaxAsAst),
            properties: dumpMapSyntax(this.properties, !pretty, syntaxAsAst),
            atrules: dumpAtruleMapSyntax(this.atrules, !pretty, syntaxAsAst)
        };
    }
    toString() {
        return JSON.stringify(this.dump());
    }
}

exports.Lexer = Lexer;

},{"../definition-syntax/generate.cjs":5,"../definition-syntax/parse.cjs":7,"../definition-syntax/walk.cjs":9,"../utils/names.cjs":106,"./error.cjs":15,"./generic-const.cjs":17,"./generic.cjs":19,"./match-graph.cjs":20,"./match.cjs":21,"./prepare-tokens.cjs":22,"./search.cjs":23,"./structure.cjs":24,"./trace.cjs":25,"./units.cjs":26}],15:[function(require,module,exports){
'use strict';

const createCustomError = require('../utils/create-custom-error.cjs');
const generate = require('../definition-syntax/generate.cjs');

const defaultLoc = { offset: 0, line: 1, column: 1 };

function locateMismatch(matchResult, node) {
    const tokens = matchResult.tokens;
    const longestMatch = matchResult.longestMatch;
    const mismatchNode = longestMatch < tokens.length ? tokens[longestMatch].node || null : null;
    const badNode = mismatchNode !== node ? mismatchNode : null;
    let mismatchOffset = 0;
    let mismatchLength = 0;
    let entries = 0;
    let css = '';
    let start;
    let end;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].value;

        if (i === longestMatch) {
            mismatchLength = token.length;
            mismatchOffset = css.length;
        }

        if (badNode !== null && tokens[i].node === badNode) {
            if (i <= longestMatch) {
                entries++;
            } else {
                entries = 0;
            }
        }

        css += token;
    }

    if (longestMatch === tokens.length || entries > 1) { // last
        start = fromLoc(badNode || node, 'end') || buildLoc(defaultLoc, css);
        end = buildLoc(start);
    } else {
        start = fromLoc(badNode, 'start') ||
            buildLoc(fromLoc(node, 'start') || defaultLoc, css.slice(0, mismatchOffset));
        end = fromLoc(badNode, 'end') ||
            buildLoc(start, css.substr(mismatchOffset, mismatchLength));
    }

    return {
        css,
        mismatchOffset,
        mismatchLength,
        start,
        end
    };
}

function fromLoc(node, point) {
    const value = node && node.loc && node.loc[point];

    if (value) {
        return 'line' in value ? buildLoc(value) : value;
    }

    return null;
}

function buildLoc({ offset, line, column }, extra) {
    const loc = {
        offset,
        line,
        column
    };

    if (extra) {
        const lines = extra.split(/\n|\r\n?|\f/);

        loc.offset += extra.length;
        loc.line += lines.length - 1;
        loc.column = lines.length === 1 ? loc.column + extra.length : lines.pop().length + 1;
    }

    return loc;
}

const SyntaxReferenceError = function(type, referenceName) {
    const error = createCustomError.createCustomError(
        'SyntaxReferenceError',
        type + (referenceName ? ' `' + referenceName + '`' : '')
    );

    error.reference = referenceName;

    return error;
};

const SyntaxMatchError = function(message, syntax, node, matchResult) {
    const error = createCustomError.createCustomError('SyntaxMatchError', message);
    const {
        css,
        mismatchOffset,
        mismatchLength,
        start,
        end
    } = locateMismatch(matchResult, node);

    error.rawMessage = message;
    error.syntax = syntax ? generate.generate(syntax) : '<generic>';
    error.css = css;
    error.mismatchOffset = mismatchOffset;
    error.mismatchLength = mismatchLength;
    error.message = message + '\n' +
        '  syntax: ' + error.syntax + '\n' +
        '   value: ' + (css || '<empty string>') + '\n' +
        '  --------' + new Array(error.mismatchOffset + 1).join('-') + '^';

    Object.assign(error, start);
    error.loc = {
        source: (node && node.loc && node.loc.source) || '<unknown>',
        start,
        end
    };

    return error;
};

exports.SyntaxMatchError = SyntaxMatchError;
exports.SyntaxReferenceError = SyntaxReferenceError;

},{"../definition-syntax/generate.cjs":5,"../utils/create-custom-error.cjs":104}],16:[function(require,module,exports){
'use strict';

const charCodeDefinitions = require('../tokenizer/char-code-definitions.cjs');
const types = require('../tokenizer/types.cjs');
const utils = require('../tokenizer/utils.cjs');

const PLUSSIGN = 0x002B;    // U+002B PLUS SIGN (+)
const HYPHENMINUS = 0x002D; // U+002D HYPHEN-MINUS (-)
const N = 0x006E;           // U+006E LATIN SMALL LETTER N (n)
const DISALLOW_SIGN = true;
const ALLOW_SIGN = false;

function isDelim(token, code) {
    return token !== null && token.type === types.Delim && token.value.charCodeAt(0) === code;
}

function skipSC(token, offset, getNextToken) {
    while (token !== null && (token.type === types.WhiteSpace || token.type === types.Comment)) {
        token = getNextToken(++offset);
    }

    return offset;
}

function checkInteger(token, valueOffset, disallowSign, offset) {
    if (!token) {
        return 0;
    }

    const code = token.value.charCodeAt(valueOffset);

    if (code === PLUSSIGN || code === HYPHENMINUS) {
        if (disallowSign) {
            // Number sign is not allowed
            return 0;
        }
        valueOffset++;
    }

    for (; valueOffset < token.value.length; valueOffset++) {
        if (!charCodeDefinitions.isDigit(token.value.charCodeAt(valueOffset))) {
            // Integer is expected
            return 0;
        }
    }

    return offset + 1;
}

// ... <signed-integer>
// ... ['+' | '-'] <signless-integer>
function consumeB(token, offset_, getNextToken) {
    let sign = false;
    let offset = skipSC(token, offset_, getNextToken);

    token = getNextToken(offset);

    if (token === null) {
        return offset_;
    }

    if (token.type !== types.Number) {
        if (isDelim(token, PLUSSIGN) || isDelim(token, HYPHENMINUS)) {
            sign = true;
            offset = skipSC(getNextToken(++offset), offset, getNextToken);
            token = getNextToken(offset);

            if (token === null || token.type !== types.Number) {
                return 0;
            }
        } else {
            return offset_;
        }
    }

    if (!sign) {
        const code = token.value.charCodeAt(0);
        if (code !== PLUSSIGN && code !== HYPHENMINUS) {
            // Number sign is expected
            return 0;
        }
    }

    return checkInteger(token, sign ? 0 : 1, sign, offset);
}

// An+B microsyntax https://www.w3.org/TR/css-syntax-3/#anb
function anPlusB(token, getNextToken) {
    /* eslint-disable brace-style*/
    let offset = 0;

    if (!token) {
        return 0;
    }

    // <integer>
    if (token.type === types.Number) {
        return checkInteger(token, 0, ALLOW_SIGN, offset); // b
    }

    // -n
    // -n <signed-integer>
    // -n ['+' | '-'] <signless-integer>
    // -n- <signless-integer>
    // <dashndashdigit-ident>
    else if (token.type === types.Ident && token.value.charCodeAt(0) === HYPHENMINUS) {
        // expect 1st char is N
        if (!utils.cmpChar(token.value, 1, N)) {
            return 0;
        }

        switch (token.value.length) {
            // -n
            // -n <signed-integer>
            // -n ['+' | '-'] <signless-integer>
            case 2:
                return consumeB(getNextToken(++offset), offset, getNextToken);

            // -n- <signless-integer>
            case 3:
                if (token.value.charCodeAt(2) !== HYPHENMINUS) {
                    return 0;
                }

                offset = skipSC(getNextToken(++offset), offset, getNextToken);
                token = getNextToken(offset);

                return checkInteger(token, 0, DISALLOW_SIGN, offset);

            // <dashndashdigit-ident>
            default:
                if (token.value.charCodeAt(2) !== HYPHENMINUS) {
                    return 0;
                }

                return checkInteger(token, 3, DISALLOW_SIGN, offset);
        }
    }

    // '+'? n
    // '+'? n <signed-integer>
    // '+'? n ['+' | '-'] <signless-integer>
    // '+'? n- <signless-integer>
    // '+'? <ndashdigit-ident>
    else if (token.type === types.Ident || (isDelim(token, PLUSSIGN) && getNextToken(offset + 1).type === types.Ident)) {
        // just ignore a plus
        if (token.type !== types.Ident) {
            token = getNextToken(++offset);
        }

        if (token === null || !utils.cmpChar(token.value, 0, N)) {
            return 0;
        }

        switch (token.value.length) {
            // '+'? n
            // '+'? n <signed-integer>
            // '+'? n ['+' | '-'] <signless-integer>
            case 1:
                return consumeB(getNextToken(++offset), offset, getNextToken);

            // '+'? n- <signless-integer>
            case 2:
                if (token.value.charCodeAt(1) !== HYPHENMINUS) {
                    return 0;
                }

                offset = skipSC(getNextToken(++offset), offset, getNextToken);
                token = getNextToken(offset);

                return checkInteger(token, 0, DISALLOW_SIGN, offset);

            // '+'? <ndashdigit-ident>
            default:
                if (token.value.charCodeAt(1) !== HYPHENMINUS) {
                    return 0;
                }

                return checkInteger(token, 2, DISALLOW_SIGN, offset);
        }
    }

    // <ndashdigit-dimension>
    // <ndash-dimension> <signless-integer>
    // <n-dimension>
    // <n-dimension> <signed-integer>
    // <n-dimension> ['+' | '-'] <signless-integer>
    else if (token.type === types.Dimension) {
        let code = token.value.charCodeAt(0);
        let sign = code === PLUSSIGN || code === HYPHENMINUS ? 1 : 0;
        let i = sign;

        for (; i < token.value.length; i++) {
            if (!charCodeDefinitions.isDigit(token.value.charCodeAt(i))) {
                break;
            }
        }

        if (i === sign) {
            // Integer is expected
            return 0;
        }

        if (!utils.cmpChar(token.value, i, N)) {
            return 0;
        }

        // <n-dimension>
        // <n-dimension> <signed-integer>
        // <n-dimension> ['+' | '-'] <signless-integer>
        if (i + 1 === token.value.length) {
            return consumeB(getNextToken(++offset), offset, getNextToken);
        } else {
            if (token.value.charCodeAt(i + 1) !== HYPHENMINUS) {
                return 0;
            }

            // <ndash-dimension> <signless-integer>
            if (i + 2 === token.value.length) {
                offset = skipSC(getNextToken(++offset), offset, getNextToken);
                token = getNextToken(offset);

                return checkInteger(token, 0, DISALLOW_SIGN, offset);
            }
            // <ndashdigit-dimension>
            else {
                return checkInteger(token, i + 2, DISALLOW_SIGN, offset);
            }
        }
    }

    return 0;
}

module.exports = anPlusB;

},{"../tokenizer/char-code-definitions.cjs":97,"../tokenizer/types.cjs":100,"../tokenizer/utils.cjs":101}],17:[function(require,module,exports){
'use strict';

// https://drafts.csswg.org/css-cascade-5/
const cssWideKeywords = [
    'initial',
    'inherit',
    'unset',
    'revert',
    'revert-layer'
];

exports.cssWideKeywords = cssWideKeywords;

},{}],18:[function(require,module,exports){
'use strict';

const charCodeDefinitions = require('../tokenizer/char-code-definitions.cjs');
const types = require('../tokenizer/types.cjs');
const utils = require('../tokenizer/utils.cjs');

const PLUSSIGN = 0x002B;     // U+002B PLUS SIGN (+)
const HYPHENMINUS = 0x002D;  // U+002D HYPHEN-MINUS (-)
const QUESTIONMARK = 0x003F; // U+003F QUESTION MARK (?)
const U = 0x0075;            // U+0075 LATIN SMALL LETTER U (u)

function isDelim(token, code) {
    return token !== null && token.type === types.Delim && token.value.charCodeAt(0) === code;
}

function startsWith(token, code) {
    return token.value.charCodeAt(0) === code;
}

function hexSequence(token, offset, allowDash) {
    let hexlen = 0;

    for (let pos = offset; pos < token.value.length; pos++) {
        const code = token.value.charCodeAt(pos);

        if (code === HYPHENMINUS && allowDash && hexlen !== 0) {
            hexSequence(token, offset + hexlen + 1, false);
            return 6; // dissallow following question marks
        }

        if (!charCodeDefinitions.isHexDigit(code)) {
            return 0; // not a hex digit
        }

        if (++hexlen > 6) {
            return 0; // too many hex digits
        }    }

    return hexlen;
}

function withQuestionMarkSequence(consumed, length, getNextToken) {
    if (!consumed) {
        return 0; // nothing consumed
    }

    while (isDelim(getNextToken(length), QUESTIONMARK)) {
        if (++consumed > 6) {
            return 0; // too many question marks
        }

        length++;
    }

    return length;
}

// https://drafts.csswg.org/css-syntax/#urange
// Informally, the <urange> production has three forms:
// U+0001
//      Defines a range consisting of a single code point, in this case the code point "1".
// U+0001-00ff
//      Defines a range of codepoints between the first and the second value, in this case
//      the range between "1" and "ff" (255 in decimal) inclusive.
// U+00??
//      Defines a range of codepoints where the "?" characters range over all hex digits,
//      in this case defining the same as the value U+0000-00ff.
// In each form, a maximum of 6 digits is allowed for each hexadecimal number (if you treat "?" as a hexadecimal digit).
//
// <urange> =
//   u '+' <ident-token> '?'* |
//   u <dimension-token> '?'* |
//   u <number-token> '?'* |
//   u <number-token> <dimension-token> |
//   u <number-token> <number-token> |
//   u '+' '?'+
function urange(token, getNextToken) {
    let length = 0;

    // should start with `u` or `U`
    if (token === null || token.type !== types.Ident || !utils.cmpChar(token.value, 0, U)) {
        return 0;
    }

    token = getNextToken(++length);
    if (token === null) {
        return 0;
    }

    // u '+' <ident-token> '?'*
    // u '+' '?'+
    if (isDelim(token, PLUSSIGN)) {
        token = getNextToken(++length);
        if (token === null) {
            return 0;
        }

        if (token.type === types.Ident) {
            // u '+' <ident-token> '?'*
            return withQuestionMarkSequence(hexSequence(token, 0, true), ++length, getNextToken);
        }

        if (isDelim(token, QUESTIONMARK)) {
            // u '+' '?'+
            return withQuestionMarkSequence(1, ++length, getNextToken);
        }

        // Hex digit or question mark is expected
        return 0;
    }

    // u <number-token> '?'*
    // u <number-token> <dimension-token>
    // u <number-token> <number-token>
    if (token.type === types.Number) {
        const consumedHexLength = hexSequence(token, 1, true);
        if (consumedHexLength === 0) {
            return 0;
        }

        token = getNextToken(++length);
        if (token === null) {
            // u <number-token> <eof>
            return length;
        }

        if (token.type === types.Dimension || token.type === types.Number) {
            // u <number-token> <dimension-token>
            // u <number-token> <number-token>
            if (!startsWith(token, HYPHENMINUS) || !hexSequence(token, 1, false)) {
                return 0;
            }

            return length + 1;
        }

        // u <number-token> '?'*
        return withQuestionMarkSequence(consumedHexLength, length, getNextToken);
    }

    // u <dimension-token> '?'*
    if (token.type === types.Dimension) {
        return withQuestionMarkSequence(hexSequence(token, 1, true), ++length, getNextToken);
    }

    return 0;
}

module.exports = urange;

},{"../tokenizer/char-code-definitions.cjs":97,"../tokenizer/types.cjs":100,"../tokenizer/utils.cjs":101}],19:[function(require,module,exports){
'use strict';

const genericConst = require('./generic-const.cjs');
const genericAnPlusB = require('./generic-an-plus-b.cjs');
const genericUrange = require('./generic-urange.cjs');
const types = require('../tokenizer/types.cjs');
const charCodeDefinitions = require('../tokenizer/char-code-definitions.cjs');
const utils = require('../tokenizer/utils.cjs');

const calcFunctionNames = ['calc(', '-moz-calc(', '-webkit-calc('];
const balancePair = new Map([
    [types.Function, types.RightParenthesis],
    [types.LeftParenthesis, types.RightParenthesis],
    [types.LeftSquareBracket, types.RightSquareBracket],
    [types.LeftCurlyBracket, types.RightCurlyBracket]
]);

// safe char code getter
function charCodeAt(str, index) {
    return index < str.length ? str.charCodeAt(index) : 0;
}

function eqStr(actual, expected) {
    return utils.cmpStr(actual, 0, actual.length, expected);
}

function eqStrAny(actual, expected) {
    for (let i = 0; i < expected.length; i++) {
        if (eqStr(actual, expected[i])) {
            return true;
        }
    }

    return false;
}

// IE postfix hack, i.e. 123\0 or 123px\9
function isPostfixIeHack(str, offset) {
    if (offset !== str.length - 2) {
        return false;
    }

    return (
        charCodeAt(str, offset) === 0x005C &&  // U+005C REVERSE SOLIDUS (\)
        charCodeDefinitions.isDigit(charCodeAt(str, offset + 1))
    );
}

function outOfRange(opts, value, numEnd) {
    if (opts && opts.type === 'Range') {
        const num = Number(
            numEnd !== undefined && numEnd !== value.length
                ? value.substr(0, numEnd)
                : value
        );

        if (isNaN(num)) {
            return true;
        }

        // FIXME: when opts.min is a string it's a dimension, skip a range validation
        // for now since it requires a type covertation which is not implmented yet
        if (opts.min !== null && num < opts.min && typeof opts.min !== 'string') {
            return true;
        }

        // FIXME: when opts.max is a string it's a dimension, skip a range validation
        // for now since it requires a type covertation which is not implmented yet
        if (opts.max !== null && num > opts.max && typeof opts.max !== 'string') {
            return true;
        }
    }

    return false;
}

function consumeFunction(token, getNextToken) {
    let balanceCloseType = 0;
    let balanceStash = [];
    let length = 0;

    // balanced token consuming
    scan:
    do {
        switch (token.type) {
            case types.RightCurlyBracket:
            case types.RightParenthesis:
            case types.RightSquareBracket:
                if (token.type !== balanceCloseType) {
                    break scan;
                }

                balanceCloseType = balanceStash.pop();

                if (balanceStash.length === 0) {
                    length++;
                    break scan;
                }

                break;

            case types.Function:
            case types.LeftParenthesis:
            case types.LeftSquareBracket:
            case types.LeftCurlyBracket:
                balanceStash.push(balanceCloseType);
                balanceCloseType = balancePair.get(token.type);
                break;
        }

        length++;
    } while (token = getNextToken(length));

    return length;
}

// TODO: implement
// can be used wherever <length>, <frequency>, <angle>, <time>, <percentage>, <number>, or <integer> values are allowed
// https://drafts.csswg.org/css-values/#calc-notation
function calc(next) {
    return function(token, getNextToken, opts) {
        if (token === null) {
            return 0;
        }

        if (token.type === types.Function && eqStrAny(token.value, calcFunctionNames)) {
            return consumeFunction(token, getNextToken);
        }

        return next(token, getNextToken, opts);
    };
}

function tokenType(expectedTokenType) {
    return function(token) {
        if (token === null || token.type !== expectedTokenType) {
            return 0;
        }

        return 1;
    };
}

// =========================
// Complex types
//

// https://drafts.csswg.org/css-values-4/#custom-idents
// 4.2. Author-defined Identifiers: the <custom-ident> type
// Some properties accept arbitrary author-defined identifiers as a component value.
// This generic data type is denoted by <custom-ident>, and represents any valid CSS identifier
// that would not be misinterpreted as a pre-defined keyword in that property’s value definition.
//
// See also: https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident
function customIdent(token) {
    if (token === null || token.type !== types.Ident) {
        return 0;
    }

    const name = token.value.toLowerCase();

    // The CSS-wide keywords are not valid <custom-ident>s
    if (eqStrAny(name, genericConst.cssWideKeywords)) {
        return 0;
    }

    // The default keyword is reserved and is also not a valid <custom-ident>
    if (eqStr(name, 'default')) {
        return 0;
    }

    // TODO: ignore property specific keywords (as described https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident)
    // Specifications using <custom-ident> must specify clearly what other keywords
    // are excluded from <custom-ident>, if any—for example by saying that any pre-defined keywords
    // in that property’s value definition are excluded. Excluded keywords are excluded
    // in all ASCII case permutations.

    return 1;
}

// https://drafts.csswg.org/css-variables/#typedef-custom-property-name
// A custom property is any property whose name starts with two dashes (U+002D HYPHEN-MINUS), like --foo.
// The <custom-property-name> production corresponds to this: it’s defined as any valid identifier
// that starts with two dashes, except -- itself, which is reserved for future use by CSS.
// NOTE: Current implementation treat `--` as a valid name since most (all?) major browsers treat it as valid.
function customPropertyName(token) {
    // ... defined as any valid identifier
    if (token === null || token.type !== types.Ident) {
        return 0;
    }

    // ... that starts with two dashes (U+002D HYPHEN-MINUS)
    if (charCodeAt(token.value, 0) !== 0x002D || charCodeAt(token.value, 1) !== 0x002D) {
        return 0;
    }

    return 1;
}

// https://drafts.csswg.org/css-color-4/#hex-notation
// The syntax of a <hex-color> is a <hash-token> token whose value consists of 3, 4, 6, or 8 hexadecimal digits.
// In other words, a hex color is written as a hash character, "#", followed by some number of digits 0-9 or
// letters a-f (the case of the letters doesn’t matter - #00ff00 is identical to #00FF00).
function hexColor(token) {
    if (token === null || token.type !== types.Hash) {
        return 0;
    }

    const length = token.value.length;

    // valid values (length): #rgb (4), #rgba (5), #rrggbb (7), #rrggbbaa (9)
    if (length !== 4 && length !== 5 && length !== 7 && length !== 9) {
        return 0;
    }

    for (let i = 1; i < length; i++) {
        if (!charCodeDefinitions.isHexDigit(charCodeAt(token.value, i))) {
            return 0;
        }
    }

    return 1;
}

function idSelector(token) {
    if (token === null || token.type !== types.Hash) {
        return 0;
    }

    if (!charCodeDefinitions.isIdentifierStart(charCodeAt(token.value, 1), charCodeAt(token.value, 2), charCodeAt(token.value, 3))) {
        return 0;
    }

    return 1;
}

// https://drafts.csswg.org/css-syntax/#any-value
// It represents the entirety of what a valid declaration can have as its value.
function declarationValue(token, getNextToken) {
    if (!token) {
        return 0;
    }

    let balanceCloseType = 0;
    let balanceStash = [];
    let length = 0;

    // The <declaration-value> production matches any sequence of one or more tokens,
    // so long as the sequence does not contain ...
    scan:
    do {
        switch (token.type) {
            // ... <bad-string-token>, <bad-url-token>,
            case types.BadString:
            case types.BadUrl:
                break scan;

            // ... unmatched <)-token>, <]-token>, or <}-token>,
            case types.RightCurlyBracket:
            case types.RightParenthesis:
            case types.RightSquareBracket:
                if (token.type !== balanceCloseType) {
                    break scan;
                }

                balanceCloseType = balanceStash.pop();
                break;

            // ... or top-level <semicolon-token> tokens
            case types.Semicolon:
                if (balanceCloseType === 0) {
                    break scan;
                }

                break;

            // ... or <delim-token> tokens with a value of "!"
            case types.Delim:
                if (balanceCloseType === 0 && token.value === '!') {
                    break scan;
                }

                break;

            case types.Function:
            case types.LeftParenthesis:
            case types.LeftSquareBracket:
            case types.LeftCurlyBracket:
                balanceStash.push(balanceCloseType);
                balanceCloseType = balancePair.get(token.type);
                break;
        }

        length++;
    } while (token = getNextToken(length));

    return length;
}

// https://drafts.csswg.org/css-syntax/#any-value
// The <any-value> production is identical to <declaration-value>, but also
// allows top-level <semicolon-token> tokens and <delim-token> tokens
// with a value of "!". It represents the entirety of what valid CSS can be in any context.
function anyValue(token, getNextToken) {
    if (!token) {
        return 0;
    }

    let balanceCloseType = 0;
    let balanceStash = [];
    let length = 0;

    // The <any-value> production matches any sequence of one or more tokens,
    // so long as the sequence ...
    scan:
    do {
        switch (token.type) {
            // ... does not contain <bad-string-token>, <bad-url-token>,
            case types.BadString:
            case types.BadUrl:
                break scan;

            // ... unmatched <)-token>, <]-token>, or <}-token>,
            case types.RightCurlyBracket:
            case types.RightParenthesis:
            case types.RightSquareBracket:
                if (token.type !== balanceCloseType) {
                    break scan;
                }

                balanceCloseType = balanceStash.pop();
                break;

            case types.Function:
            case types.LeftParenthesis:
            case types.LeftSquareBracket:
            case types.LeftCurlyBracket:
                balanceStash.push(balanceCloseType);
                balanceCloseType = balancePair.get(token.type);
                break;
        }

        length++;
    } while (token = getNextToken(length));

    return length;
}

// =========================
// Dimensions
//

function dimension(type) {
    if (type) {
        type = new Set(type);
    }

    return function(token, getNextToken, opts) {
        if (token === null || token.type !== types.Dimension) {
            return 0;
        }

        const numberEnd = utils.consumeNumber(token.value, 0);

        // check unit
        if (type !== null) {
            // check for IE postfix hack, i.e. 123px\0 or 123px\9
            const reverseSolidusOffset = token.value.indexOf('\\', numberEnd);
            const unit = reverseSolidusOffset === -1 || !isPostfixIeHack(token.value, reverseSolidusOffset)
                ? token.value.substr(numberEnd)
                : token.value.substring(numberEnd, reverseSolidusOffset);

            if (type.has(unit.toLowerCase()) === false) {
                return 0;
            }
        }

        // check range if specified
        if (outOfRange(opts, token.value, numberEnd)) {
            return 0;
        }

        return 1;
    };
}

// =========================
// Percentage
//

// §5.5. Percentages: the <percentage> type
// https://drafts.csswg.org/css-values-4/#percentages
function percentage(token, getNextToken, opts) {
    // ... corresponds to the <percentage-token> production
    if (token === null || token.type !== types.Percentage) {
        return 0;
    }

    // check range if specified
    if (outOfRange(opts, token.value, token.value.length - 1)) {
        return 0;
    }

    return 1;
}

// =========================
// Numeric
//

// https://drafts.csswg.org/css-values-4/#numbers
// The value <zero> represents a literal number with the value 0. Expressions that merely
// evaluate to a <number> with the value 0 (for example, calc(0)) do not match <zero>;
// only literal <number-token>s do.
function zero(next) {
    if (typeof next !== 'function') {
        next = function() {
            return 0;
        };
    }

    return function(token, getNextToken, opts) {
        if (token !== null && token.type === types.Number) {
            if (Number(token.value) === 0) {
                return 1;
            }
        }

        return next(token, getNextToken, opts);
    };
}

// § 5.3. Real Numbers: the <number> type
// https://drafts.csswg.org/css-values-4/#numbers
// Number values are denoted by <number>, and represent real numbers, possibly with a fractional component.
// ... It corresponds to the <number-token> production
function number(token, getNextToken, opts) {
    if (token === null) {
        return 0;
    }

    const numberEnd = utils.consumeNumber(token.value, 0);
    const isNumber = numberEnd === token.value.length;
    if (!isNumber && !isPostfixIeHack(token.value, numberEnd)) {
        return 0;
    }

    // check range if specified
    if (outOfRange(opts, token.value, numberEnd)) {
        return 0;
    }

    return 1;
}

// §5.2. Integers: the <integer> type
// https://drafts.csswg.org/css-values-4/#integers
function integer(token, getNextToken, opts) {
    // ... corresponds to a subset of the <number-token> production
    if (token === null || token.type !== types.Number) {
        return 0;
    }

    // The first digit of an integer may be immediately preceded by `-` or `+` to indicate the integer’s sign.
    let i = charCodeAt(token.value, 0) === 0x002B ||       // U+002B PLUS SIGN (+)
            charCodeAt(token.value, 0) === 0x002D ? 1 : 0; // U+002D HYPHEN-MINUS (-)

    // When written literally, an integer is one or more decimal digits 0 through 9 ...
    for (; i < token.value.length; i++) {
        if (!charCodeDefinitions.isDigit(charCodeAt(token.value, i))) {
            return 0;
        }
    }

    // check range if specified
    if (outOfRange(opts, token.value, i)) {
        return 0;
    }

    return 1;
}

// token types
const tokenTypes = {
    'ident-token': tokenType(types.Ident),
    'function-token': tokenType(types.Function),
    'at-keyword-token': tokenType(types.AtKeyword),
    'hash-token': tokenType(types.Hash),
    'string-token': tokenType(types.String),
    'bad-string-token': tokenType(types.BadString),
    'url-token': tokenType(types.Url),
    'bad-url-token': tokenType(types.BadUrl),
    'delim-token': tokenType(types.Delim),
    'number-token': tokenType(types.Number),
    'percentage-token': tokenType(types.Percentage),
    'dimension-token': tokenType(types.Dimension),
    'whitespace-token': tokenType(types.WhiteSpace),
    'CDO-token': tokenType(types.CDO),
    'CDC-token': tokenType(types.CDC),
    'colon-token': tokenType(types.Colon),
    'semicolon-token': tokenType(types.Semicolon),
    'comma-token': tokenType(types.Comma),
    '[-token': tokenType(types.LeftSquareBracket),
    ']-token': tokenType(types.RightSquareBracket),
    '(-token': tokenType(types.LeftParenthesis),
    ')-token': tokenType(types.RightParenthesis),
    '{-token': tokenType(types.LeftCurlyBracket),
    '}-token': tokenType(types.RightCurlyBracket)
};

// token production types
const productionTypes = {
    // token type aliases
    'string': tokenType(types.String),
    'ident': tokenType(types.Ident),

    // percentage
    'percentage': calc(percentage),

    // numeric
    'zero': zero(),
    'number': calc(number),
    'integer': calc(integer),

    // complex types
    'custom-ident': customIdent,
    'custom-property-name': customPropertyName,
    'hex-color': hexColor,
    'id-selector': idSelector, // element( <id-selector> )
    'an-plus-b': genericAnPlusB,
    'urange': genericUrange,
    'declaration-value': declarationValue,
    'any-value': anyValue
};

// dimensions types depend on units set
function createDemensionTypes(units) {
    const {
        angle,
        decibel,
        frequency,
        flex,
        length,
        resolution,
        semitones,
        time
    } = units || {};

    return {
        'dimension': calc(dimension(null)),
        'angle': calc(dimension(angle)),
        'decibel': calc(dimension(decibel)),
        'frequency': calc(dimension(frequency)),
        'flex': calc(dimension(flex)),
        'length': calc(zero(dimension(length))),
        'resolution': calc(dimension(resolution)),
        'semitones': calc(dimension(semitones)),
        'time': calc(dimension(time))
    };
}

function createGenericTypes(units) {
    return {
        ...tokenTypes,
        ...productionTypes,
        ...createDemensionTypes(units)
    };
}

exports.createDemensionTypes = createDemensionTypes;
exports.createGenericTypes = createGenericTypes;
exports.productionTypes = productionTypes;
exports.tokenTypes = tokenTypes;

},{"../tokenizer/char-code-definitions.cjs":97,"../tokenizer/types.cjs":100,"../tokenizer/utils.cjs":101,"./generic-an-plus-b.cjs":16,"./generic-const.cjs":17,"./generic-urange.cjs":18}],20:[function(require,module,exports){
'use strict';

const parse = require('../definition-syntax/parse.cjs');

const MATCH = { type: 'Match' };
const MISMATCH = { type: 'Mismatch' };
const DISALLOW_EMPTY = { type: 'DisallowEmpty' };

const LEFTPARENTHESIS = 40;  // (
const RIGHTPARENTHESIS = 41; // )

function createCondition(match, thenBranch, elseBranch) {
    // reduce node count
    if (thenBranch === MATCH && elseBranch === MISMATCH) {
        return match;
    }

    if (match === MATCH && thenBranch === MATCH && elseBranch === MATCH) {
        return match;
    }

    if (match.type === 'If' && match.else === MISMATCH && thenBranch === MATCH) {
        thenBranch = match.then;
        match = match.match;
    }

    return {
        type: 'If',
        match,
        then: thenBranch,
        else: elseBranch
    };
}

function isFunctionType(name) {
    return (
        name.length > 2 &&
        name.charCodeAt(name.length - 2) === LEFTPARENTHESIS &&
        name.charCodeAt(name.length - 1) === RIGHTPARENTHESIS
    );
}

function isEnumCapatible(term) {
    return (
        term.type === 'Keyword' ||
        term.type === 'AtKeyword' ||
        term.type === 'Function' ||
        term.type === 'Type' && isFunctionType(term.name)
    );
}

function buildGroupMatchGraph(combinator, terms, atLeastOneTermMatched) {
    switch (combinator) {
        case ' ': {
            // Juxtaposing components means that all of them must occur, in the given order.
            //
            // a b c
            // =
            // match a
            //   then match b
            //     then match c
            //       then MATCH
            //       else MISMATCH
            //     else MISMATCH
            //   else MISMATCH
            let result = MATCH;

            for (let i = terms.length - 1; i >= 0; i--) {
                const term = terms[i];

                result = createCondition(
                    term,
                    result,
                    MISMATCH
                );
            }
            return result;
        }

        case '|': {
            // A bar (|) separates two or more alternatives: exactly one of them must occur.
            //
            // a | b | c
            // =
            // match a
            //   then MATCH
            //   else match b
            //     then MATCH
            //     else match c
            //       then MATCH
            //       else MISMATCH

            let result = MISMATCH;
            let map = null;

            for (let i = terms.length - 1; i >= 0; i--) {
                let term = terms[i];

                // reduce sequence of keywords into a Enum
                if (isEnumCapatible(term)) {
                    if (map === null && i > 0 && isEnumCapatible(terms[i - 1])) {
                        map = Object.create(null);
                        result = createCondition(
                            {
                                type: 'Enum',
                                map
                            },
                            MATCH,
                            result
                        );
                    }

                    if (map !== null) {
                        const key = (isFunctionType(term.name) ? term.name.slice(0, -1) : term.name).toLowerCase();
                        if (key in map === false) {
                            map[key] = term;
                            continue;
                        }
                    }
                }

                map = null;

                // create a new conditonal node
                result = createCondition(
                    term,
                    MATCH,
                    result
                );
            }
            return result;
        }

        case '&&': {
            // A double ampersand (&&) separates two or more components,
            // all of which must occur, in any order.

            // Use MatchOnce for groups with a large number of terms,
            // since &&-groups produces at least N!-node trees
            if (terms.length > 5) {
                return {
                    type: 'MatchOnce',
                    terms,
                    all: true
                };
            }

            // Use a combination tree for groups with small number of terms
            //
            // a && b && c
            // =
            // match a
            //   then [b && c]
            //   else match b
            //     then [a && c]
            //     else match c
            //       then [a && b]
            //       else MISMATCH
            //
            // a && b
            // =
            // match a
            //   then match b
            //     then MATCH
            //     else MISMATCH
            //   else match b
            //     then match a
            //       then MATCH
            //       else MISMATCH
            //     else MISMATCH
            let result = MISMATCH;

            for (let i = terms.length - 1; i >= 0; i--) {
                const term = terms[i];
                let thenClause;

                if (terms.length > 1) {
                    thenClause = buildGroupMatchGraph(
                        combinator,
                        terms.filter(function(newGroupTerm) {
                            return newGroupTerm !== term;
                        }),
                        false
                    );
                } else {
                    thenClause = MATCH;
                }

                result = createCondition(
                    term,
                    thenClause,
                    result
                );
            }
            return result;
        }

        case '||': {
            // A double bar (||) separates two or more options:
            // one or more of them must occur, in any order.

            // Use MatchOnce for groups with a large number of terms,
            // since ||-groups produces at least N!-node trees
            if (terms.length > 5) {
                return {
                    type: 'MatchOnce',
                    terms,
                    all: false
                };
            }

            // Use a combination tree for groups with small number of terms
            //
            // a || b || c
            // =
            // match a
            //   then [b || c]
            //   else match b
            //     then [a || c]
            //     else match c
            //       then [a || b]
            //       else MISMATCH
            //
            // a || b
            // =
            // match a
            //   then match b
            //     then MATCH
            //     else MATCH
            //   else match b
            //     then match a
            //       then MATCH
            //       else MATCH
            //     else MISMATCH
            let result = atLeastOneTermMatched ? MATCH : MISMATCH;

            for (let i = terms.length - 1; i >= 0; i--) {
                const term = terms[i];
                let thenClause;

                if (terms.length > 1) {
                    thenClause = buildGroupMatchGraph(
                        combinator,
                        terms.filter(function(newGroupTerm) {
                            return newGroupTerm !== term;
                        }),
                        true
                    );
                } else {
                    thenClause = MATCH;
                }

                result = createCondition(
                    term,
                    thenClause,
                    result
                );
            }
            return result;
        }
    }
}

function buildMultiplierMatchGraph(node) {
    let result = MATCH;
    let matchTerm = buildMatchGraphInternal(node.term);

    if (node.max === 0) {
        // disable repeating of empty match to prevent infinite loop
        matchTerm = createCondition(
            matchTerm,
            DISALLOW_EMPTY,
            MISMATCH
        );

        // an occurrence count is not limited, make a cycle;
        // to collect more terms on each following matching mismatch
        result = createCondition(
            matchTerm,
            null, // will be a loop
            MISMATCH
        );

        result.then = createCondition(
            MATCH,
            MATCH,
            result // make a loop
        );

        if (node.comma) {
            result.then.else = createCondition(
                { type: 'Comma', syntax: node },
                result,
                MISMATCH
            );
        }
    } else {
        // create a match node chain for [min .. max] interval with optional matches
        for (let i = node.min || 1; i <= node.max; i++) {
            if (node.comma && result !== MATCH) {
                result = createCondition(
                    { type: 'Comma', syntax: node },
                    result,
                    MISMATCH
                );
            }

            result = createCondition(
                matchTerm,
                createCondition(
                    MATCH,
                    MATCH,
                    result
                ),
                MISMATCH
            );
        }
    }

    if (node.min === 0) {
        // allow zero match
        result = createCondition(
            MATCH,
            MATCH,
            result
        );
    } else {
        // create a match node chain to collect [0 ... min - 1] required matches
        for (let i = 0; i < node.min - 1; i++) {
            if (node.comma && result !== MATCH) {
                result = createCondition(
                    { type: 'Comma', syntax: node },
                    result,
                    MISMATCH
                );
            }

            result = createCondition(
                matchTerm,
                result,
                MISMATCH
            );
        }
    }

    return result;
}

function buildMatchGraphInternal(node) {
    if (typeof node === 'function') {
        return {
            type: 'Generic',
            fn: node
        };
    }

    switch (node.type) {
        case 'Group': {
            let result = buildGroupMatchGraph(
                node.combinator,
                node.terms.map(buildMatchGraphInternal),
                false
            );

            if (node.disallowEmpty) {
                result = createCondition(
                    result,
                    DISALLOW_EMPTY,
                    MISMATCH
                );
            }

            return result;
        }

        case 'Multiplier':
            return buildMultiplierMatchGraph(node);

        case 'Type':
        case 'Property':
            return {
                type: node.type,
                name: node.name,
                syntax: node
            };

        case 'Keyword':
            return {
                type: node.type,
                name: node.name.toLowerCase(),
                syntax: node
            };

        case 'AtKeyword':
            return {
                type: node.type,
                name: '@' + node.name.toLowerCase(),
                syntax: node
            };

        case 'Function':
            return {
                type: node.type,
                name: node.name.toLowerCase() + '(',
                syntax: node
            };

        case 'String':
            // convert a one char length String to a Token
            if (node.value.length === 3) {
                return {
                    type: 'Token',
                    value: node.value.charAt(1),
                    syntax: node
                };
            }

            // otherwise use it as is
            return {
                type: node.type,
                value: node.value.substr(1, node.value.length - 2).replace(/\\'/g, '\''),
                syntax: node
            };

        case 'Token':
            return {
                type: node.type,
                value: node.value,
                syntax: node
            };

        case 'Comma':
            return {
                type: node.type,
                syntax: node
            };

        default:
            throw new Error('Unknown node type:', node.type);
    }
}

function buildMatchGraph(syntaxTree, ref) {
    if (typeof syntaxTree === 'string') {
        syntaxTree = parse.parse(syntaxTree);
    }

    return {
        type: 'MatchGraph',
        match: buildMatchGraphInternal(syntaxTree),
        syntax: ref || null,
        source: syntaxTree
    };
}

exports.DISALLOW_EMPTY = DISALLOW_EMPTY;
exports.MATCH = MATCH;
exports.MISMATCH = MISMATCH;
exports.buildMatchGraph = buildMatchGraph;

},{"../definition-syntax/parse.cjs":7}],21:[function(require,module,exports){
'use strict';

const matchGraph = require('./match-graph.cjs');
const types = require('../tokenizer/types.cjs');

const { hasOwnProperty } = Object.prototype;
const STUB = 0;
const TOKEN = 1;
const OPEN_SYNTAX = 2;
const CLOSE_SYNTAX = 3;

const EXIT_REASON_MATCH = 'Match';
const EXIT_REASON_MISMATCH = 'Mismatch';
const EXIT_REASON_ITERATION_LIMIT = 'Maximum iteration number exceeded (please fill an issue on https://github.com/csstree/csstree/issues)';

const ITERATION_LIMIT = 15000;

function reverseList(list) {
    let prev = null;
    let next = null;
    let item = list;

    while (item !== null) {
        next = item.prev;
        item.prev = prev;
        prev = item;
        item = next;
    }

    return prev;
}

function areStringsEqualCaseInsensitive(testStr, referenceStr) {
    if (testStr.length !== referenceStr.length) {
        return false;
    }

    for (let i = 0; i < testStr.length; i++) {
        const referenceCode = referenceStr.charCodeAt(i);
        let testCode = testStr.charCodeAt(i);

        // testCode.toLowerCase() for U+0041 LATIN CAPITAL LETTER A (A) .. U+005A LATIN CAPITAL LETTER Z (Z).
        if (testCode >= 0x0041 && testCode <= 0x005A) {
            testCode = testCode | 32;
        }

        if (testCode !== referenceCode) {
            return false;
        }
    }

    return true;
}

function isContextEdgeDelim(token) {
    if (token.type !== types.Delim) {
        return false;
    }

    // Fix matching for unicode-range: U+30??, U+FF00-FF9F
    // Probably we need to check out previous match instead
    return token.value !== '?';
}

function isCommaContextStart(token) {
    if (token === null) {
        return true;
    }

    return (
        token.type === types.Comma ||
        token.type === types.Function ||
        token.type === types.LeftParenthesis ||
        token.type === types.LeftSquareBracket ||
        token.type === types.LeftCurlyBracket ||
        isContextEdgeDelim(token)
    );
}

function isCommaContextEnd(token) {
    if (token === null) {
        return true;
    }

    return (
        token.type === types.RightParenthesis ||
        token.type === types.RightSquareBracket ||
        token.type === types.RightCurlyBracket ||
        (token.type === types.Delim && token.value === '/')
    );
}

function internalMatch(tokens, state, syntaxes) {
    function moveToNextToken() {
        do {
            tokenIndex++;
            token = tokenIndex < tokens.length ? tokens[tokenIndex] : null;
        } while (token !== null && (token.type === types.WhiteSpace || token.type === types.Comment));
    }

    function getNextToken(offset) {
        const nextIndex = tokenIndex + offset;

        return nextIndex < tokens.length ? tokens[nextIndex] : null;
    }

    function stateSnapshotFromSyntax(nextState, prev) {
        return {
            nextState,
            matchStack,
            syntaxStack,
            thenStack,
            tokenIndex,
            prev
        };
    }

    function pushThenStack(nextState) {
        thenStack = {
            nextState,
            matchStack,
            syntaxStack,
            prev: thenStack
        };
    }

    function pushElseStack(nextState) {
        elseStack = stateSnapshotFromSyntax(nextState, elseStack);
    }

    function addTokenToMatch() {
        matchStack = {
            type: TOKEN,
            syntax: state.syntax,
            token,
            prev: matchStack
        };

        moveToNextToken();
        syntaxStash = null;

        if (tokenIndex > longestMatch) {
            longestMatch = tokenIndex;
        }
    }

    function openSyntax() {
        syntaxStack = {
            syntax: state.syntax,
            opts: state.syntax.opts || (syntaxStack !== null && syntaxStack.opts) || null,
            prev: syntaxStack
        };

        matchStack = {
            type: OPEN_SYNTAX,
            syntax: state.syntax,
            token: matchStack.token,
            prev: matchStack
        };
    }

    function closeSyntax() {
        if (matchStack.type === OPEN_SYNTAX) {
            matchStack = matchStack.prev;
        } else {
            matchStack = {
                type: CLOSE_SYNTAX,
                syntax: syntaxStack.syntax,
                token: matchStack.token,
                prev: matchStack
            };
        }

        syntaxStack = syntaxStack.prev;
    }

    let syntaxStack = null;
    let thenStack = null;
    let elseStack = null;

    // null – stashing allowed, nothing stashed
    // false – stashing disabled, nothing stashed
    // anithing else – fail stashable syntaxes, some syntax stashed
    let syntaxStash = null;

    let iterationCount = 0; // count iterations and prevent infinite loop
    let exitReason = null;

    let token = null;
    let tokenIndex = -1;
    let longestMatch = 0;
    let matchStack = {
        type: STUB,
        syntax: null,
        token: null,
        prev: null
    };

    moveToNextToken();

    while (exitReason === null && ++iterationCount < ITERATION_LIMIT) {
        // function mapList(list, fn) {
        //     const result = [];
        //     while (list) {
        //         result.unshift(fn(list));
        //         list = list.prev;
        //     }
        //     return result;
        // }
        // console.log('--\n',
        //     '#' + iterationCount,
        //     require('util').inspect({
        //         match: mapList(matchStack, x => x.type === TOKEN ? x.token && x.token.value : x.syntax ? ({ [OPEN_SYNTAX]: '<', [CLOSE_SYNTAX]: '</' }[x.type] || x.type) + '!' + x.syntax.name : null),
        //         token: token && token.value,
        //         tokenIndex,
        //         syntax: syntax.type + (syntax.id ? ' #' + syntax.id : '')
        //     }, { depth: null })
        // );
        switch (state.type) {
            case 'Match':
                if (thenStack === null) {
                    // turn to MISMATCH when some tokens left unmatched
                    if (token !== null) {
                        // doesn't mismatch if just one token left and it's an IE hack
                        if (tokenIndex !== tokens.length - 1 || (token.value !== '\\0' && token.value !== '\\9')) {
                            state = matchGraph.MISMATCH;
                            break;
                        }
                    }

                    // break the main loop, return a result - MATCH
                    exitReason = EXIT_REASON_MATCH;
                    break;
                }

                // go to next syntax (`then` branch)
                state = thenStack.nextState;

                // check match is not empty
                if (state === matchGraph.DISALLOW_EMPTY) {
                    if (thenStack.matchStack === matchStack) {
                        state = matchGraph.MISMATCH;
                        break;
                    } else {
                        state = matchGraph.MATCH;
                    }
                }

                // close syntax if needed
                while (thenStack.syntaxStack !== syntaxStack) {
                    closeSyntax();
                }

                // pop stack
                thenStack = thenStack.prev;
                break;

            case 'Mismatch':
                // when some syntax is stashed
                if (syntaxStash !== null && syntaxStash !== false) {
                    // there is no else branches or a branch reduce match stack
                    if (elseStack === null || tokenIndex > elseStack.tokenIndex) {
                        // restore state from the stash
                        elseStack = syntaxStash;
                        syntaxStash = false; // disable stashing
                    }
                } else if (elseStack === null) {
                    // no else branches -> break the main loop
                    // return a result - MISMATCH
                    exitReason = EXIT_REASON_MISMATCH;
                    break;
                }

                // go to next syntax (`else` branch)
                state = elseStack.nextState;

                // restore all the rest stack states
                thenStack = elseStack.thenStack;
                syntaxStack = elseStack.syntaxStack;
                matchStack = elseStack.matchStack;
                tokenIndex = elseStack.tokenIndex;
                token = tokenIndex < tokens.length ? tokens[tokenIndex] : null;

                // pop stack
                elseStack = elseStack.prev;
                break;

            case 'MatchGraph':
                state = state.match;
                break;

            case 'If':
                // IMPORTANT: else stack push must go first,
                // since it stores the state of thenStack before changes
                if (state.else !== matchGraph.MISMATCH) {
                    pushElseStack(state.else);
                }

                if (state.then !== matchGraph.MATCH) {
                    pushThenStack(state.then);
                }

                state = state.match;
                break;

            case 'MatchOnce':
                state = {
                    type: 'MatchOnceBuffer',
                    syntax: state,
                    index: 0,
                    mask: 0
                };
                break;

            case 'MatchOnceBuffer': {
                const terms = state.syntax.terms;

                if (state.index === terms.length) {
                    // no matches at all or it's required all terms to be matched
                    if (state.mask === 0 || state.syntax.all) {
                        state = matchGraph.MISMATCH;
                        break;
                    }

                    // a partial match is ok
                    state = matchGraph.MATCH;
                    break;
                }

                // all terms are matched
                if (state.mask === (1 << terms.length) - 1) {
                    state = matchGraph.MATCH;
                    break;
                }

                for (; state.index < terms.length; state.index++) {
                    const matchFlag = 1 << state.index;

                    if ((state.mask & matchFlag) === 0) {
                        // IMPORTANT: else stack push must go first,
                        // since it stores the state of thenStack before changes
                        pushElseStack(state);
                        pushThenStack({
                            type: 'AddMatchOnce',
                            syntax: state.syntax,
                            mask: state.mask | matchFlag
                        });

                        // match
                        state = terms[state.index++];
                        break;
                    }
                }
                break;
            }

            case 'AddMatchOnce':
                state = {
                    type: 'MatchOnceBuffer',
                    syntax: state.syntax,
                    index: 0,
                    mask: state.mask
                };
                break;

            case 'Enum':
                if (token !== null) {
                    let name = token.value.toLowerCase();

                    // drop \0 and \9 hack from keyword name
                    if (name.indexOf('\\') !== -1) {
                        name = name.replace(/\\[09].*$/, '');
                    }

                    if (hasOwnProperty.call(state.map, name)) {
                        state = state.map[name];
                        break;
                    }
                }

                state = matchGraph.MISMATCH;
                break;

            case 'Generic': {
                const opts = syntaxStack !== null ? syntaxStack.opts : null;
                const lastTokenIndex = tokenIndex + Math.floor(state.fn(token, getNextToken, opts));

                if (!isNaN(lastTokenIndex) && lastTokenIndex > tokenIndex) {
                    while (tokenIndex < lastTokenIndex) {
                        addTokenToMatch();
                    }

                    state = matchGraph.MATCH;
                } else {
                    state = matchGraph.MISMATCH;
                }

                break;
            }

            case 'Type':
            case 'Property': {
                const syntaxDict = state.type === 'Type' ? 'types' : 'properties';
                const dictSyntax = hasOwnProperty.call(syntaxes, syntaxDict) ? syntaxes[syntaxDict][state.name] : null;

                if (!dictSyntax || !dictSyntax.match) {
                    throw new Error(
                        'Bad syntax reference: ' +
                        (state.type === 'Type'
                            ? '<' + state.name + '>'
                            : '<\'' + state.name + '\'>')
                    );
                }

                // stash a syntax for types with low priority
                if (syntaxStash !== false && token !== null && state.type === 'Type') {
                    const lowPriorityMatching =
                        // https://drafts.csswg.org/css-values-4/#custom-idents
                        // When parsing positionally-ambiguous keywords in a property value, a <custom-ident> production
                        // can only claim the keyword if no other unfulfilled production can claim it.
                        (state.name === 'custom-ident' && token.type === types.Ident) ||

                        // https://drafts.csswg.org/css-values-4/#lengths
                        // ... if a `0` could be parsed as either a <number> or a <length> in a property (such as line-height),
                        // it must parse as a <number>
                        (state.name === 'length' && token.value === '0');

                    if (lowPriorityMatching) {
                        if (syntaxStash === null) {
                            syntaxStash = stateSnapshotFromSyntax(state, elseStack);
                        }

                        state = matchGraph.MISMATCH;
                        break;
                    }
                }

                openSyntax();
                state = dictSyntax.match;
                break;
            }

            case 'Keyword': {
                const name = state.name;

                if (token !== null) {
                    let keywordName = token.value;

                    // drop \0 and \9 hack from keyword name
                    if (keywordName.indexOf('\\') !== -1) {
                        keywordName = keywordName.replace(/\\[09].*$/, '');
                    }

                    if (areStringsEqualCaseInsensitive(keywordName, name)) {
                        addTokenToMatch();
                        state = matchGraph.MATCH;
                        break;
                    }
                }

                state = matchGraph.MISMATCH;
                break;
            }

            case 'AtKeyword':
            case 'Function':
                if (token !== null && areStringsEqualCaseInsensitive(token.value, state.name)) {
                    addTokenToMatch();
                    state = matchGraph.MATCH;
                    break;
                }

                state = matchGraph.MISMATCH;
                break;

            case 'Token':
                if (token !== null && token.value === state.value) {
                    addTokenToMatch();
                    state = matchGraph.MATCH;
                    break;
                }

                state = matchGraph.MISMATCH;
                break;

            case 'Comma':
                if (token !== null && token.type === types.Comma) {
                    if (isCommaContextStart(matchStack.token)) {
                        state = matchGraph.MISMATCH;
                    } else {
                        addTokenToMatch();
                        state = isCommaContextEnd(token) ? matchGraph.MISMATCH : matchGraph.MATCH;
                    }
                } else {
                    state = isCommaContextStart(matchStack.token) || isCommaContextEnd(token) ? matchGraph.MATCH : matchGraph.MISMATCH;
                }

                break;

            case 'String':
                let string = '';
                let lastTokenIndex = tokenIndex;

                for (; lastTokenIndex < tokens.length && string.length < state.value.length; lastTokenIndex++) {
                    string += tokens[lastTokenIndex].value;
                }

                if (areStringsEqualCaseInsensitive(string, state.value)) {
                    while (tokenIndex < lastTokenIndex) {
                        addTokenToMatch();
                    }

                    state = matchGraph.MATCH;
                } else {
                    state = matchGraph.MISMATCH;
                }

                break;

            default:
                throw new Error('Unknown node type: ' + state.type);
        }
    }

    switch (exitReason) {
        case null:
            console.warn('[csstree-match] BREAK after ' + ITERATION_LIMIT + ' iterations');
            exitReason = EXIT_REASON_ITERATION_LIMIT;
            matchStack = null;
            break;

        case EXIT_REASON_MATCH:
            while (syntaxStack !== null) {
                closeSyntax();
            }
            break;

        default:
            matchStack = null;
    }

    return {
        tokens,
        reason: exitReason,
        iterations: iterationCount,
        match: matchStack,
        longestMatch
    };
}

function matchAsList(tokens, matchGraph, syntaxes) {
    const matchResult = internalMatch(tokens, matchGraph, syntaxes || {});

    if (matchResult.match !== null) {
        let item = reverseList(matchResult.match).prev;

        matchResult.match = [];

        while (item !== null) {
            switch (item.type) {
                case OPEN_SYNTAX:
                case CLOSE_SYNTAX:
                    matchResult.match.push({
                        type: item.type,
                        syntax: item.syntax
                    });
                    break;

                default:
                    matchResult.match.push({
                        token: item.token.value,
                        node: item.token.node
                    });
                    break;
            }

            item = item.prev;
        }
    }

    return matchResult;
}

function matchAsTree(tokens, matchGraph, syntaxes) {
    const matchResult = internalMatch(tokens, matchGraph, syntaxes || {});

    if (matchResult.match === null) {
        return matchResult;
    }

    let item = matchResult.match;
    let host = matchResult.match = {
        syntax: matchGraph.syntax || null,
        match: []
    };
    const hostStack = [host];

    // revert a list and start with 2nd item since 1st is a stub item
    item = reverseList(item).prev;

    // build a tree
    while (item !== null) {
        switch (item.type) {
            case OPEN_SYNTAX:
                host.match.push(host = {
                    syntax: item.syntax,
                    match: []
                });
                hostStack.push(host);
                break;

            case CLOSE_SYNTAX:
                hostStack.pop();
                host = hostStack[hostStack.length - 1];
                break;

            default:
                host.match.push({
                    syntax: item.syntax || null,
                    token: item.token.value,
                    node: item.token.node
                });
        }

        item = item.prev;
    }

    return matchResult;
}

exports.matchAsList = matchAsList;
exports.matchAsTree = matchAsTree;

},{"../tokenizer/types.cjs":100,"./match-graph.cjs":20}],22:[function(require,module,exports){
'use strict';

const index = require('../tokenizer/index.cjs');

const astToTokens = {
    decorator(handlers) {
        const tokens = [];
        let curNode = null;

        return {
            ...handlers,
            node(node) {
                const tmp = curNode;
                curNode = node;
                handlers.node.call(this, node);
                curNode = tmp;
            },
            emit(value, type, auto) {
                tokens.push({
                    type,
                    value,
                    node: auto ? null : curNode
                });
            },
            result() {
                return tokens;
            }
        };
    }
};

function stringToTokens(str) {
    const tokens = [];

    index.tokenize(str, (type, start, end) =>
        tokens.push({
            type,
            value: str.slice(start, end),
            node: null
        })
    );

    return tokens;
}

function prepareTokens(value, syntax) {
    if (typeof value === 'string') {
        return stringToTokens(value);
    }

    return syntax.generate(value, astToTokens);
}

module.exports = prepareTokens;

},{"../tokenizer/index.cjs":98}],23:[function(require,module,exports){
'use strict';

const List = require('../utils/List.cjs');

function getFirstMatchNode(matchNode) {
    if ('node' in matchNode) {
        return matchNode.node;
    }

    return getFirstMatchNode(matchNode.match[0]);
}

function getLastMatchNode(matchNode) {
    if ('node' in matchNode) {
        return matchNode.node;
    }

    return getLastMatchNode(matchNode.match[matchNode.match.length - 1]);
}

function matchFragments(lexer, ast, match, type, name) {
    function findFragments(matchNode) {
        if (matchNode.syntax !== null &&
            matchNode.syntax.type === type &&
            matchNode.syntax.name === name) {
            const start = getFirstMatchNode(matchNode);
            const end = getLastMatchNode(matchNode);

            lexer.syntax.walk(ast, function(node, item, list) {
                if (node === start) {
                    const nodes = new List.List();

                    do {
                        nodes.appendData(item.data);

                        if (item.data === end) {
                            break;
                        }

                        item = item.next;
                    } while (item !== null);

                    fragments.push({
                        parent: list,
                        nodes
                    });
                }
            });
        }

        if (Array.isArray(matchNode.match)) {
            matchNode.match.forEach(findFragments);
        }
    }

    const fragments = [];

    if (match.matched !== null) {
        findFragments(match.matched);
    }

    return fragments;
}

exports.matchFragments = matchFragments;

},{"../utils/List.cjs":102}],24:[function(require,module,exports){
'use strict';

const List = require('../utils/List.cjs');

const { hasOwnProperty } = Object.prototype;

function isValidNumber(value) {
    // Number.isInteger(value) && value >= 0
    return (
        typeof value === 'number' &&
        isFinite(value) &&
        Math.floor(value) === value &&
        value >= 0
    );
}

function isValidLocation(loc) {
    return (
        Boolean(loc) &&
        isValidNumber(loc.offset) &&
        isValidNumber(loc.line) &&
        isValidNumber(loc.column)
    );
}

function createNodeStructureChecker(type, fields) {
    return function checkNode(node, warn) {
        if (!node || node.constructor !== Object) {
            return warn(node, 'Type of node should be an Object');
        }

        for (let key in node) {
            let valid = true;

            if (hasOwnProperty.call(node, key) === false) {
                continue;
            }

            if (key === 'type') {
                if (node.type !== type) {
                    warn(node, 'Wrong node type `' + node.type + '`, expected `' + type + '`');
                }
            } else if (key === 'loc') {
                if (node.loc === null) {
                    continue;
                } else if (node.loc && node.loc.constructor === Object) {
                    if (typeof node.loc.source !== 'string') {
                        key += '.source';
                    } else if (!isValidLocation(node.loc.start)) {
                        key += '.start';
                    } else if (!isValidLocation(node.loc.end)) {
                        key += '.end';
                    } else {
                        continue;
                    }
                }

                valid = false;
            } else if (fields.hasOwnProperty(key)) {
                valid = false;

                for (let i = 0; !valid && i < fields[key].length; i++) {
                    const fieldType = fields[key][i];

                    switch (fieldType) {
                        case String:
                            valid = typeof node[key] === 'string';
                            break;

                        case Boolean:
                            valid = typeof node[key] === 'boolean';
                            break;

                        case null:
                            valid = node[key] === null;
                            break;

                        default:
                            if (typeof fieldType === 'string') {
                                valid = node[key] && node[key].type === fieldType;
                            } else if (Array.isArray(fieldType)) {
                                valid = node[key] instanceof List.List;
                            }
                    }
                }
            } else {
                warn(node, 'Unknown field `' + key + '` for ' + type + ' node type');
            }

            if (!valid) {
                warn(node, 'Bad value for `' + type + '.' + key + '`');
            }
        }

        for (const key in fields) {
            if (hasOwnProperty.call(fields, key) &&
                hasOwnProperty.call(node, key) === false) {
                warn(node, 'Field `' + type + '.' + key + '` is missed');
            }
        }
    };
}

function processStructure(name, nodeType) {
    const structure = nodeType.structure;
    const fields = {
        type: String,
        loc: true
    };
    const docs = {
        type: '"' + name + '"'
    };

    for (const key in structure) {
        if (hasOwnProperty.call(structure, key) === false) {
            continue;
        }

        const docsTypes = [];
        const fieldTypes = fields[key] = Array.isArray(structure[key])
            ? structure[key].slice()
            : [structure[key]];

        for (let i = 0; i < fieldTypes.length; i++) {
            const fieldType = fieldTypes[i];
            if (fieldType === String || fieldType === Boolean) {
                docsTypes.push(fieldType.name);
            } else if (fieldType === null) {
                docsTypes.push('null');
            } else if (typeof fieldType === 'string') {
                docsTypes.push('<' + fieldType + '>');
            } else if (Array.isArray(fieldType)) {
                docsTypes.push('List'); // TODO: use type enum
            } else {
                throw new Error('Wrong value `' + fieldType + '` in `' + name + '.' + key + '` structure definition');
            }
        }

        docs[key] = docsTypes.join(' | ');
    }

    return {
        docs,
        check: createNodeStructureChecker(name, fields)
    };
}

function getStructureFromConfig(config) {
    const structure = {};

    if (config.node) {
        for (const name in config.node) {
            if (hasOwnProperty.call(config.node, name)) {
                const nodeType = config.node[name];

                if (nodeType.structure) {
                    structure[name] = processStructure(name, nodeType);
                } else {
                    throw new Error('Missed `structure` field in `' + name + '` node type definition');
                }
            }
        }
    }

    return structure;
}

exports.getStructureFromConfig = getStructureFromConfig;

},{"../utils/List.cjs":102}],25:[function(require,module,exports){
'use strict';

function getTrace(node) {
    function shouldPutToTrace(syntax) {
        if (syntax === null) {
            return false;
        }

        return (
            syntax.type === 'Type' ||
            syntax.type === 'Property' ||
            syntax.type === 'Keyword'
        );
    }

    function hasMatch(matchNode) {
        if (Array.isArray(matchNode.match)) {
            // use for-loop for better perfomance
            for (let i = 0; i < matchNode.match.length; i++) {
                if (hasMatch(matchNode.match[i])) {
                    if (shouldPutToTrace(matchNode.syntax)) {
                        result.unshift(matchNode.syntax);
                    }

                    return true;
                }
            }
        } else if (matchNode.node === node) {
            result = shouldPutToTrace(matchNode.syntax)
                ? [matchNode.syntax]
                : [];

            return true;
        }

        return false;
    }

    let result = null;

    if (this.matched !== null) {
        hasMatch(this.matched);
    }

    return result;
}

function isType(node, type) {
    return testNode(this, node, match => match.type === 'Type' && match.name === type);
}

function isProperty(node, property) {
    return testNode(this, node, match => match.type === 'Property' && match.name === property);
}

function isKeyword(node) {
    return testNode(this, node, match => match.type === 'Keyword');
}

function testNode(match, node, fn) {
    const trace = getTrace.call(match, node);

    if (trace === null) {
        return false;
    }

    return trace.some(fn);
}

exports.getTrace = getTrace;
exports.isKeyword = isKeyword;
exports.isProperty = isProperty;
exports.isType = isType;

},{}],26:[function(require,module,exports){
'use strict';

const length = [
    // absolute length units https://www.w3.org/TR/css-values-3/#lengths
    'cm', 'mm', 'q', 'in', 'pt', 'pc', 'px',
    // font-relative length units https://drafts.csswg.org/css-values-4/#font-relative-lengths
    'em', 'rem',
    'ex', 'rex',
    'cap', 'rcap',
    'ch', 'rch',
    'ic', 'ric',
    'lh', 'rlh',
    // viewport-percentage lengths https://drafts.csswg.org/css-values-4/#viewport-relative-lengths
    'vw', 'svw', 'lvw', 'dvw',
    'vh', 'svh', 'lvh', 'dvh',
    'vi', 'svi', 'lvi', 'dvi',
    'vb', 'svb', 'lvb', 'dvb',
    'vmin', 'svmin', 'lvmin', 'dvmin',
    'vmax', 'svmax', 'lvmax', 'dvmax',
    // container relative lengths https://drafts.csswg.org/css-contain-3/#container-lengths
    'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax'
];
const angle = ['deg', 'grad', 'rad', 'turn'];    // https://www.w3.org/TR/css-values-3/#angles
const time = ['s', 'ms'];                        // https://www.w3.org/TR/css-values-3/#time
const frequency = ['hz', 'khz'];                 // https://www.w3.org/TR/css-values-3/#frequency
const resolution = ['dpi', 'dpcm', 'dppx', 'x']; // https://www.w3.org/TR/css-values-3/#resolution
const flex = ['fr'];                             // https://drafts.csswg.org/css-grid/#fr-unit
const decibel = ['db'];                          // https://www.w3.org/TR/css3-speech/#mixing-props-voice-volume
const semitones = ['st'];                        // https://www.w3.org/TR/css3-speech/#voice-props-voice-pitch

exports.angle = angle;
exports.decibel = decibel;
exports.flex = flex;
exports.frequency = frequency;
exports.length = length;
exports.resolution = resolution;
exports.semitones = semitones;
exports.time = time;

},{}],27:[function(require,module,exports){
'use strict';

const createCustomError = require('../utils/create-custom-error.cjs');

const MAX_LINE_LENGTH = 100;
const OFFSET_CORRECTION = 60;
const TAB_REPLACEMENT = '    ';

function sourceFragment({ source, line, column }, extraLines) {
    function processLines(start, end) {
        return lines
            .slice(start, end)
            .map((line, idx) =>
                String(start + idx + 1).padStart(maxNumLength) + ' |' + line
            ).join('\n');
    }

    const lines = source.split(/\r\n?|\n|\f/);
    const startLine = Math.max(1, line - extraLines) - 1;
    const endLine = Math.min(line + extraLines, lines.length + 1);
    const maxNumLength = Math.max(4, String(endLine).length) + 1;
    let cutLeft = 0;

    // column correction according to replaced tab before column
    column += (TAB_REPLACEMENT.length - 1) * (lines[line - 1].substr(0, column - 1).match(/\t/g) || []).length;

    if (column > MAX_LINE_LENGTH) {
        cutLeft = column - OFFSET_CORRECTION + 3;
        column = OFFSET_CORRECTION - 2;
    }

    for (let i = startLine; i <= endLine; i++) {
        if (i >= 0 && i < lines.length) {
            lines[i] = lines[i].replace(/\t/g, TAB_REPLACEMENT);
            lines[i] =
                (cutLeft > 0 && lines[i].length > cutLeft ? '\u2026' : '') +
                lines[i].substr(cutLeft, MAX_LINE_LENGTH - 2) +
                (lines[i].length > cutLeft + MAX_LINE_LENGTH - 1 ? '\u2026' : '');
        }
    }

    return [
        processLines(startLine, line),
        new Array(column + maxNumLength + 2).join('-') + '^',
        processLines(line, endLine)
    ].filter(Boolean).join('\n');
}

function SyntaxError(message, source, offset, line, column) {
    const error = Object.assign(createCustomError.createCustomError('SyntaxError', message), {
        source,
        offset,
        line,
        column,
        sourceFragment(extraLines) {
            return sourceFragment({ source, line, column }, isNaN(extraLines) ? 0 : extraLines);
        },
        get formattedMessage() {
            return (
                `Parse error: ${message}\n` +
                sourceFragment({ source, line, column }, 2)
            );
        }
    });

    return error;
}

exports.SyntaxError = SyntaxError;

},{"../utils/create-custom-error.cjs":104}],28:[function(require,module,exports){
'use strict';

const List = require('../utils/List.cjs');
const SyntaxError = require('./SyntaxError.cjs');
const index = require('../tokenizer/index.cjs');
const sequence = require('./sequence.cjs');
const OffsetToLocation = require('../tokenizer/OffsetToLocation.cjs');
const TokenStream = require('../tokenizer/TokenStream.cjs');
const utils = require('../tokenizer/utils.cjs');
const types = require('../tokenizer/types.cjs');
const names = require('../tokenizer/names.cjs');

const NOOP = () => {};
const EXCLAMATIONMARK = 0x0021;  // U+0021 EXCLAMATION MARK (!)
const NUMBERSIGN = 0x0023;       // U+0023 NUMBER SIGN (#)
const SEMICOLON = 0x003B;        // U+003B SEMICOLON (;)
const LEFTCURLYBRACKET = 0x007B; // U+007B LEFT CURLY BRACKET ({)
const NULL = 0;

function createParseContext(name) {
    return function() {
        return this[name]();
    };
}

function fetchParseValues(dict) {
    const result = Object.create(null);

    for (const name in dict) {
        const item = dict[name];
        const fn = item.parse || item;

        if (fn) {
            result[name] = fn;
        }
    }

    return result;
}

function processConfig(config) {
    const parseConfig = {
        context: Object.create(null),
        scope: Object.assign(Object.create(null), config.scope),
        atrule: fetchParseValues(config.atrule),
        pseudo: fetchParseValues(config.pseudo),
        node: fetchParseValues(config.node)
    };

    for (const name in config.parseContext) {
        switch (typeof config.parseContext[name]) {
            case 'function':
                parseConfig.context[name] = config.parseContext[name];
                break;

            case 'string':
                parseConfig.context[name] = createParseContext(config.parseContext[name]);
                break;
        }
    }

    return {
        config: parseConfig,
        ...parseConfig,
        ...parseConfig.node
    };
}

function createParser(config) {
    let source = '';
    let filename = '<unknown>';
    let needPositions = false;
    let onParseError = NOOP;
    let onParseErrorThrow = false;

    const locationMap = new OffsetToLocation.OffsetToLocation();
    const parser = Object.assign(new TokenStream.TokenStream(), processConfig(config || {}), {
        parseAtrulePrelude: true,
        parseRulePrelude: true,
        parseValue: true,
        parseCustomProperty: false,

        readSequence: sequence.readSequence,

        consumeUntilBalanceEnd: () => 0,
        consumeUntilLeftCurlyBracket(code) {
            return code === LEFTCURLYBRACKET ? 1 : 0;
        },
        consumeUntilLeftCurlyBracketOrSemicolon(code) {
            return code === LEFTCURLYBRACKET || code === SEMICOLON ? 1 : 0;
        },
        consumeUntilExclamationMarkOrSemicolon(code) {
            return code === EXCLAMATIONMARK || code === SEMICOLON ? 1 : 0;
        },
        consumeUntilSemicolonIncluded(code) {
            return code === SEMICOLON ? 2 : 0;
        },

        createList() {
            return new List.List();
        },
        createSingleNodeList(node) {
            return new List.List().appendData(node);
        },
        getFirstListNode(list) {
            return list && list.first;
        },
        getLastListNode(list) {
            return list && list.last;
        },

        parseWithFallback(consumer, fallback) {
            const startToken = this.tokenIndex;

            try {
                return consumer.call(this);
            } catch (e) {
                if (onParseErrorThrow) {
                    throw e;
                }

                const fallbackNode = fallback.call(this, startToken);

                onParseErrorThrow = true;
                onParseError(e, fallbackNode);
                onParseErrorThrow = false;

                return fallbackNode;
            }
        },

        lookupNonWSType(offset) {
            let type;

            do {
                type = this.lookupType(offset++);
                if (type !== types.WhiteSpace) {
                    return type;
                }
            } while (type !== NULL);

            return NULL;
        },

        charCodeAt(offset) {
            return offset >= 0 && offset < source.length ? source.charCodeAt(offset) : 0;
        },
        substring(offsetStart, offsetEnd) {
            return source.substring(offsetStart, offsetEnd);
        },
        substrToCursor(start) {
            return this.source.substring(start, this.tokenStart);
        },

        cmpChar(offset, charCode) {
            return utils.cmpChar(source, offset, charCode);
        },
        cmpStr(offsetStart, offsetEnd, str) {
            return utils.cmpStr(source, offsetStart, offsetEnd, str);
        },

        consume(tokenType) {
            const start = this.tokenStart;

            this.eat(tokenType);

            return this.substrToCursor(start);
        },
        consumeFunctionName() {
            const name = source.substring(this.tokenStart, this.tokenEnd - 1);

            this.eat(types.Function);

            return name;
        },
        consumeNumber(type) {
            const number = source.substring(this.tokenStart, utils.consumeNumber(source, this.tokenStart));

            this.eat(type);

            return number;
        },

        eat(tokenType) {
            if (this.tokenType !== tokenType) {
                const tokenName = names[tokenType].slice(0, -6).replace(/-/g, ' ').replace(/^./, m => m.toUpperCase());
                let message = `${/[[\](){}]/.test(tokenName) ? `"${tokenName}"` : tokenName} is expected`;
                let offset = this.tokenStart;

                // tweak message and offset
                switch (tokenType) {
                    case types.Ident:
                        // when identifier is expected but there is a function or url
                        if (this.tokenType === types.Function || this.tokenType === types.Url) {
                            offset = this.tokenEnd - 1;
                            message = 'Identifier is expected but function found';
                        } else {
                            message = 'Identifier is expected';
                        }
                        break;

                    case types.Hash:
                        if (this.isDelim(NUMBERSIGN)) {
                            this.next();
                            offset++;
                            message = 'Name is expected';
                        }
                        break;

                    case types.Percentage:
                        if (this.tokenType === types.Number) {
                            offset = this.tokenEnd;
                            message = 'Percent sign is expected';
                        }
                        break;
                }

                this.error(message, offset);
            }

            this.next();
        },
        eatIdent(name) {
            if (this.tokenType !== types.Ident || this.lookupValue(0, name) === false) {
                this.error(`Identifier "${name}" is expected`);
            }

            this.next();
        },
        eatDelim(code) {
            if (!this.isDelim(code)) {
                this.error(`Delim "${String.fromCharCode(code)}" is expected`);
            }

            this.next();
        },

        getLocation(start, end) {
            if (needPositions) {
                return locationMap.getLocationRange(
                    start,
                    end,
                    filename
                );
            }

            return null;
        },
        getLocationFromList(list) {
            if (needPositions) {
                const head = this.getFirstListNode(list);
                const tail = this.getLastListNode(list);
                return locationMap.getLocationRange(
                    head !== null ? head.loc.start.offset - locationMap.startOffset : this.tokenStart,
                    tail !== null ? tail.loc.end.offset - locationMap.startOffset : this.tokenStart,
                    filename
                );
            }

            return null;
        },

        error(message, offset) {
            const location = typeof offset !== 'undefined' && offset < source.length
                ? locationMap.getLocation(offset)
                : this.eof
                    ? locationMap.getLocation(utils.findWhiteSpaceStart(source, source.length - 1))
                    : locationMap.getLocation(this.tokenStart);

            throw new SyntaxError.SyntaxError(
                message || 'Unexpected input',
                source,
                location.offset,
                location.line,
                location.column
            );
        }
    });

    const parse = function(source_, options) {
        source = source_;
        options = options || {};

        parser.setSource(source, index.tokenize);
        locationMap.setSource(
            source,
            options.offset,
            options.line,
            options.column
        );

        filename = options.filename || '<unknown>';
        needPositions = Boolean(options.positions);
        onParseError = typeof options.onParseError === 'function' ? options.onParseError : NOOP;
        onParseErrorThrow = false;

        parser.parseAtrulePrelude = 'parseAtrulePrelude' in options ? Boolean(options.parseAtrulePrelude) : true;
        parser.parseRulePrelude = 'parseRulePrelude' in options ? Boolean(options.parseRulePrelude) : true;
        parser.parseValue = 'parseValue' in options ? Boolean(options.parseValue) : true;
        parser.parseCustomProperty = 'parseCustomProperty' in options ? Boolean(options.parseCustomProperty) : false;

        const { context = 'default', onComment } = options;

        if (context in parser.context === false) {
            throw new Error('Unknown context `' + context + '`');
        }

        if (typeof onComment === 'function') {
            parser.forEachToken((type, start, end) => {
                if (type === types.Comment) {
                    const loc = parser.getLocation(start, end);
                    const value = utils.cmpStr(source, end - 2, end, '*/')
                        ? source.slice(start + 2, end - 2)
                        : source.slice(start + 2, end);

                    onComment(value, loc);
                }
            });
        }

        const ast = parser.context[context].call(parser, options);

        if (!parser.eof) {
            parser.error();
        }

        return ast;
    };

    return Object.assign(parse, {
        SyntaxError: SyntaxError.SyntaxError,
        config: parser.config
    });
}

exports.createParser = createParser;

},{"../tokenizer/OffsetToLocation.cjs":94,"../tokenizer/TokenStream.cjs":95,"../tokenizer/index.cjs":98,"../tokenizer/names.cjs":99,"../tokenizer/types.cjs":100,"../tokenizer/utils.cjs":101,"../utils/List.cjs":102,"./SyntaxError.cjs":27,"./sequence.cjs":29}],29:[function(require,module,exports){
'use strict';

const types = require('../tokenizer/types.cjs');

function readSequence(recognizer) {
    const children = this.createList();
    let space = false;
    const context = {
        recognizer
    };

    while (!this.eof) {
        switch (this.tokenType) {
            case types.Comment:
                this.next();
                continue;

            case types.WhiteSpace:
                space = true;
                this.next();
                continue;
        }

        let child = recognizer.getNode.call(this, context);

        if (child === undefined) {
            break;
        }

        if (space) {
            if (recognizer.onWhiteSpace) {
                recognizer.onWhiteSpace.call(this, child, children, context);
            }
            space = false;
        }

        children.push(child);
    }

    if (space && recognizer.onWhiteSpace) {
        recognizer.onWhiteSpace.call(this, null, children, context);
    }

    return children;
}

exports.readSequence = readSequence;

},{"../tokenizer/types.cjs":100}],30:[function(require,module,exports){
'use strict';

const fontFace = {
    parse: {
        prelude: null,
        block() {
            return this.Block(true);
        }
    }
};

module.exports = fontFace;

},{}],31:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const importAtrule = {
    parse: {
        prelude() {
            const children = this.createList();

            this.skipSC();

            switch (this.tokenType) {
                case types.String:
                    children.push(this.String());
                    break;

                case types.Url:
                case types.Function:
                    children.push(this.Url());
                    break;

                default:
                    this.error('String or url() is expected');
            }

            if (this.lookupNonWSType(0) === types.Ident ||
                this.lookupNonWSType(0) === types.LeftParenthesis) {
                children.push(this.MediaQueryList());
            }

            return children;
        },
        block: null
    }
};

module.exports = importAtrule;

},{"../../tokenizer/types.cjs":100}],32:[function(require,module,exports){
'use strict';

const fontFace = require('./font-face.cjs');
const _import = require('./import.cjs');
const media = require('./media.cjs');
const nest = require('./nest.cjs');
const page = require('./page.cjs');
const supports = require('./supports.cjs');

const atrule = {
    'font-face': fontFace,
    'import': _import,
    media,
    nest,
    page,
    supports
};

module.exports = atrule;

},{"./font-face.cjs":30,"./import.cjs":31,"./media.cjs":33,"./nest.cjs":34,"./page.cjs":35,"./supports.cjs":36}],33:[function(require,module,exports){
'use strict';

const media = {
    parse: {
        prelude() {
            return this.createSingleNodeList(
                this.MediaQueryList()
            );
        },
        block(isStyleBlock = false) {
            return this.Block(isStyleBlock);
        }
    }
};

module.exports = media;

},{}],34:[function(require,module,exports){
'use strict';

const nest = {
    parse: {
        prelude() {
            return this.createSingleNodeList(
                this.SelectorList()
            );
        },
        block() {
            return this.Block(true);
        }
    }
};

module.exports = nest;

},{}],35:[function(require,module,exports){
'use strict';

const page = {
    parse: {
        prelude() {
            return this.createSingleNodeList(
                this.SelectorList()
            );
        },
        block() {
            return this.Block(true);
        }
    }
};

module.exports = page;

},{}],36:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

function consumeRaw() {
    return this.createSingleNodeList(
        this.Raw(this.tokenIndex, null, false)
    );
}

function parentheses() {
    this.skipSC();

    if (this.tokenType === types.Ident &&
        this.lookupNonWSType(1) === types.Colon) {
        return this.createSingleNodeList(
            this.Declaration()
        );
    }

    return readSequence.call(this);
}

function readSequence() {
    const children = this.createList();
    let child;

    this.skipSC();

    scan:
    while (!this.eof) {
        switch (this.tokenType) {
            case types.Comment:
            case types.WhiteSpace:
                this.next();
                continue;

            case types.Function:
                child = this.Function(consumeRaw, this.scope.AtrulePrelude);
                break;

            case types.Ident:
                child = this.Identifier();
                break;

            case types.LeftParenthesis:
                child = this.Parentheses(parentheses, this.scope.AtrulePrelude);
                break;

            default:
                break scan;
        }

        children.push(child);
    }

    return children;
}

const supports = {
    parse: {
        prelude() {
            const children = readSequence.call(this);

            if (this.getFirstListNode(children) === null) {
                this.error('Condition is expected');
            }

            return children;
        },
        block(isStyleBlock = false) {
            return this.Block(isStyleBlock);
        }
    }
};

module.exports = supports;

},{"../../tokenizer/types.cjs":100}],37:[function(require,module,exports){
'use strict';

const data = require('../../data.cjs');
const index = require('../node/index.cjs');

const lexerConfig = {
    generic: true,
    ...data,
    node: index
};

module.exports = lexerConfig;

},{"../../data.cjs":110,"../node/index.cjs":87}],38:[function(require,module,exports){
'use strict';

function appendOrSet(a, b) {
    if (typeof b === 'string' && /^\s*\|/.test(b)) {
        return typeof a === 'string'
            ? a + b
            : b.replace(/^\s*\|\s*/, '');
    }

    return b || null;
}

function sliceProps(obj, props) {
    const result = Object.create(null);

    for (const [key, value] of Object.entries(obj)) {
        if (value) {
            result[key] = {};
            for (const prop of Object.keys(value)) {
                if (props.includes(prop)) {
                    result[key][prop] = value[prop];
                }
            }
        }
    }

    return result;
}

function mix(dest, src) {
    const result = { ...dest };

    for (const [prop, value] of Object.entries(src)) {
        switch (prop) {
            case 'generic':
                result[prop] = Boolean(value);
                break;

            case 'units':
                result[prop] = { ...dest[prop] };
                for (const [name, patch] of Object.entries(value)) {
                    result[prop][name] = Array.isArray(patch) ? patch : [];
                }
                break;

            case 'atrules':
                result[prop] = { ...dest[prop] };

                for (const [name, atrule] of Object.entries(value)) {
                    const exists = result[prop][name] || {};
                    const current = result[prop][name] = {
                        prelude: exists.prelude || null,
                        descriptors: {
                            ...exists.descriptors
                        }
                    };

                    if (!atrule) {
                        continue;
                    }

                    current.prelude = atrule.prelude
                        ? appendOrSet(current.prelude, atrule.prelude)
                        : current.prelude || null;

                    for (const [descriptorName, descriptorValue] of Object.entries(atrule.descriptors || {})) {
                        current.descriptors[descriptorName] = descriptorValue
                            ? appendOrSet(current.descriptors[descriptorName], descriptorValue)
                            : null;
                    }

                    if (!Object.keys(current.descriptors).length) {
                        current.descriptors = null;
                    }
                }
                break;

            case 'types':
            case 'properties':
                result[prop] = { ...dest[prop] };
                for (const [name, syntax] of Object.entries(value)) {
                    result[prop][name] = appendOrSet(result[prop][name], syntax);
                }
                break;

            case 'scope':
                result[prop] = { ...dest[prop] };
                for (const [name, props] of Object.entries(value)) {
                    result[prop][name] = { ...result[prop][name], ...props };
                }
                break;

            case 'parseContext':
                result[prop] = {
                    ...dest[prop],
                    ...value
                };
                break;

            case 'atrule':
            case 'pseudo':
                result[prop] = {
                    ...dest[prop],
                    ...sliceProps(value, ['parse']) };
                break;

            case 'node':
                result[prop] = {
                    ...dest[prop],
                    ...sliceProps(value, ['name', 'structure', 'parse', 'generate', 'walkContext'])
                };
                break;
        }
    }

    return result;
}

module.exports = mix;

},{}],39:[function(require,module,exports){
'use strict';

const index = require('../scope/index.cjs');
const index$1 = require('../atrule/index.cjs');
const index$2 = require('../pseudo/index.cjs');
const indexParse = require('../node/index-parse.cjs');

const config = {
    parseContext: {
        default: 'StyleSheet',
        stylesheet: 'StyleSheet',
        atrule: 'Atrule',
        atrulePrelude(options) {
            return this.AtrulePrelude(options.atrule ? String(options.atrule) : null);
        },
        mediaQueryList: 'MediaQueryList',
        mediaQuery: 'MediaQuery',
        rule: 'Rule',
        selectorList: 'SelectorList',
        selector: 'Selector',
        block() {
            return this.Block(true);
        },
        declarationList: 'DeclarationList',
        declaration: 'Declaration',
        value: 'Value'
    },
    scope: index,
    atrule: index$1,
    pseudo: index$2,
    node: indexParse
};

module.exports = config;

},{"../atrule/index.cjs":32,"../node/index-parse.cjs":86,"../pseudo/index.cjs":88,"../scope/index.cjs":91}],40:[function(require,module,exports){
'use strict';

const index = require('../node/index.cjs');

const config = {
    node: index
};

module.exports = config;

},{"../node/index.cjs":87}],41:[function(require,module,exports){
'use strict';

const index = require('../tokenizer/index.cjs');
const create = require('../parser/create.cjs');
const create$2 = require('../generator/create.cjs');
const create$3 = require('../convertor/create.cjs');
const create$1 = require('../walker/create.cjs');
const Lexer = require('../lexer/Lexer.cjs');
const mix = require('./config/mix.cjs');

function createSyntax(config) {
    const parse = create.createParser(config);
    const walk = create$1.createWalker(config);
    const generate = create$2.createGenerator(config);
    const { fromPlainObject, toPlainObject } = create$3.createConvertor(walk);

    const syntax = {
        lexer: null,
        createLexer: config => new Lexer.Lexer(config, syntax, syntax.lexer.structure),

        tokenize: index.tokenize,
        parse,
        generate,

        walk,
        find: walk.find,
        findLast: walk.findLast,
        findAll: walk.findAll,

        fromPlainObject,
        toPlainObject,

        fork(extension) {
            const base = mix({}, config); // copy of config

            return createSyntax(
                typeof extension === 'function'
                    ? extension(base, Object.assign)
                    : mix(base, extension)
            );
        }
    };

    syntax.lexer = new Lexer.Lexer({
        generic: true,
        units: config.units,
        types: config.types,
        atrules: config.atrules,
        properties: config.properties,
        node: config.node
    }, syntax);

    return syntax;
}
const createSyntax$1 = config => createSyntax(mix({}, config));

module.exports = createSyntax$1;

},{"../convertor/create.cjs":3,"../generator/create.cjs":10,"../lexer/Lexer.cjs":14,"../parser/create.cjs":28,"../tokenizer/index.cjs":98,"../walker/create.cjs":109,"./config/mix.cjs":38}],42:[function(require,module,exports){
'use strict';

// legacy IE function
// expression( <any-value> )
function expressionFn() {
    return this.createSingleNodeList(
        this.Raw(this.tokenIndex, null, false)
    );
}

module.exports = expressionFn;

},{}],43:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

// var( <ident> , <value>? )
function varFn() {
    const children = this.createList();

    this.skipSC();

    // NOTE: Don't check more than a first argument is an ident, rest checks are for lexer
    children.push(this.Identifier());

    this.skipSC();

    if (this.tokenType === types.Comma) {
        children.push(this.Operator());

        const startIndex = this.tokenIndex;
        const value = this.parseCustomProperty
            ? this.Value(null)
            : this.Raw(this.tokenIndex, this.consumeUntilExclamationMarkOrSemicolon, false);

        if (value.type === 'Value' && value.children.isEmpty) {
            for (let offset = startIndex - this.tokenIndex; offset <= 0; offset++) {
                if (this.lookupType(offset) === types.WhiteSpace) {
                    value.children.appendData({
                        type: 'WhiteSpace',
                        loc: null,
                        value: ' '
                    });
                    break;
                }
            }
        }

        children.push(value);
    }

    return children;
}

module.exports = varFn;

},{"../../tokenizer/types.cjs":100}],44:[function(require,module,exports){
'use strict';

const create = require('./create.cjs');
const lexer = require('./config/lexer.cjs');
const parser = require('./config/parser.cjs');
const walker = require('./config/walker.cjs');

const syntax = create({
    ...lexer,
    ...parser,
    ...walker
});

module.exports = syntax;

},{"./config/lexer.cjs":37,"./config/parser.cjs":39,"./config/walker.cjs":40,"./create.cjs":41}],45:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');
const charCodeDefinitions = require('../../tokenizer/char-code-definitions.cjs');

const PLUSSIGN = 0x002B;    // U+002B PLUS SIGN (+)
const HYPHENMINUS = 0x002D; // U+002D HYPHEN-MINUS (-)
const N = 0x006E;           // U+006E LATIN SMALL LETTER N (n)
const DISALLOW_SIGN = true;
const ALLOW_SIGN = false;

function checkInteger(offset, disallowSign) {
    let pos = this.tokenStart + offset;
    const code = this.charCodeAt(pos);

    if (code === PLUSSIGN || code === HYPHENMINUS) {
        if (disallowSign) {
            this.error('Number sign is not allowed');
        }
        pos++;
    }

    for (; pos < this.tokenEnd; pos++) {
        if (!charCodeDefinitions.isDigit(this.charCodeAt(pos))) {
            this.error('Integer is expected', pos);
        }
    }
}

function checkTokenIsInteger(disallowSign) {
    return checkInteger.call(this, 0, disallowSign);
}

function expectCharCode(offset, code) {
    if (!this.cmpChar(this.tokenStart + offset, code)) {
        let msg = '';

        switch (code) {
            case N:
                msg = 'N is expected';
                break;
            case HYPHENMINUS:
                msg = 'HyphenMinus is expected';
                break;
        }

        this.error(msg, this.tokenStart + offset);
    }
}

// ... <signed-integer>
// ... ['+' | '-'] <signless-integer>
function consumeB() {
    let offset = 0;
    let sign = 0;
    let type = this.tokenType;

    while (type === types.WhiteSpace || type === types.Comment) {
        type = this.lookupType(++offset);
    }

    if (type !== types.Number) {
        if (this.isDelim(PLUSSIGN, offset) ||
            this.isDelim(HYPHENMINUS, offset)) {
            sign = this.isDelim(PLUSSIGN, offset) ? PLUSSIGN : HYPHENMINUS;

            do {
                type = this.lookupType(++offset);
            } while (type === types.WhiteSpace || type === types.Comment);

            if (type !== types.Number) {
                this.skip(offset);
                checkTokenIsInteger.call(this, DISALLOW_SIGN);
            }
        } else {
            return null;
        }
    }

    if (offset > 0) {
        this.skip(offset);
    }

    if (sign === 0) {
        type = this.charCodeAt(this.tokenStart);
        if (type !== PLUSSIGN && type !== HYPHENMINUS) {
            this.error('Number sign is expected');
        }
    }

    checkTokenIsInteger.call(this, sign !== 0);
    return sign === HYPHENMINUS ? '-' + this.consume(types.Number) : this.consume(types.Number);
}

// An+B microsyntax https://www.w3.org/TR/css-syntax-3/#anb
const name = 'AnPlusB';
const structure = {
    a: [String, null],
    b: [String, null]
};

function parse() {
    /* eslint-disable brace-style*/
    const start = this.tokenStart;
    let a = null;
    let b = null;

    // <integer>
    if (this.tokenType === types.Number) {
        checkTokenIsInteger.call(this, ALLOW_SIGN);
        b = this.consume(types.Number);
    }

    // -n
    // -n <signed-integer>
    // -n ['+' | '-'] <signless-integer>
    // -n- <signless-integer>
    // <dashndashdigit-ident>
    else if (this.tokenType === types.Ident && this.cmpChar(this.tokenStart, HYPHENMINUS)) {
        a = '-1';

        expectCharCode.call(this, 1, N);

        switch (this.tokenEnd - this.tokenStart) {
            // -n
            // -n <signed-integer>
            // -n ['+' | '-'] <signless-integer>
            case 2:
                this.next();
                b = consumeB.call(this);
                break;

            // -n- <signless-integer>
            case 3:
                expectCharCode.call(this, 2, HYPHENMINUS);

                this.next();
                this.skipSC();

                checkTokenIsInteger.call(this, DISALLOW_SIGN);

                b = '-' + this.consume(types.Number);
                break;

            // <dashndashdigit-ident>
            default:
                expectCharCode.call(this, 2, HYPHENMINUS);
                checkInteger.call(this, 3, DISALLOW_SIGN);
                this.next();

                b = this.substrToCursor(start + 2);
        }
    }

    // '+'? n
    // '+'? n <signed-integer>
    // '+'? n ['+' | '-'] <signless-integer>
    // '+'? n- <signless-integer>
    // '+'? <ndashdigit-ident>
    else if (this.tokenType === types.Ident || (this.isDelim(PLUSSIGN) && this.lookupType(1) === types.Ident)) {
        let sign = 0;
        a = '1';

        // just ignore a plus
        if (this.isDelim(PLUSSIGN)) {
            sign = 1;
            this.next();
        }

        expectCharCode.call(this, 0, N);

        switch (this.tokenEnd - this.tokenStart) {
            // '+'? n
            // '+'? n <signed-integer>
            // '+'? n ['+' | '-'] <signless-integer>
            case 1:
                this.next();
                b = consumeB.call(this);
                break;

            // '+'? n- <signless-integer>
            case 2:
                expectCharCode.call(this, 1, HYPHENMINUS);

                this.next();
                this.skipSC();

                checkTokenIsInteger.call(this, DISALLOW_SIGN);

                b = '-' + this.consume(types.Number);
                break;

            // '+'? <ndashdigit-ident>
            default:
                expectCharCode.call(this, 1, HYPHENMINUS);
                checkInteger.call(this, 2, DISALLOW_SIGN);
                this.next();

                b = this.substrToCursor(start + sign + 1);
        }
    }

    // <ndashdigit-dimension>
    // <ndash-dimension> <signless-integer>
    // <n-dimension>
    // <n-dimension> <signed-integer>
    // <n-dimension> ['+' | '-'] <signless-integer>
    else if (this.tokenType === types.Dimension) {
        const code = this.charCodeAt(this.tokenStart);
        const sign = code === PLUSSIGN || code === HYPHENMINUS;
        let i = this.tokenStart + sign;

        for (; i < this.tokenEnd; i++) {
            if (!charCodeDefinitions.isDigit(this.charCodeAt(i))) {
                break;
            }
        }

        if (i === this.tokenStart + sign) {
            this.error('Integer is expected', this.tokenStart + sign);
        }

        expectCharCode.call(this, i - this.tokenStart, N);
        a = this.substring(start, i);

        // <n-dimension>
        // <n-dimension> <signed-integer>
        // <n-dimension> ['+' | '-'] <signless-integer>
        if (i + 1 === this.tokenEnd) {
            this.next();
            b = consumeB.call(this);
        } else {
            expectCharCode.call(this, i - this.tokenStart + 1, HYPHENMINUS);

            // <ndash-dimension> <signless-integer>
            if (i + 2 === this.tokenEnd) {
                this.next();
                this.skipSC();
                checkTokenIsInteger.call(this, DISALLOW_SIGN);
                b = '-' + this.consume(types.Number);
            }
            // <ndashdigit-dimension>
            else {
                checkInteger.call(this, i - this.tokenStart + 2, DISALLOW_SIGN);
                this.next();
                b = this.substrToCursor(i + 1);
            }
        }
    } else {
        this.error();
    }

    if (a !== null && a.charCodeAt(0) === PLUSSIGN) {
        a = a.substr(1);
    }

    if (b !== null && b.charCodeAt(0) === PLUSSIGN) {
        b = b.substr(1);
    }

    return {
        type: 'AnPlusB',
        loc: this.getLocation(start, this.tokenStart),
        a,
        b
    };
}

function generate(node) {
    if (node.a) {
        const a =
            node.a === '+1' && 'n' ||
            node.a ===  '1' && 'n' ||
            node.a === '-1' && '-n' ||
            node.a + 'n';

        if (node.b) {
            const b = node.b[0] === '-' || node.b[0] === '+'
                ? node.b
                : '+' + node.b;
            this.tokenize(a + b);
        } else {
            this.tokenize(a);
        }
    } else {
        this.tokenize(node.b);
    }
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/char-code-definitions.cjs":97,"../../tokenizer/types.cjs":100}],46:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

function consumeRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilLeftCurlyBracketOrSemicolon, true);
}

function isDeclarationBlockAtrule() {
    for (let offset = 1, type; type = this.lookupType(offset); offset++) {
        if (type === types.RightCurlyBracket) {
            return true;
        }

        if (type === types.LeftCurlyBracket ||
            type === types.AtKeyword) {
            return false;
        }
    }

    return false;
}


const name = 'Atrule';
const walkContext = 'atrule';
const structure = {
    name: String,
    prelude: ['AtrulePrelude', 'Raw', null],
    block: ['Block', null]
};

function parse(isDeclaration = false) {
    const start = this.tokenStart;
    let name;
    let nameLowerCase;
    let prelude = null;
    let block = null;

    this.eat(types.AtKeyword);

    name = this.substrToCursor(start + 1);
    nameLowerCase = name.toLowerCase();
    this.skipSC();

    // parse prelude
    if (this.eof === false &&
        this.tokenType !== types.LeftCurlyBracket &&
        this.tokenType !== types.Semicolon) {
        if (this.parseAtrulePrelude) {
            prelude = this.parseWithFallback(this.AtrulePrelude.bind(this, name, isDeclaration), consumeRaw);
        } else {
            prelude = consumeRaw.call(this, this.tokenIndex);
        }

        this.skipSC();
    }

    switch (this.tokenType) {
        case types.Semicolon:
            this.next();
            break;

        case types.LeftCurlyBracket:
            if (hasOwnProperty.call(this.atrule, nameLowerCase) &&
                typeof this.atrule[nameLowerCase].block === 'function') {
                block = this.atrule[nameLowerCase].block.call(this, isDeclaration);
            } else {
                // TODO: should consume block content as Raw?
                block = this.Block(isDeclarationBlockAtrule.call(this));
            }

            break;
    }

    return {
        type: 'Atrule',
        loc: this.getLocation(start, this.tokenStart),
        name,
        prelude,
        block
    };
}

function generate(node) {
    this.token(types.AtKeyword, '@' + node.name);

    if (node.prelude !== null) {
        this.node(node.prelude);
    }

    if (node.block) {
        this.node(node.block);
    } else {
        this.token(types.Semicolon, ';');
    }
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],47:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'AtrulePrelude';
const walkContext = 'atrulePrelude';
const structure = {
    children: [[]]
};

function parse(name) {
    let children = null;

    if (name !== null) {
        name = name.toLowerCase();
    }

    this.skipSC();

    if (hasOwnProperty.call(this.atrule, name) &&
        typeof this.atrule[name].prelude === 'function') {
        // custom consumer
        children = this.atrule[name].prelude.call(this);
    } else {
        // default consumer
        children = this.readSequence(this.scope.AtrulePrelude);
    }

    this.skipSC();

    if (this.eof !== true &&
        this.tokenType !== types.LeftCurlyBracket &&
        this.tokenType !== types.Semicolon) {
        this.error('Semicolon or block is expected');
    }

    return {
        type: 'AtrulePrelude',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],48:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const DOLLARSIGN = 0x0024;       // U+0024 DOLLAR SIGN ($)
const ASTERISK = 0x002A;         // U+002A ASTERISK (*)
const EQUALSSIGN = 0x003D;       // U+003D EQUALS SIGN (=)
const CIRCUMFLEXACCENT = 0x005E; // U+005E (^)
const VERTICALLINE = 0x007C;     // U+007C VERTICAL LINE (|)
const TILDE = 0x007E;            // U+007E TILDE (~)

function getAttributeName() {
    if (this.eof) {
        this.error('Unexpected end of input');
    }

    const start = this.tokenStart;
    let expectIdent = false;

    if (this.isDelim(ASTERISK)) {
        expectIdent = true;
        this.next();
    } else if (!this.isDelim(VERTICALLINE)) {
        this.eat(types.Ident);
    }

    if (this.isDelim(VERTICALLINE)) {
        if (this.charCodeAt(this.tokenStart + 1) !== EQUALSSIGN) {
            this.next();
            this.eat(types.Ident);
        } else if (expectIdent) {
            this.error('Identifier is expected', this.tokenEnd);
        }
    } else if (expectIdent) {
        this.error('Vertical line is expected');
    }

    return {
        type: 'Identifier',
        loc: this.getLocation(start, this.tokenStart),
        name: this.substrToCursor(start)
    };
}

function getOperator() {
    const start = this.tokenStart;
    const code = this.charCodeAt(start);

    if (code !== EQUALSSIGN &&        // =
        code !== TILDE &&             // ~=
        code !== CIRCUMFLEXACCENT &&  // ^=
        code !== DOLLARSIGN &&        // $=
        code !== ASTERISK &&          // *=
        code !== VERTICALLINE         // |=
    ) {
        this.error('Attribute selector (=, ~=, ^=, $=, *=, |=) is expected');
    }

    this.next();

    if (code !== EQUALSSIGN) {
        if (!this.isDelim(EQUALSSIGN)) {
            this.error('Equal sign is expected');
        }

        this.next();
    }

    return this.substrToCursor(start);
}

// '[' <wq-name> ']'
// '[' <wq-name> <attr-matcher> [ <string-token> | <ident-token> ] <attr-modifier>? ']'
const name = 'AttributeSelector';
const structure = {
    name: 'Identifier',
    matcher: [String, null],
    value: ['String', 'Identifier', null],
    flags: [String, null]
};

function parse() {
    const start = this.tokenStart;
    let name;
    let matcher = null;
    let value = null;
    let flags = null;

    this.eat(types.LeftSquareBracket);
    this.skipSC();

    name = getAttributeName.call(this);
    this.skipSC();

    if (this.tokenType !== types.RightSquareBracket) {
        // avoid case `[name i]`
        if (this.tokenType !== types.Ident) {
            matcher = getOperator.call(this);

            this.skipSC();

            value = this.tokenType === types.String
                ? this.String()
                : this.Identifier();

            this.skipSC();
        }

        // attribute flags
        if (this.tokenType === types.Ident) {
            flags = this.consume(types.Ident);

            this.skipSC();
        }
    }

    this.eat(types.RightSquareBracket);

    return {
        type: 'AttributeSelector',
        loc: this.getLocation(start, this.tokenStart),
        name,
        matcher,
        value,
        flags
    };
}

function generate(node) {
    this.token(types.Delim, '[');
    this.node(node.name);

    if (node.matcher !== null) {
        this.tokenize(node.matcher);
        this.node(node.value);
    }

    if (node.flags !== null) {
        this.token(types.Ident, node.flags);
    }

    this.token(types.Delim, ']');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],49:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const AMPERSAND = 0x0026;       // U+0026 AMPERSAND (&)

function consumeRaw(startToken) {
    return this.Raw(startToken, null, true);
}
function consumeRule() {
    return this.parseWithFallback(this.Rule, consumeRaw);
}
function consumeRawDeclaration(startToken) {
    return this.Raw(startToken, this.consumeUntilSemicolonIncluded, true);
}
function consumeDeclaration() {
    if (this.tokenType === types.Semicolon) {
        return consumeRawDeclaration.call(this, this.tokenIndex);
    }

    const node = this.parseWithFallback(this.Declaration, consumeRawDeclaration);

    if (this.tokenType === types.Semicolon) {
        this.next();
    }

    return node;
}

const name = 'Block';
const walkContext = 'block';
const structure = {
    children: [[
        'Atrule',
        'Rule',
        'Declaration'
    ]]
};

function parse(isStyleBlock) {
    const consumer = isStyleBlock ? consumeDeclaration : consumeRule;
    const start = this.tokenStart;
    let children = this.createList();

    this.eat(types.LeftCurlyBracket);

    scan:
    while (!this.eof) {
        switch (this.tokenType) {
            case types.RightCurlyBracket:
                break scan;

            case types.WhiteSpace:
            case types.Comment:
                this.next();
                break;

            case types.AtKeyword:
                children.push(this.parseWithFallback(this.Atrule.bind(this, isStyleBlock), consumeRaw));
                break;

            default:
                if (isStyleBlock && this.isDelim(AMPERSAND))  {
                    children.push(consumeRule.call(this));
                } else {
                    children.push(consumer.call(this));
                }
        }
    }

    if (!this.eof) {
        this.eat(types.RightCurlyBracket);
    }

    return {
        type: 'Block',
        loc: this.getLocation(start, this.tokenStart),
        children
    };
}

function generate(node) {
    this.token(types.LeftCurlyBracket, '{');
    this.children(node, prev => {
        if (prev.type === 'Declaration') {
            this.token(types.Semicolon, ';');
        }
    });
    this.token(types.RightCurlyBracket, '}');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],50:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Brackets';
const structure = {
    children: [[]]
};

function parse(readSequence, recognizer) {
    const start = this.tokenStart;
    let children = null;

    this.eat(types.LeftSquareBracket);

    children = readSequence.call(this, recognizer);

    if (!this.eof) {
        this.eat(types.RightSquareBracket);
    }

    return {
        type: 'Brackets',
        loc: this.getLocation(start, this.tokenStart),
        children
    };
}

function generate(node) {
    this.token(types.Delim, '[');
    this.children(node);
    this.token(types.Delim, ']');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],51:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'CDC';
const structure = [];

function parse() {
    const start = this.tokenStart;

    this.eat(types.CDC); // -->

    return {
        type: 'CDC',
        loc: this.getLocation(start, this.tokenStart)
    };
}

function generate() {
    this.token(types.CDC, '-->');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],52:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'CDO';
const structure = [];

function parse() {
    const start = this.tokenStart;

    this.eat(types.CDO); // <!--

    return {
        type: 'CDO',
        loc: this.getLocation(start, this.tokenStart)
    };
}

function generate() {
    this.token(types.CDO, '<!--');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],53:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const FULLSTOP = 0x002E; // U+002E FULL STOP (.)

// '.' ident
const name = 'ClassSelector';
const structure = {
    name: String
};

function parse() {
    this.eatDelim(FULLSTOP);

    return {
        type: 'ClassSelector',
        loc: this.getLocation(this.tokenStart - 1, this.tokenEnd),
        name: this.consume(types.Ident)
    };
}

function generate(node) {
    this.token(types.Delim, '.');
    this.token(types.Ident, node.name);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],54:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const PLUSSIGN = 0x002B;        // U+002B PLUS SIGN (+)
const SOLIDUS = 0x002F;         // U+002F SOLIDUS (/)
const GREATERTHANSIGN = 0x003E; // U+003E GREATER-THAN SIGN (>)
const TILDE = 0x007E;           // U+007E TILDE (~)

const name = 'Combinator';
const structure = {
    name: String
};

// + | > | ~ | /deep/
function parse() {
    const start = this.tokenStart;
    let name;

    switch (this.tokenType) {
        case types.WhiteSpace:
            name = ' ';
            break;

        case types.Delim:
            switch (this.charCodeAt(this.tokenStart)) {
                case GREATERTHANSIGN:
                case PLUSSIGN:
                case TILDE:
                    this.next();
                    break;

                case SOLIDUS:
                    this.next();
                    this.eatIdent('deep');
                    this.eatDelim(SOLIDUS);
                    break;

                default:
                    this.error('Combinator is expected');
            }

            name = this.substrToCursor(start);
            break;
    }

    return {
        type: 'Combinator',
        loc: this.getLocation(start, this.tokenStart),
        name
    };
}

function generate(node) {
    this.tokenize(node.name);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],55:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const ASTERISK = 0x002A;        // U+002A ASTERISK (*)
const SOLIDUS = 0x002F;         // U+002F SOLIDUS (/)


const name = 'Comment';
const structure = {
    value: String
};

function parse() {
    const start = this.tokenStart;
    let end = this.tokenEnd;

    this.eat(types.Comment);

    if ((end - start + 2) >= 2 &&
        this.charCodeAt(end - 2) === ASTERISK &&
        this.charCodeAt(end - 1) === SOLIDUS) {
        end -= 2;
    }

    return {
        type: 'Comment',
        loc: this.getLocation(start, this.tokenStart),
        value: this.substring(start + 2, end)
    };
}

function generate(node) {
    this.token(types.Comment, '/*' + node.value + '*/');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],56:[function(require,module,exports){
'use strict';

const names = require('../../utils/names.cjs');
const types = require('../../tokenizer/types.cjs');

const EXCLAMATIONMARK = 0x0021; // U+0021 EXCLAMATION MARK (!)
const NUMBERSIGN = 0x0023;      // U+0023 NUMBER SIGN (#)
const DOLLARSIGN = 0x0024;      // U+0024 DOLLAR SIGN ($)
const AMPERSAND = 0x0026;       // U+0026 AMPERSAND (&)
const ASTERISK = 0x002A;        // U+002A ASTERISK (*)
const PLUSSIGN = 0x002B;        // U+002B PLUS SIGN (+)
const SOLIDUS = 0x002F;         // U+002F SOLIDUS (/)

function consumeValueRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilExclamationMarkOrSemicolon, true);
}

function consumeCustomPropertyRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilExclamationMarkOrSemicolon, false);
}

function consumeValue() {
    const startValueToken = this.tokenIndex;
    const value = this.Value();

    if (value.type !== 'Raw' &&
        this.eof === false &&
        this.tokenType !== types.Semicolon &&
        this.isDelim(EXCLAMATIONMARK) === false &&
        this.isBalanceEdge(startValueToken) === false) {
        this.error();
    }

    return value;
}

const name = 'Declaration';
const walkContext = 'declaration';
const structure = {
    important: [Boolean, String],
    property: String,
    value: ['Value', 'Raw']
};

function parse() {
    const start = this.tokenStart;
    const startToken = this.tokenIndex;
    const property = readProperty.call(this);
    const customProperty = names.isCustomProperty(property);
    const parseValue = customProperty ? this.parseCustomProperty : this.parseValue;
    const consumeRaw = customProperty ? consumeCustomPropertyRaw : consumeValueRaw;
    let important = false;
    let value;

    this.skipSC();
    this.eat(types.Colon);

    const valueStart = this.tokenIndex;

    if (!customProperty) {
        this.skipSC();
    }

    if (parseValue) {
        value = this.parseWithFallback(consumeValue, consumeRaw);
    } else {
        value = consumeRaw.call(this, this.tokenIndex);
    }

    if (customProperty && value.type === 'Value' && value.children.isEmpty) {
        for (let offset = valueStart - this.tokenIndex; offset <= 0; offset++) {
            if (this.lookupType(offset) === types.WhiteSpace) {
                value.children.appendData({
                    type: 'WhiteSpace',
                    loc: null,
                    value: ' '
                });
                break;
            }
        }
    }

    if (this.isDelim(EXCLAMATIONMARK)) {
        important = getImportant.call(this);
        this.skipSC();
    }

    // Do not include semicolon to range per spec
    // https://drafts.csswg.org/css-syntax/#declaration-diagram

    if (this.eof === false &&
        this.tokenType !== types.Semicolon &&
        this.isBalanceEdge(startToken) === false) {
        this.error();
    }

    return {
        type: 'Declaration',
        loc: this.getLocation(start, this.tokenStart),
        important,
        property,
        value
    };
}

function generate(node) {
    this.token(types.Ident, node.property);
    this.token(types.Colon, ':');
    this.node(node.value);

    if (node.important) {
        this.token(types.Delim, '!');
        this.token(types.Ident, node.important === true ? 'important' : node.important);
    }
}

function readProperty() {
    const start = this.tokenStart;

    // hacks
    if (this.tokenType === types.Delim) {
        switch (this.charCodeAt(this.tokenStart)) {
            case ASTERISK:
            case DOLLARSIGN:
            case PLUSSIGN:
            case NUMBERSIGN:
            case AMPERSAND:
                this.next();
                break;

            // TODO: not sure we should support this hack
            case SOLIDUS:
                this.next();
                if (this.isDelim(SOLIDUS)) {
                    this.next();
                }
                break;
        }
    }

    if (this.tokenType === types.Hash) {
        this.eat(types.Hash);
    } else {
        this.eat(types.Ident);
    }

    return this.substrToCursor(start);
}

// ! ws* important
function getImportant() {
    this.eat(types.Delim);
    this.skipSC();

    const important = this.consume(types.Ident);

    // store original value in case it differ from `important`
    // for better original source restoring and hacks like `!ie` support
    return important === 'important' ? true : important;
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100,"../../utils/names.cjs":106}],57:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const AMPERSAND = 0x0026;       // U+0026 AMPERSAND (&)

function consumeRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilSemicolonIncluded, true);
}

const name = 'DeclarationList';
const structure = {
    children: [[
        'Declaration',
        'Atrule',
        'Rule'
    ]]
};

function parse() {
    const children = this.createList();

    while (!this.eof) {
        switch (this.tokenType) {
            case types.WhiteSpace:
            case types.Comment:
            case types.Semicolon:
                this.next();
                break;

            case types.AtKeyword:
                children.push(this.parseWithFallback(this.Atrule.bind(this, true), consumeRaw));
                break;

            default:
                if (this.isDelim(AMPERSAND))  {
                    children.push(this.parseWithFallback(this.Rule, consumeRaw));
                } else {
                    children.push(this.parseWithFallback(this.Declaration, consumeRaw));
                }
        }
    }

    return {
        type: 'DeclarationList',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node, prev => {
        if (prev.type === 'Declaration') {
            this.token(types.Semicolon, ';');
        }
    });
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],58:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Dimension';
const structure = {
    value: String,
    unit: String
};

function parse() {
    const start = this.tokenStart;
    const value = this.consumeNumber(types.Dimension);

    return {
        type: 'Dimension',
        loc: this.getLocation(start, this.tokenStart),
        value,
        unit: this.substring(start + value.length, this.tokenStart)
    };
}

function generate(node) {
    this.token(types.Dimension, node.value + node.unit);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],59:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Function';
const walkContext = 'function';
const structure = {
    name: String,
    children: [[]]
};

// <function-token> <sequence> )
function parse(readSequence, recognizer) {
    const start = this.tokenStart;
    const name = this.consumeFunctionName();
    const nameLowerCase = name.toLowerCase();
    let children;

    children = recognizer.hasOwnProperty(nameLowerCase)
        ? recognizer[nameLowerCase].call(this, recognizer)
        : readSequence.call(this, recognizer);

    if (!this.eof) {
        this.eat(types.RightParenthesis);
    }

    return {
        type: 'Function',
        loc: this.getLocation(start, this.tokenStart),
        name,
        children
    };
}

function generate(node) {
    this.token(types.Function, node.name + '(');
    this.children(node);
    this.token(types.RightParenthesis, ')');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],60:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

// '#' ident
const xxx = 'XXX';
const name = 'Hash';
const structure = {
    value: String
};
function parse() {
    const start = this.tokenStart;

    this.eat(types.Hash);

    return {
        type: 'Hash',
        loc: this.getLocation(start, this.tokenStart),
        value: this.substrToCursor(start + 1)
    };
}
function generate(node) {
    this.token(types.Hash, '#' + node.value);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.xxx = xxx;

},{"../../tokenizer/types.cjs":100}],61:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'IdSelector';
const structure = {
    name: String
};

function parse() {
    const start = this.tokenStart;

    // TODO: check value is an ident
    this.eat(types.Hash);

    return {
        type: 'IdSelector',
        loc: this.getLocation(start, this.tokenStart),
        name: this.substrToCursor(start + 1)
    };
}

function generate(node) {
    // Using Delim instead of Hash is a hack to avoid for a whitespace between ident and id-selector
    // in safe mode (e.g. "a#id"), because IE11 doesn't allow a sequence <ident-token> <hash-token>
    // without a whitespace in values (e.g. "1px solid#000")
    this.token(types.Delim, '#' + node.name);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],62:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Identifier';
const structure = {
    name: String
};

function parse() {
    return {
        type: 'Identifier',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        name: this.consume(types.Ident)
    };
}

function generate(node) {
    this.token(types.Ident, node.name);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],63:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'MediaFeature';
const structure = {
    name: String,
    value: ['Identifier', 'Number', 'Dimension', 'Ratio', null]
};

function parse() {
    const start = this.tokenStart;
    let name;
    let value = null;

    this.eat(types.LeftParenthesis);
    this.skipSC();

    name = this.consume(types.Ident);
    this.skipSC();

    if (this.tokenType !== types.RightParenthesis) {
        this.eat(types.Colon);
        this.skipSC();

        switch (this.tokenType) {
            case types.Number:
                if (this.lookupNonWSType(1) === types.Delim) {
                    value = this.Ratio();
                } else {
                    value = this.Number();
                }

                break;

            case types.Dimension:
                value = this.Dimension();
                break;

            case types.Ident:
                value = this.Identifier();
                break;

            default:
                this.error('Number, dimension, ratio or identifier is expected');
        }

        this.skipSC();
    }

    this.eat(types.RightParenthesis);

    return {
        type: 'MediaFeature',
        loc: this.getLocation(start, this.tokenStart),
        name,
        value
    };
}

function generate(node) {
    this.token(types.LeftParenthesis, '(');
    this.token(types.Ident, node.name);

    if (node.value !== null) {
        this.token(types.Colon, ':');
        this.node(node.value);
    }

    this.token(types.RightParenthesis, ')');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],64:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'MediaQuery';
const structure = {
    children: [[
        'Identifier',
        'MediaFeature',
        'WhiteSpace'
    ]]
};

function parse() {
    const children = this.createList();
    let child = null;

    this.skipSC();

    scan:
    while (!this.eof) {
        switch (this.tokenType) {
            case types.Comment:
            case types.WhiteSpace:
                this.next();
                continue;

            case types.Ident:
                child = this.Identifier();
                break;

            case types.LeftParenthesis:
                child = this.MediaFeature();
                break;

            default:
                break scan;
        }

        children.push(child);
    }

    if (child === null) {
        this.error('Identifier or parenthesis is expected');
    }

    return {
        type: 'MediaQuery',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],65:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'MediaQueryList';
const structure = {
    children: [[
        'MediaQuery'
    ]]
};

function parse() {
    const children = this.createList();

    this.skipSC();

    while (!this.eof) {
        children.push(this.MediaQuery());

        if (this.tokenType !== types.Comma) {
            break;
        }

        this.next();
    }

    return {
        type: 'MediaQueryList',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node, () => this.token(types.Comma, ','));
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],66:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const AMPERSAND = 0x0026;       // U+0026 AMPERSAND (&)

const name = 'NestingSelector';
const structure = {
};

function parse() {
    const start = this.tokenStart;

    this.eatDelim(AMPERSAND);

    return {
        type: 'NestingSelector',
        loc: this.getLocation(start, this.tokenStart)
    };
}

function generate() {
    this.token(types.Delim, '&');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],67:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Nth';
const structure = {
    nth: ['AnPlusB', 'Identifier'],
    selector: ['SelectorList', null]
};

function parse() {
    this.skipSC();

    const start = this.tokenStart;
    let end = start;
    let selector = null;
    let nth;

    if (this.lookupValue(0, 'odd') || this.lookupValue(0, 'even')) {
        nth = this.Identifier();
    } else {
        nth = this.AnPlusB();
    }

    end = this.tokenStart;
    this.skipSC();

    if (this.lookupValue(0, 'of')) {
        this.next();

        selector = this.SelectorList();
        end = this.tokenStart;
    }

    return {
        type: 'Nth',
        loc: this.getLocation(start, end),
        nth,
        selector
    };
}

function generate(node) {
    this.node(node.nth);
    if (node.selector !== null) {
        this.token(types.Ident, 'of');
        this.node(node.selector);
    }
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],68:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Number';
const structure = {
    value: String
};

function parse() {
    return {
        type: 'Number',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        value: this.consume(types.Number)
    };
}

function generate(node) {
    this.token(types.Number, node.value);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],69:[function(require,module,exports){
'use strict';

// '/' | '*' | ',' | ':' | '+' | '-'
const name = 'Operator';
const structure = {
    value: String
};

function parse() {
    const start = this.tokenStart;

    this.next();

    return {
        type: 'Operator',
        loc: this.getLocation(start, this.tokenStart),
        value: this.substrToCursor(start)
    };
}

function generate(node) {
    this.tokenize(node.value);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{}],70:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Parentheses';
const structure = {
    children: [[]]
};

function parse(readSequence, recognizer) {
    const start = this.tokenStart;
    let children = null;

    this.eat(types.LeftParenthesis);

    children = readSequence.call(this, recognizer);

    if (!this.eof) {
        this.eat(types.RightParenthesis);
    }

    return {
        type: 'Parentheses',
        loc: this.getLocation(start, this.tokenStart),
        children
    };
}

function generate(node) {
    this.token(types.LeftParenthesis, '(');
    this.children(node);
    this.token(types.RightParenthesis, ')');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],71:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Percentage';
const structure = {
    value: String
};

function parse() {
    return {
        type: 'Percentage',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        value: this.consumeNumber(types.Percentage)
    };
}

function generate(node) {
    this.token(types.Percentage, node.value + '%');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],72:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'PseudoClassSelector';
const walkContext = 'function';
const structure = {
    name: String,
    children: [['Raw'], null]
};

// : [ <ident> | <function-token> <any-value>? ) ]
function parse() {
    const start = this.tokenStart;
    let children = null;
    let name;
    let nameLowerCase;

    this.eat(types.Colon);

    if (this.tokenType === types.Function) {
        name = this.consumeFunctionName();
        nameLowerCase = name.toLowerCase();

        if (hasOwnProperty.call(this.pseudo, nameLowerCase)) {
            this.skipSC();
            children = this.pseudo[nameLowerCase].call(this);
            this.skipSC();
        } else {
            children = this.createList();
            children.push(
                this.Raw(this.tokenIndex, null, false)
            );
        }

        this.eat(types.RightParenthesis);
    } else {
        name = this.consume(types.Ident);
    }

    return {
        type: 'PseudoClassSelector',
        loc: this.getLocation(start, this.tokenStart),
        name,
        children
    };
}

function generate(node) {
    this.token(types.Colon, ':');

    if (node.children === null) {
        this.token(types.Ident, node.name);
    } else {
        this.token(types.Function, node.name + '(');
        this.children(node);
        this.token(types.RightParenthesis, ')');
    }
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],73:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'PseudoElementSelector';
const walkContext = 'function';
const structure = {
    name: String,
    children: [['Raw'], null]
};

// :: [ <ident> | <function-token> <any-value>? ) ]
function parse() {
    const start = this.tokenStart;
    let children = null;
    let name;
    let nameLowerCase;

    this.eat(types.Colon);
    this.eat(types.Colon);

    if (this.tokenType === types.Function) {
        name = this.consumeFunctionName();
        nameLowerCase = name.toLowerCase();

        if (hasOwnProperty.call(this.pseudo, nameLowerCase)) {
            this.skipSC();
            children = this.pseudo[nameLowerCase].call(this);
            this.skipSC();
        } else {
            children = this.createList();
            children.push(
                this.Raw(this.tokenIndex, null, false)
            );
        }

        this.eat(types.RightParenthesis);
    } else {
        name = this.consume(types.Ident);
    }

    return {
        type: 'PseudoElementSelector',
        loc: this.getLocation(start, this.tokenStart),
        name,
        children
    };
}

function generate(node) {
    this.token(types.Colon, ':');
    this.token(types.Colon, ':');

    if (node.children === null) {
        this.token(types.Ident, node.name);
    } else {
        this.token(types.Function, node.name + '(');
        this.children(node);
        this.token(types.RightParenthesis, ')');
    }
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],74:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');
const charCodeDefinitions = require('../../tokenizer/char-code-definitions.cjs');

const SOLIDUS = 0x002F;  // U+002F SOLIDUS (/)
const FULLSTOP = 0x002E; // U+002E FULL STOP (.)

// Terms of <ratio> should be a positive numbers (not zero or negative)
// (see https://drafts.csswg.org/mediaqueries-3/#values)
// However, -o-min-device-pixel-ratio takes fractional values as a ratio's term
// and this is using by various sites. Therefore we relax checking on parse
// to test a term is unsigned number without an exponent part.
// Additional checking may be applied on lexer validation.
function consumeNumber() {
    this.skipSC();

    const value = this.consume(types.Number);

    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (!charCodeDefinitions.isDigit(code) && code !== FULLSTOP) {
            this.error('Unsigned number is expected', this.tokenStart - value.length + i);
        }
    }

    if (Number(value) === 0) {
        this.error('Zero number is not allowed', this.tokenStart - value.length);
    }

    return value;
}

const name = 'Ratio';
const structure = {
    left: String,
    right: String
};

// <positive-integer> S* '/' S* <positive-integer>
function parse() {
    const start = this.tokenStart;
    const left = consumeNumber.call(this);
    let right;

    this.skipSC();
    this.eatDelim(SOLIDUS);
    right = consumeNumber.call(this);

    return {
        type: 'Ratio',
        loc: this.getLocation(start, this.tokenStart),
        left,
        right
    };
}

function generate(node) {
    this.token(types.Number, node.left);
    this.token(types.Delim, '/');
    this.token(types.Number, node.right);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/char-code-definitions.cjs":97,"../../tokenizer/types.cjs":100}],75:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

function getOffsetExcludeWS() {
    if (this.tokenIndex > 0) {
        if (this.lookupType(-1) === types.WhiteSpace) {
            return this.tokenIndex > 1
                ? this.getTokenStart(this.tokenIndex - 1)
                : this.firstCharOffset;
        }
    }

    return this.tokenStart;
}

const name = 'Raw';
const structure = {
    value: String
};

function parse(startToken, consumeUntil, excludeWhiteSpace) {
    const startOffset = this.getTokenStart(startToken);
    let endOffset;

    this.skipUntilBalanced(startToken, consumeUntil || this.consumeUntilBalanceEnd);

    if (excludeWhiteSpace && this.tokenStart > startOffset) {
        endOffset = getOffsetExcludeWS.call(this);
    } else {
        endOffset = this.tokenStart;
    }

    return {
        type: 'Raw',
        loc: this.getLocation(startOffset, endOffset),
        value: this.substring(startOffset, endOffset)
    };
}

function generate(node) {
    this.tokenize(node.value);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],76:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

function consumeRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilLeftCurlyBracket, true);
}

function consumePrelude() {
    const prelude = this.SelectorList();

    if (prelude.type !== 'Raw' &&
        this.eof === false &&
        this.tokenType !== types.LeftCurlyBracket) {
        this.error();
    }

    return prelude;
}

const name = 'Rule';
const walkContext = 'rule';
const structure = {
    prelude: ['SelectorList', 'Raw'],
    block: ['Block']
};

function parse() {
    const startToken = this.tokenIndex;
    const startOffset = this.tokenStart;
    let prelude;
    let block;

    if (this.parseRulePrelude) {
        prelude = this.parseWithFallback(consumePrelude, consumeRaw);
    } else {
        prelude = consumeRaw.call(this, startToken);
    }

    block = this.Block(true);

    return {
        type: 'Rule',
        loc: this.getLocation(startOffset, this.tokenStart),
        prelude,
        block
    };
}
function generate(node) {
    this.node(node.prelude);
    this.node(node.block);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],77:[function(require,module,exports){
'use strict';

const name = 'Selector';
const structure = {
    children: [[
        'TypeSelector',
        'IdSelector',
        'ClassSelector',
        'AttributeSelector',
        'PseudoClassSelector',
        'PseudoElementSelector',
        'Combinator',
        'WhiteSpace'
    ]]
};

function parse() {
    const children = this.readSequence(this.scope.Selector);

    // nothing were consumed
    if (this.getFirstListNode(children) === null) {
        this.error('Selector is expected');
    }

    return {
        type: 'Selector',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{}],78:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'SelectorList';
const walkContext = 'selector';
const structure = {
    children: [[
        'Selector',
        'Raw'
    ]]
};

function parse() {
    const children = this.createList();

    while (!this.eof) {
        children.push(this.Selector());

        if (this.tokenType === types.Comma) {
            this.next();
            continue;
        }

        break;
    }

    return {
        type: 'SelectorList',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node, () => this.token(types.Comma, ','));
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],79:[function(require,module,exports){
'use strict';

const string = require('../../utils/string.cjs');
const types = require('../../tokenizer/types.cjs');

const name = 'String';
const structure = {
    value: String
};

function parse() {
    return {
        type: 'String',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        value: string.decode(this.consume(types.String))
    };
}

function generate(node) {
    this.token(types.String, string.encode(node.value));
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100,"../../utils/string.cjs":107}],80:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const EXCLAMATIONMARK = 0x0021; // U+0021 EXCLAMATION MARK (!)

function consumeRaw(startToken) {
    return this.Raw(startToken, null, false);
}

const name = 'StyleSheet';
const walkContext = 'stylesheet';
const structure = {
    children: [[
        'Comment',
        'CDO',
        'CDC',
        'Atrule',
        'Rule',
        'Raw'
    ]]
};

function parse() {
    const start = this.tokenStart;
    const children = this.createList();
    let child;

    while (!this.eof) {
        switch (this.tokenType) {
            case types.WhiteSpace:
                this.next();
                continue;

            case types.Comment:
                // ignore comments except exclamation comments (i.e. /*! .. */) on top level
                if (this.charCodeAt(this.tokenStart + 2) !== EXCLAMATIONMARK) {
                    this.next();
                    continue;
                }

                child = this.Comment();
                break;

            case types.CDO: // <!--
                child = this.CDO();
                break;

            case types.CDC: // -->
                child = this.CDC();
                break;

            // CSS Syntax Module Level 3
            // §2.2 Error handling
            // At the "top level" of a stylesheet, an <at-keyword-token> starts an at-rule.
            case types.AtKeyword:
                child = this.parseWithFallback(this.Atrule, consumeRaw);
                break;

            // Anything else starts a qualified rule ...
            default:
                child = this.parseWithFallback(this.Rule, consumeRaw);
        }

        children.push(child);
    }

    return {
        type: 'StyleSheet',
        loc: this.getLocation(start, this.tokenStart),
        children
    };
}

function generate(node) {
    this.children(node);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
exports.walkContext = walkContext;

},{"../../tokenizer/types.cjs":100}],81:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const ASTERISK = 0x002A;     // U+002A ASTERISK (*)
const VERTICALLINE = 0x007C; // U+007C VERTICAL LINE (|)

function eatIdentifierOrAsterisk() {
    if (this.tokenType !== types.Ident &&
        this.isDelim(ASTERISK) === false) {
        this.error('Identifier or asterisk is expected');
    }

    this.next();
}

const name = 'TypeSelector';
const structure = {
    name: String
};

// ident
// ident|ident
// ident|*
// *
// *|ident
// *|*
// |ident
// |*
function parse() {
    const start = this.tokenStart;

    if (this.isDelim(VERTICALLINE)) {
        this.next();
        eatIdentifierOrAsterisk.call(this);
    } else {
        eatIdentifierOrAsterisk.call(this);

        if (this.isDelim(VERTICALLINE)) {
            this.next();
            eatIdentifierOrAsterisk.call(this);
        }
    }

    return {
        type: 'TypeSelector',
        loc: this.getLocation(start, this.tokenStart),
        name: this.substrToCursor(start)
    };
}

function generate(node) {
    this.tokenize(node.name);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],82:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');
const charCodeDefinitions = require('../../tokenizer/char-code-definitions.cjs');

const PLUSSIGN = 0x002B;     // U+002B PLUS SIGN (+)
const HYPHENMINUS = 0x002D;  // U+002D HYPHEN-MINUS (-)
const QUESTIONMARK = 0x003F; // U+003F QUESTION MARK (?)

function eatHexSequence(offset, allowDash) {
    let len = 0;

    for (let pos = this.tokenStart + offset; pos < this.tokenEnd; pos++) {
        const code = this.charCodeAt(pos);

        if (code === HYPHENMINUS && allowDash && len !== 0) {
            eatHexSequence.call(this, offset + len + 1, false);
            return -1;
        }

        if (!charCodeDefinitions.isHexDigit(code)) {
            this.error(
                allowDash && len !== 0
                    ? 'Hyphen minus' + (len < 6 ? ' or hex digit' : '') + ' is expected'
                    : (len < 6 ? 'Hex digit is expected' : 'Unexpected input'),
                pos
            );
        }

        if (++len > 6) {
            this.error('Too many hex digits', pos);
        }    }

    this.next();
    return len;
}

function eatQuestionMarkSequence(max) {
    let count = 0;

    while (this.isDelim(QUESTIONMARK)) {
        if (++count > max) {
            this.error('Too many question marks');
        }

        this.next();
    }
}

function startsWith(code) {
    if (this.charCodeAt(this.tokenStart) !== code) {
        this.error((code === PLUSSIGN ? 'Plus sign' : 'Hyphen minus') + ' is expected');
    }
}

// https://drafts.csswg.org/css-syntax/#urange
// Informally, the <urange> production has three forms:
// U+0001
//      Defines a range consisting of a single code point, in this case the code point "1".
// U+0001-00ff
//      Defines a range of codepoints between the first and the second value, in this case
//      the range between "1" and "ff" (255 in decimal) inclusive.
// U+00??
//      Defines a range of codepoints where the "?" characters range over all hex digits,
//      in this case defining the same as the value U+0000-00ff.
// In each form, a maximum of 6 digits is allowed for each hexadecimal number (if you treat "?" as a hexadecimal digit).
//
// <urange> =
//   u '+' <ident-token> '?'* |
//   u <dimension-token> '?'* |
//   u <number-token> '?'* |
//   u <number-token> <dimension-token> |
//   u <number-token> <number-token> |
//   u '+' '?'+
function scanUnicodeRange() {
    let hexLength = 0;

    switch (this.tokenType) {
        case types.Number:
            // u <number-token> '?'*
            // u <number-token> <dimension-token>
            // u <number-token> <number-token>
            hexLength = eatHexSequence.call(this, 1, true);

            if (this.isDelim(QUESTIONMARK)) {
                eatQuestionMarkSequence.call(this, 6 - hexLength);
                break;
            }

            if (this.tokenType === types.Dimension ||
                this.tokenType === types.Number) {
                startsWith.call(this, HYPHENMINUS);
                eatHexSequence.call(this, 1, false);
                break;
            }

            break;

        case types.Dimension:
            // u <dimension-token> '?'*
            hexLength = eatHexSequence.call(this, 1, true);

            if (hexLength > 0) {
                eatQuestionMarkSequence.call(this, 6 - hexLength);
            }

            break;

        default:
            // u '+' <ident-token> '?'*
            // u '+' '?'+
            this.eatDelim(PLUSSIGN);

            if (this.tokenType === types.Ident) {
                hexLength = eatHexSequence.call(this, 0, true);
                if (hexLength > 0) {
                    eatQuestionMarkSequence.call(this, 6 - hexLength);
                }
                break;
            }

            if (this.isDelim(QUESTIONMARK)) {
                this.next();
                eatQuestionMarkSequence.call(this, 5);
                break;
            }

            this.error('Hex digit or question mark is expected');
    }
}

const name = 'UnicodeRange';
const structure = {
    value: String
};

function parse() {
    const start = this.tokenStart;

    // U or u
    this.eatIdent('u');
    scanUnicodeRange.call(this);

    return {
        type: 'UnicodeRange',
        loc: this.getLocation(start, this.tokenStart),
        value: this.substrToCursor(start)
    };
}

function generate(node) {
    this.tokenize(node.value);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/char-code-definitions.cjs":97,"../../tokenizer/types.cjs":100}],83:[function(require,module,exports){
'use strict';

const url = require('../../utils/url.cjs');
const string = require('../../utils/string.cjs');
const types = require('../../tokenizer/types.cjs');

const name = 'Url';
const structure = {
    value: String
};

// <url-token> | <function-token> <string> )
function parse() {
    const start = this.tokenStart;
    let value;

    switch (this.tokenType) {
        case types.Url:
            value = url.decode(this.consume(types.Url));
            break;

        case types.Function:
            if (!this.cmpStr(this.tokenStart, this.tokenEnd, 'url(')) {
                this.error('Function name must be `url`');
            }

            this.eat(types.Function);
            this.skipSC();
            value = string.decode(this.consume(types.String));
            this.skipSC();
            if (!this.eof) {
                this.eat(types.RightParenthesis);
            }
            break;

        default:
            this.error('Url or Function is expected');
    }

    return {
        type: 'Url',
        loc: this.getLocation(start, this.tokenStart),
        value
    };
}

function generate(node) {
    this.token(types.Url, url.encode(node.value));
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100,"../../utils/string.cjs":107,"../../utils/url.cjs":108}],84:[function(require,module,exports){
'use strict';

const name = 'Value';
const structure = {
    children: [[]]
};

function parse() {
    const start = this.tokenStart;
    const children = this.readSequence(this.scope.Value);

    return {
        type: 'Value',
        loc: this.getLocation(start, this.tokenStart),
        children
    };
}

function generate(node) {
    this.children(node);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{}],85:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const SPACE = Object.freeze({
    type: 'WhiteSpace',
    loc: null,
    value: ' '
});

const name = 'WhiteSpace';
const structure = {
    value: String
};

function parse() {
    this.eat(types.WhiteSpace);
    return SPACE;

    // return {
    //     type: 'WhiteSpace',
    //     loc: this.getLocation(this.tokenStart, this.tokenEnd),
    //     value: this.consume(WHITESPACE)
    // };
}

function generate(node) {
    this.token(types.WhiteSpace, node.value);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;

},{"../../tokenizer/types.cjs":100}],86:[function(require,module,exports){
'use strict';

const AnPlusB = require('./AnPlusB.cjs');
const Atrule = require('./Atrule.cjs');
const AtrulePrelude = require('./AtrulePrelude.cjs');
const AttributeSelector = require('./AttributeSelector.cjs');
const Block = require('./Block.cjs');
const Brackets = require('./Brackets.cjs');
const CDC = require('./CDC.cjs');
const CDO = require('./CDO.cjs');
const ClassSelector = require('./ClassSelector.cjs');
const Combinator = require('./Combinator.cjs');
const Comment = require('./Comment.cjs');
const Declaration = require('./Declaration.cjs');
const DeclarationList = require('./DeclarationList.cjs');
const Dimension = require('./Dimension.cjs');
const Function = require('./Function.cjs');
const Hash = require('./Hash.cjs');
const Identifier = require('./Identifier.cjs');
const IdSelector = require('./IdSelector.cjs');
const MediaFeature = require('./MediaFeature.cjs');
const MediaQuery = require('./MediaQuery.cjs');
const MediaQueryList = require('./MediaQueryList.cjs');
const NestingSelector = require('./NestingSelector.cjs');
const Nth = require('./Nth.cjs');
const Number = require('./Number.cjs');
const Operator = require('./Operator.cjs');
const Parentheses = require('./Parentheses.cjs');
const Percentage = require('./Percentage.cjs');
const PseudoClassSelector = require('./PseudoClassSelector.cjs');
const PseudoElementSelector = require('./PseudoElementSelector.cjs');
const Ratio = require('./Ratio.cjs');
const Raw = require('./Raw.cjs');
const Rule = require('./Rule.cjs');
const Selector = require('./Selector.cjs');
const SelectorList = require('./SelectorList.cjs');
const String = require('./String.cjs');
const StyleSheet = require('./StyleSheet.cjs');
const TypeSelector = require('./TypeSelector.cjs');
const UnicodeRange = require('./UnicodeRange.cjs');
const Url = require('./Url.cjs');
const Value = require('./Value.cjs');
const WhiteSpace = require('./WhiteSpace.cjs');



exports.AnPlusB = AnPlusB.parse;
exports.Atrule = Atrule.parse;
exports.AtrulePrelude = AtrulePrelude.parse;
exports.AttributeSelector = AttributeSelector.parse;
exports.Block = Block.parse;
exports.Brackets = Brackets.parse;
exports.CDC = CDC.parse;
exports.CDO = CDO.parse;
exports.ClassSelector = ClassSelector.parse;
exports.Combinator = Combinator.parse;
exports.Comment = Comment.parse;
exports.Declaration = Declaration.parse;
exports.DeclarationList = DeclarationList.parse;
exports.Dimension = Dimension.parse;
exports.Function = Function.parse;
exports.Hash = Hash.parse;
exports.Identifier = Identifier.parse;
exports.IdSelector = IdSelector.parse;
exports.MediaFeature = MediaFeature.parse;
exports.MediaQuery = MediaQuery.parse;
exports.MediaQueryList = MediaQueryList.parse;
exports.NestingSelector = NestingSelector.parse;
exports.Nth = Nth.parse;
exports.Number = Number.parse;
exports.Operator = Operator.parse;
exports.Parentheses = Parentheses.parse;
exports.Percentage = Percentage.parse;
exports.PseudoClassSelector = PseudoClassSelector.parse;
exports.PseudoElementSelector = PseudoElementSelector.parse;
exports.Ratio = Ratio.parse;
exports.Raw = Raw.parse;
exports.Rule = Rule.parse;
exports.Selector = Selector.parse;
exports.SelectorList = SelectorList.parse;
exports.String = String.parse;
exports.StyleSheet = StyleSheet.parse;
exports.TypeSelector = TypeSelector.parse;
exports.UnicodeRange = UnicodeRange.parse;
exports.Url = Url.parse;
exports.Value = Value.parse;
exports.WhiteSpace = WhiteSpace.parse;

},{"./AnPlusB.cjs":45,"./Atrule.cjs":46,"./AtrulePrelude.cjs":47,"./AttributeSelector.cjs":48,"./Block.cjs":49,"./Brackets.cjs":50,"./CDC.cjs":51,"./CDO.cjs":52,"./ClassSelector.cjs":53,"./Combinator.cjs":54,"./Comment.cjs":55,"./Declaration.cjs":56,"./DeclarationList.cjs":57,"./Dimension.cjs":58,"./Function.cjs":59,"./Hash.cjs":60,"./IdSelector.cjs":61,"./Identifier.cjs":62,"./MediaFeature.cjs":63,"./MediaQuery.cjs":64,"./MediaQueryList.cjs":65,"./NestingSelector.cjs":66,"./Nth.cjs":67,"./Number.cjs":68,"./Operator.cjs":69,"./Parentheses.cjs":70,"./Percentage.cjs":71,"./PseudoClassSelector.cjs":72,"./PseudoElementSelector.cjs":73,"./Ratio.cjs":74,"./Raw.cjs":75,"./Rule.cjs":76,"./Selector.cjs":77,"./SelectorList.cjs":78,"./String.cjs":79,"./StyleSheet.cjs":80,"./TypeSelector.cjs":81,"./UnicodeRange.cjs":82,"./Url.cjs":83,"./Value.cjs":84,"./WhiteSpace.cjs":85}],87:[function(require,module,exports){
'use strict';

const AnPlusB = require('./AnPlusB.cjs');
const Atrule = require('./Atrule.cjs');
const AtrulePrelude = require('./AtrulePrelude.cjs');
const AttributeSelector = require('./AttributeSelector.cjs');
const Block = require('./Block.cjs');
const Brackets = require('./Brackets.cjs');
const CDC = require('./CDC.cjs');
const CDO = require('./CDO.cjs');
const ClassSelector = require('./ClassSelector.cjs');
const Combinator = require('./Combinator.cjs');
const Comment = require('./Comment.cjs');
const Declaration = require('./Declaration.cjs');
const DeclarationList = require('./DeclarationList.cjs');
const Dimension = require('./Dimension.cjs');
const Function = require('./Function.cjs');
const Hash = require('./Hash.cjs');
const Identifier = require('./Identifier.cjs');
const IdSelector = require('./IdSelector.cjs');
const MediaFeature = require('./MediaFeature.cjs');
const MediaQuery = require('./MediaQuery.cjs');
const MediaQueryList = require('./MediaQueryList.cjs');
const NestingSelector = require('./NestingSelector.cjs');
const Nth = require('./Nth.cjs');
const Number$1 = require('./Number.cjs');
const Operator = require('./Operator.cjs');
const Parentheses = require('./Parentheses.cjs');
const Percentage = require('./Percentage.cjs');
const PseudoClassSelector = require('./PseudoClassSelector.cjs');
const PseudoElementSelector = require('./PseudoElementSelector.cjs');
const Ratio = require('./Ratio.cjs');
const Raw = require('./Raw.cjs');
const Rule = require('./Rule.cjs');
const Selector = require('./Selector.cjs');
const SelectorList = require('./SelectorList.cjs');
const String$1 = require('./String.cjs');
const StyleSheet = require('./StyleSheet.cjs');
const TypeSelector = require('./TypeSelector.cjs');
const UnicodeRange = require('./UnicodeRange.cjs');
const Url = require('./Url.cjs');
const Value = require('./Value.cjs');
const WhiteSpace = require('./WhiteSpace.cjs');



exports.AnPlusB = AnPlusB;
exports.Atrule = Atrule;
exports.AtrulePrelude = AtrulePrelude;
exports.AttributeSelector = AttributeSelector;
exports.Block = Block;
exports.Brackets = Brackets;
exports.CDC = CDC;
exports.CDO = CDO;
exports.ClassSelector = ClassSelector;
exports.Combinator = Combinator;
exports.Comment = Comment;
exports.Declaration = Declaration;
exports.DeclarationList = DeclarationList;
exports.Dimension = Dimension;
exports.Function = Function;
exports.Hash = Hash;
exports.Identifier = Identifier;
exports.IdSelector = IdSelector;
exports.MediaFeature = MediaFeature;
exports.MediaQuery = MediaQuery;
exports.MediaQueryList = MediaQueryList;
exports.NestingSelector = NestingSelector;
exports.Nth = Nth;
exports.Number = Number$1;
exports.Operator = Operator;
exports.Parentheses = Parentheses;
exports.Percentage = Percentage;
exports.PseudoClassSelector = PseudoClassSelector;
exports.PseudoElementSelector = PseudoElementSelector;
exports.Ratio = Ratio;
exports.Raw = Raw;
exports.Rule = Rule;
exports.Selector = Selector;
exports.SelectorList = SelectorList;
exports.String = String$1;
exports.StyleSheet = StyleSheet;
exports.TypeSelector = TypeSelector;
exports.UnicodeRange = UnicodeRange;
exports.Url = Url;
exports.Value = Value;
exports.WhiteSpace = WhiteSpace;

},{"./AnPlusB.cjs":45,"./Atrule.cjs":46,"./AtrulePrelude.cjs":47,"./AttributeSelector.cjs":48,"./Block.cjs":49,"./Brackets.cjs":50,"./CDC.cjs":51,"./CDO.cjs":52,"./ClassSelector.cjs":53,"./Combinator.cjs":54,"./Comment.cjs":55,"./Declaration.cjs":56,"./DeclarationList.cjs":57,"./Dimension.cjs":58,"./Function.cjs":59,"./Hash.cjs":60,"./IdSelector.cjs":61,"./Identifier.cjs":62,"./MediaFeature.cjs":63,"./MediaQuery.cjs":64,"./MediaQueryList.cjs":65,"./NestingSelector.cjs":66,"./Nth.cjs":67,"./Number.cjs":68,"./Operator.cjs":69,"./Parentheses.cjs":70,"./Percentage.cjs":71,"./PseudoClassSelector.cjs":72,"./PseudoElementSelector.cjs":73,"./Ratio.cjs":74,"./Raw.cjs":75,"./Rule.cjs":76,"./Selector.cjs":77,"./SelectorList.cjs":78,"./String.cjs":79,"./StyleSheet.cjs":80,"./TypeSelector.cjs":81,"./UnicodeRange.cjs":82,"./Url.cjs":83,"./Value.cjs":84,"./WhiteSpace.cjs":85}],88:[function(require,module,exports){
'use strict';

const selectorList = {
    parse() {
        return this.createSingleNodeList(
            this.SelectorList()
        );
    }
};

const selector = {
    parse() {
        return this.createSingleNodeList(
            this.Selector()
        );
    }
};

const identList = {
    parse() {
        return this.createSingleNodeList(
            this.Identifier()
        );
    }
};

const nth = {
    parse() {
        return this.createSingleNodeList(
            this.Nth()
        );
    }
};

const pseudo = {
    'dir': identList,
    'has': selectorList,
    'lang': identList,
    'matches': selectorList,
    'is': selectorList,
    '-moz-any': selectorList,
    '-webkit-any': selectorList,
    'where': selectorList,
    'not': selectorList,
    'nth-child': nth,
    'nth-last-child': nth,
    'nth-last-of-type': nth,
    'nth-of-type': nth,
    'slotted': selector,
    'host': selector,
    'host-context': selector
};

module.exports = pseudo;

},{}],89:[function(require,module,exports){
'use strict';

const _default = require('./default.cjs');

const atrulePrelude = {
    getNode: _default
};

module.exports = atrulePrelude;

},{"./default.cjs":90}],90:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const NUMBERSIGN = 0x0023;  // U+0023 NUMBER SIGN (#)
const ASTERISK = 0x002A;    // U+002A ASTERISK (*)
const PLUSSIGN = 0x002B;    // U+002B PLUS SIGN (+)
const HYPHENMINUS = 0x002D; // U+002D HYPHEN-MINUS (-)
const SOLIDUS = 0x002F;     // U+002F SOLIDUS (/)
const U = 0x0075;           // U+0075 LATIN SMALL LETTER U (u)

function defaultRecognizer(context) {
    switch (this.tokenType) {
        case types.Hash:
            return this.Hash();

        case types.Comma:
            return this.Operator();

        case types.LeftParenthesis:
            return this.Parentheses(this.readSequence, context.recognizer);

        case types.LeftSquareBracket:
            return this.Brackets(this.readSequence, context.recognizer);

        case types.String:
            return this.String();

        case types.Dimension:
            return this.Dimension();

        case types.Percentage:
            return this.Percentage();

        case types.Number:
            return this.Number();

        case types.Function:
            return this.cmpStr(this.tokenStart, this.tokenEnd, 'url(')
                ? this.Url()
                : this.Function(this.readSequence, context.recognizer);

        case types.Url:
            return this.Url();

        case types.Ident:
            // check for unicode range, it should start with u+ or U+
            if (this.cmpChar(this.tokenStart, U) &&
                this.cmpChar(this.tokenStart + 1, PLUSSIGN)) {
                return this.UnicodeRange();
            } else {
                return this.Identifier();
            }

        case types.Delim: {
            const code = this.charCodeAt(this.tokenStart);

            if (code === SOLIDUS ||
                code === ASTERISK ||
                code === PLUSSIGN ||
                code === HYPHENMINUS) {
                return this.Operator(); // TODO: replace with Delim
            }

            // TODO: produce a node with Delim node type

            if (code === NUMBERSIGN) {
                this.error('Hex or identifier is expected', this.tokenStart + 1);
            }

            break;
        }
    }
}

module.exports = defaultRecognizer;

},{"../../tokenizer/types.cjs":100}],91:[function(require,module,exports){
'use strict';

const atrulePrelude = require('./atrulePrelude.cjs');
const selector = require('./selector.cjs');
const value = require('./value.cjs');



exports.AtrulePrelude = atrulePrelude;
exports.Selector = selector;
exports.Value = value;

},{"./atrulePrelude.cjs":89,"./selector.cjs":92,"./value.cjs":93}],92:[function(require,module,exports){
'use strict';

const types = require('../../tokenizer/types.cjs');

const NUMBERSIGN = 0x0023;      // U+0023 NUMBER SIGN (#)
const AMPERSAND = 0x0026;       // U+0026 AMPERSAND (&)
const ASTERISK = 0x002A;        // U+002A ASTERISK (*)
const PLUSSIGN = 0x002B;        // U+002B PLUS SIGN (+)
const SOLIDUS = 0x002F;         // U+002F SOLIDUS (/)
const FULLSTOP = 0x002E;        // U+002E FULL STOP (.)
const GREATERTHANSIGN = 0x003E; // U+003E GREATER-THAN SIGN (>)
const VERTICALLINE = 0x007C;    // U+007C VERTICAL LINE (|)
const TILDE = 0x007E;           // U+007E TILDE (~)

function onWhiteSpace(next, children) {
    if (children.last !== null && children.last.type !== 'Combinator' &&
        next !== null && next.type !== 'Combinator') {
        children.push({  // FIXME: this.Combinator() should be used instead
            type: 'Combinator',
            loc: null,
            name: ' '
        });
    }
}

function getNode() {
    switch (this.tokenType) {
        case types.LeftSquareBracket:
            return this.AttributeSelector();

        case types.Hash:
            return this.IdSelector();

        case types.Colon:
            if (this.lookupType(1) === types.Colon) {
                return this.PseudoElementSelector();
            } else {
                return this.PseudoClassSelector();
            }

        case types.Ident:
            return this.TypeSelector();

        case types.Number:
        case types.Percentage:
            return this.Percentage();

        case types.Dimension:
            // throws when .123ident
            if (this.charCodeAt(this.tokenStart) === FULLSTOP) {
                this.error('Identifier is expected', this.tokenStart + 1);
            }
            break;

        case types.Delim: {
            const code = this.charCodeAt(this.tokenStart);

            switch (code) {
                case PLUSSIGN:
                case GREATERTHANSIGN:
                case TILDE:
                case SOLIDUS:  // /deep/
                    return this.Combinator();

                case FULLSTOP:
                    return this.ClassSelector();

                case ASTERISK:
                case VERTICALLINE:
                    return this.TypeSelector();

                case NUMBERSIGN:
                    return this.IdSelector();

                case AMPERSAND:
                    return this.NestingSelector();
            }

            break;
        }
    }
}
const Selector = {
    onWhiteSpace,
    getNode
};

module.exports = Selector;

},{"../../tokenizer/types.cjs":100}],93:[function(require,module,exports){
'use strict';

const _default = require('./default.cjs');
const expression = require('../function/expression.cjs');
const _var = require('../function/var.cjs');

function isPlusMinusOperator(node) {
    return (
        node !== null &&
        node.type === 'Operator' &&
        (node.value[node.value.length - 1] === '-' || node.value[node.value.length - 1] === '+')
    );
}

const value = {
    getNode: _default,
    onWhiteSpace(next, children) {
        if (isPlusMinusOperator(next)) {
            next.value = ' ' + next.value;
        }
        if (isPlusMinusOperator(children.last)) {
            children.last.value += ' ';
        }
    },
    'expression': expression,
    'var': _var
};

module.exports = value;

},{"../function/expression.cjs":42,"../function/var.cjs":43,"./default.cjs":90}],94:[function(require,module,exports){
'use strict';

const adoptBuffer = require('./adopt-buffer.cjs');
const charCodeDefinitions = require('./char-code-definitions.cjs');

const N = 10;
const F = 12;
const R = 13;

function computeLinesAndColumns(host) {
    const source = host.source;
    const sourceLength = source.length;
    const startOffset = source.length > 0 ? charCodeDefinitions.isBOM(source.charCodeAt(0)) : 0;
    const lines = adoptBuffer.adoptBuffer(host.lines, sourceLength);
    const columns = adoptBuffer.adoptBuffer(host.columns, sourceLength);
    let line = host.startLine;
    let column = host.startColumn;

    for (let i = startOffset; i < sourceLength; i++) {
        const code = source.charCodeAt(i);

        lines[i] = line;
        columns[i] = column++;

        if (code === N || code === R || code === F) {
            if (code === R && i + 1 < sourceLength && source.charCodeAt(i + 1) === N) {
                i++;
                lines[i] = line;
                columns[i] = column;
            }

            line++;
            column = 1;
        }
    }

    lines[sourceLength] = line;
    columns[sourceLength] = column;

    host.lines = lines;
    host.columns = columns;
    host.computed = true;
}

class OffsetToLocation {
    constructor() {
        this.lines = null;
        this.columns = null;
        this.computed = false;
    }
    setSource(source, startOffset = 0, startLine = 1, startColumn = 1) {
        this.source = source;
        this.startOffset = startOffset;
        this.startLine = startLine;
        this.startColumn = startColumn;
        this.computed = false;
    }
    getLocation(offset, filename) {
        if (!this.computed) {
            computeLinesAndColumns(this);
        }

        return {
            source: filename,
            offset: this.startOffset + offset,
            line: this.lines[offset],
            column: this.columns[offset]
        };
    }
    getLocationRange(start, end, filename) {
        if (!this.computed) {
            computeLinesAndColumns(this);
        }

        return {
            source: filename,
            start: {
                offset: this.startOffset + start,
                line: this.lines[start],
                column: this.columns[start]
            },
            end: {
                offset: this.startOffset + end,
                line: this.lines[end],
                column: this.columns[end]
            }
        };
    }
}

exports.OffsetToLocation = OffsetToLocation;

},{"./adopt-buffer.cjs":96,"./char-code-definitions.cjs":97}],95:[function(require,module,exports){
'use strict';

const adoptBuffer = require('./adopt-buffer.cjs');
const utils = require('./utils.cjs');
const names = require('./names.cjs');
const types = require('./types.cjs');

const OFFSET_MASK = 0x00FFFFFF;
const TYPE_SHIFT = 24;
const balancePair = new Map([
    [types.Function, types.RightParenthesis],
    [types.LeftParenthesis, types.RightParenthesis],
    [types.LeftSquareBracket, types.RightSquareBracket],
    [types.LeftCurlyBracket, types.RightCurlyBracket]
]);

class TokenStream {
    constructor(source, tokenize) {
        this.setSource(source, tokenize);
    }
    reset() {
        this.eof = false;
        this.tokenIndex = -1;
        this.tokenType = 0;
        this.tokenStart = this.firstCharOffset;
        this.tokenEnd = this.firstCharOffset;
    }
    setSource(source = '', tokenize = () => {}) {
        source = String(source || '');

        const sourceLength = source.length;
        const offsetAndType = adoptBuffer.adoptBuffer(this.offsetAndType, source.length + 1); // +1 because of eof-token
        const balance = adoptBuffer.adoptBuffer(this.balance, source.length + 1);
        let tokenCount = 0;
        let balanceCloseType = 0;
        let balanceStart = 0;
        let firstCharOffset = -1;

        // capture buffers
        this.offsetAndType = null;
        this.balance = null;

        tokenize(source, (type, start, end) => {
            switch (type) {
                default:
                    balance[tokenCount] = sourceLength;
                    break;

                case balanceCloseType: {
                    let balancePrev = balanceStart & OFFSET_MASK;
                    balanceStart = balance[balancePrev];
                    balanceCloseType = balanceStart >> TYPE_SHIFT;
                    balance[tokenCount] = balancePrev;
                    balance[balancePrev++] = tokenCount;
                    for (; balancePrev < tokenCount; balancePrev++) {
                        if (balance[balancePrev] === sourceLength) {
                            balance[balancePrev] = tokenCount;
                        }
                    }
                    break;
                }

                case types.LeftParenthesis:
                case types.Function:
                case types.LeftSquareBracket:
                case types.LeftCurlyBracket:
                    balance[tokenCount] = balanceStart;
                    balanceCloseType = balancePair.get(type);
                    balanceStart = (balanceCloseType << TYPE_SHIFT) | tokenCount;
                    break;
            }

            offsetAndType[tokenCount++] = (type << TYPE_SHIFT) | end;
            if (firstCharOffset === -1) {
                firstCharOffset = start;
            }
        });

        // finalize buffers
        offsetAndType[tokenCount] = (types.EOF << TYPE_SHIFT) | sourceLength; // <EOF-token>
        balance[tokenCount] = sourceLength;
        balance[sourceLength] = sourceLength; // prevents false positive balance match with any token
        while (balanceStart !== 0) {
            const balancePrev = balanceStart & OFFSET_MASK;
            balanceStart = balance[balancePrev];
            balance[balancePrev] = sourceLength;
        }

        this.source = source;
        this.firstCharOffset = firstCharOffset === -1 ? 0 : firstCharOffset;
        this.tokenCount = tokenCount;
        this.offsetAndType = offsetAndType;
        this.balance = balance;

        this.reset();
        this.next();
    }

    lookupType(offset) {
        offset += this.tokenIndex;

        if (offset < this.tokenCount) {
            return this.offsetAndType[offset] >> TYPE_SHIFT;
        }

        return types.EOF;
    }
    lookupOffset(offset) {
        offset += this.tokenIndex;

        if (offset < this.tokenCount) {
            return this.offsetAndType[offset - 1] & OFFSET_MASK;
        }

        return this.source.length;
    }
    lookupValue(offset, referenceStr) {
        offset += this.tokenIndex;

        if (offset < this.tokenCount) {
            return utils.cmpStr(
                this.source,
                this.offsetAndType[offset - 1] & OFFSET_MASK,
                this.offsetAndType[offset] & OFFSET_MASK,
                referenceStr
            );
        }

        return false;
    }
    getTokenStart(tokenIndex) {
        if (tokenIndex === this.tokenIndex) {
            return this.tokenStart;
        }

        if (tokenIndex > 0) {
            return tokenIndex < this.tokenCount
                ? this.offsetAndType[tokenIndex - 1] & OFFSET_MASK
                : this.offsetAndType[this.tokenCount] & OFFSET_MASK;
        }

        return this.firstCharOffset;
    }
    substrToCursor(start) {
        return this.source.substring(start, this.tokenStart);
    }

    isBalanceEdge(pos) {
        return this.balance[this.tokenIndex] < pos;
    }
    isDelim(code, offset) {
        if (offset) {
            return (
                this.lookupType(offset) === types.Delim &&
                this.source.charCodeAt(this.lookupOffset(offset)) === code
            );
        }

        return (
            this.tokenType === types.Delim &&
            this.source.charCodeAt(this.tokenStart) === code
        );
    }

    skip(tokenCount) {
        let next = this.tokenIndex + tokenCount;

        if (next < this.tokenCount) {
            this.tokenIndex = next;
            this.tokenStart = this.offsetAndType[next - 1] & OFFSET_MASK;
            next = this.offsetAndType[next];
            this.tokenType = next >> TYPE_SHIFT;
            this.tokenEnd = next & OFFSET_MASK;
        } else {
            this.tokenIndex = this.tokenCount;
            this.next();
        }
    }
    next() {
        let next = this.tokenIndex + 1;

        if (next < this.tokenCount) {
            this.tokenIndex = next;
            this.tokenStart = this.tokenEnd;
            next = this.offsetAndType[next];
            this.tokenType = next >> TYPE_SHIFT;
            this.tokenEnd = next & OFFSET_MASK;
        } else {
            this.eof = true;
            this.tokenIndex = this.tokenCount;
            this.tokenType = types.EOF;
            this.tokenStart = this.tokenEnd = this.source.length;
        }
    }
    skipSC() {
        while (this.tokenType === types.WhiteSpace || this.tokenType === types.Comment) {
            this.next();
        }
    }
    skipUntilBalanced(startToken, stopConsume) {
        let cursor = startToken;
        let balanceEnd;
        let offset;

        loop:
        for (; cursor < this.tokenCount; cursor++) {
            balanceEnd = this.balance[cursor];

            // stop scanning on balance edge that points to offset before start token
            if (balanceEnd < startToken) {
                break loop;
            }

            offset = cursor > 0 ? this.offsetAndType[cursor - 1] & OFFSET_MASK : this.firstCharOffset;

            // check stop condition
            switch (stopConsume(this.source.charCodeAt(offset))) {
                case 1: // just stop
                    break loop;

                case 2: // stop & included
                    cursor++;
                    break loop;

                default:
                    // fast forward to the end of balanced block
                    if (this.balance[balanceEnd] === cursor) {
                        cursor = balanceEnd;
                    }
            }
        }

        this.skip(cursor - this.tokenIndex);
    }

    forEachToken(fn) {
        for (let i = 0, offset = this.firstCharOffset; i < this.tokenCount; i++) {
            const start = offset;
            const item = this.offsetAndType[i];
            const end = item & OFFSET_MASK;
            const type = item >> TYPE_SHIFT;

            offset = end;

            fn(type, start, end, i);
        }
    }
    dump() {
        const tokens = new Array(this.tokenCount);

        this.forEachToken((type, start, end, index) => {
            tokens[index] = {
                idx: index,
                type: names[type],
                chunk: this.source.substring(start, end),
                balance: this.balance[index]
            };
        });

        return tokens;
    }
}

exports.TokenStream = TokenStream;

},{"./adopt-buffer.cjs":96,"./names.cjs":99,"./types.cjs":100,"./utils.cjs":101}],96:[function(require,module,exports){
'use strict';

const MIN_SIZE = 16 * 1024;

function adoptBuffer(buffer = null, size) {
    if (buffer === null || buffer.length < size) {
        return new Uint32Array(Math.max(size + 1024, MIN_SIZE));
    }

    return buffer;
}

exports.adoptBuffer = adoptBuffer;

},{}],97:[function(require,module,exports){
'use strict';

const EOF = 0;

// https://drafts.csswg.org/css-syntax-3/
// § 4.2. Definitions

// digit
// A code point between U+0030 DIGIT ZERO (0) and U+0039 DIGIT NINE (9).
function isDigit(code) {
    return code >= 0x0030 && code <= 0x0039;
}

// hex digit
// A digit, or a code point between U+0041 LATIN CAPITAL LETTER A (A) and U+0046 LATIN CAPITAL LETTER F (F),
// or a code point between U+0061 LATIN SMALL LETTER A (a) and U+0066 LATIN SMALL LETTER F (f).
function isHexDigit(code) {
    return (
        isDigit(code) || // 0 .. 9
        (code >= 0x0041 && code <= 0x0046) || // A .. F
        (code >= 0x0061 && code <= 0x0066)    // a .. f
    );
}

// uppercase letter
// A code point between U+0041 LATIN CAPITAL LETTER A (A) and U+005A LATIN CAPITAL LETTER Z (Z).
function isUppercaseLetter(code) {
    return code >= 0x0041 && code <= 0x005A;
}

// lowercase letter
// A code point between U+0061 LATIN SMALL LETTER A (a) and U+007A LATIN SMALL LETTER Z (z).
function isLowercaseLetter(code) {
    return code >= 0x0061 && code <= 0x007A;
}

// letter
// An uppercase letter or a lowercase letter.
function isLetter(code) {
    return isUppercaseLetter(code) || isLowercaseLetter(code);
}

// non-ASCII code point
// A code point with a value equal to or greater than U+0080 <control>.
function isNonAscii(code) {
    return code >= 0x0080;
}

// name-start code point
// A letter, a non-ASCII code point, or U+005F LOW LINE (_).
function isNameStart(code) {
    return isLetter(code) || isNonAscii(code) || code === 0x005F;
}

// name code point
// A name-start code point, a digit, or U+002D HYPHEN-MINUS (-).
function isName(code) {
    return isNameStart(code) || isDigit(code) || code === 0x002D;
}

// non-printable code point
// A code point between U+0000 NULL and U+0008 BACKSPACE, or U+000B LINE TABULATION,
// or a code point between U+000E SHIFT OUT and U+001F INFORMATION SEPARATOR ONE, or U+007F DELETE.
function isNonPrintable(code) {
    return (
        (code >= 0x0000 && code <= 0x0008) ||
        (code === 0x000B) ||
        (code >= 0x000E && code <= 0x001F) ||
        (code === 0x007F)
    );
}

// newline
// U+000A LINE FEED. Note that U+000D CARRIAGE RETURN and U+000C FORM FEED are not included in this definition,
// as they are converted to U+000A LINE FEED during preprocessing.
// TODO: we doesn't do a preprocessing, so check a code point for U+000D CARRIAGE RETURN and U+000C FORM FEED
function isNewline(code) {
    return code === 0x000A || code === 0x000D || code === 0x000C;
}

// whitespace
// A newline, U+0009 CHARACTER TABULATION, or U+0020 SPACE.
function isWhiteSpace(code) {
    return isNewline(code) || code === 0x0020 || code === 0x0009;
}

// § 4.3.8. Check if two code points are a valid escape
function isValidEscape(first, second) {
    // If the first code point is not U+005C REVERSE SOLIDUS (\), return false.
    if (first !== 0x005C) {
        return false;
    }

    // Otherwise, if the second code point is a newline or EOF, return false.
    if (isNewline(second) || second === EOF) {
        return false;
    }

    // Otherwise, return true.
    return true;
}

// § 4.3.9. Check if three code points would start an identifier
function isIdentifierStart(first, second, third) {
    // Look at the first code point:

    // U+002D HYPHEN-MINUS
    if (first === 0x002D) {
        // If the second code point is a name-start code point or a U+002D HYPHEN-MINUS,
        // or the second and third code points are a valid escape, return true. Otherwise, return false.
        return (
            isNameStart(second) ||
            second === 0x002D ||
            isValidEscape(second, third)
        );
    }

    // name-start code point
    if (isNameStart(first)) {
        // Return true.
        return true;
    }

    // U+005C REVERSE SOLIDUS (\)
    if (first === 0x005C) {
        // If the first and second code points are a valid escape, return true. Otherwise, return false.
        return isValidEscape(first, second);
    }

    // anything else
    // Return false.
    return false;
}

// § 4.3.10. Check if three code points would start a number
function isNumberStart(first, second, third) {
    // Look at the first code point:

    // U+002B PLUS SIGN (+)
    // U+002D HYPHEN-MINUS (-)
    if (first === 0x002B || first === 0x002D) {
        // If the second code point is a digit, return true.
        if (isDigit(second)) {
            return 2;
        }

        // Otherwise, if the second code point is a U+002E FULL STOP (.)
        // and the third code point is a digit, return true.
        // Otherwise, return false.
        return second === 0x002E && isDigit(third) ? 3 : 0;
    }

    // U+002E FULL STOP (.)
    if (first === 0x002E) {
        // If the second code point is a digit, return true. Otherwise, return false.
        return isDigit(second) ? 2 : 0;
    }

    // digit
    if (isDigit(first)) {
        // Return true.
        return 1;
    }

    // anything else
    // Return false.
    return 0;
}

//
// Misc
//

// detect BOM (https://en.wikipedia.org/wiki/Byte_order_mark)
function isBOM(code) {
    // UTF-16BE
    if (code === 0xFEFF) {
        return 1;
    }

    // UTF-16LE
    if (code === 0xFFFE) {
        return 1;
    }

    return 0;
}

// Fast code category
// Only ASCII code points has a special meaning, that's why we define a maps for 0..127 codes only
const CATEGORY = new Array(0x80);
const EofCategory = 0x80;
const WhiteSpaceCategory = 0x82;
const DigitCategory = 0x83;
const NameStartCategory = 0x84;
const NonPrintableCategory = 0x85;

for (let i = 0; i < CATEGORY.length; i++) {
    CATEGORY[i] =
        isWhiteSpace(i) && WhiteSpaceCategory ||
        isDigit(i) && DigitCategory ||
        isNameStart(i) && NameStartCategory ||
        isNonPrintable(i) && NonPrintableCategory ||
        i || EofCategory;
}

function charCodeCategory(code) {
    return code < 0x80 ? CATEGORY[code] : NameStartCategory;
}

exports.DigitCategory = DigitCategory;
exports.EofCategory = EofCategory;
exports.NameStartCategory = NameStartCategory;
exports.NonPrintableCategory = NonPrintableCategory;
exports.WhiteSpaceCategory = WhiteSpaceCategory;
exports.charCodeCategory = charCodeCategory;
exports.isBOM = isBOM;
exports.isDigit = isDigit;
exports.isHexDigit = isHexDigit;
exports.isIdentifierStart = isIdentifierStart;
exports.isLetter = isLetter;
exports.isLowercaseLetter = isLowercaseLetter;
exports.isName = isName;
exports.isNameStart = isNameStart;
exports.isNewline = isNewline;
exports.isNonAscii = isNonAscii;
exports.isNonPrintable = isNonPrintable;
exports.isNumberStart = isNumberStart;
exports.isUppercaseLetter = isUppercaseLetter;
exports.isValidEscape = isValidEscape;
exports.isWhiteSpace = isWhiteSpace;

},{}],98:[function(require,module,exports){
'use strict';

const types = require('./types.cjs');
const charCodeDefinitions = require('./char-code-definitions.cjs');
const utils = require('./utils.cjs');
const names = require('./names.cjs');
const OffsetToLocation = require('./OffsetToLocation.cjs');
const TokenStream = require('./TokenStream.cjs');

function tokenize(source, onToken) {
    function getCharCode(offset) {
        return offset < sourceLength ? source.charCodeAt(offset) : 0;
    }

    // § 4.3.3. Consume a numeric token
    function consumeNumericToken() {
        // Consume a number and let number be the result.
        offset = utils.consumeNumber(source, offset);

        // If the next 3 input code points would start an identifier, then:
        if (charCodeDefinitions.isIdentifierStart(getCharCode(offset), getCharCode(offset + 1), getCharCode(offset + 2))) {
            // Create a <dimension-token> with the same value and type flag as number, and a unit set initially to the empty string.
            // Consume a name. Set the <dimension-token>’s unit to the returned value.
            // Return the <dimension-token>.
            type = types.Dimension;
            offset = utils.consumeName(source, offset);
            return;
        }

        // Otherwise, if the next input code point is U+0025 PERCENTAGE SIGN (%), consume it.
        if (getCharCode(offset) === 0x0025) {
            // Create a <percentage-token> with the same value as number, and return it.
            type = types.Percentage;
            offset++;
            return;
        }

        // Otherwise, create a <number-token> with the same value and type flag as number, and return it.
        type = types.Number;
    }

    // § 4.3.4. Consume an ident-like token
    function consumeIdentLikeToken() {
        const nameStartOffset = offset;

        // Consume a name, and let string be the result.
        offset = utils.consumeName(source, offset);

        // If string’s value is an ASCII case-insensitive match for "url",
        // and the next input code point is U+0028 LEFT PARENTHESIS ((), consume it.
        if (utils.cmpStr(source, nameStartOffset, offset, 'url') && getCharCode(offset) === 0x0028) {
            // While the next two input code points are whitespace, consume the next input code point.
            offset = utils.findWhiteSpaceEnd(source, offset + 1);

            // If the next one or two input code points are U+0022 QUOTATION MARK ("), U+0027 APOSTROPHE ('),
            // or whitespace followed by U+0022 QUOTATION MARK (") or U+0027 APOSTROPHE ('),
            // then create a <function-token> with its value set to string and return it.
            if (getCharCode(offset) === 0x0022 ||
                getCharCode(offset) === 0x0027) {
                type = types.Function;
                offset = nameStartOffset + 4;
                return;
            }

            // Otherwise, consume a url token, and return it.
            consumeUrlToken();
            return;
        }

        // Otherwise, if the next input code point is U+0028 LEFT PARENTHESIS ((), consume it.
        // Create a <function-token> with its value set to string and return it.
        if (getCharCode(offset) === 0x0028) {
            type = types.Function;
            offset++;
            return;
        }

        // Otherwise, create an <ident-token> with its value set to string and return it.
        type = types.Ident;
    }

    // § 4.3.5. Consume a string token
    function consumeStringToken(endingCodePoint) {
        // This algorithm may be called with an ending code point, which denotes the code point
        // that ends the string. If an ending code point is not specified,
        // the current input code point is used.
        if (!endingCodePoint) {
            endingCodePoint = getCharCode(offset++);
        }

        // Initially create a <string-token> with its value set to the empty string.
        type = types.String;

        // Repeatedly consume the next input code point from the stream:
        for (; offset < source.length; offset++) {
            const code = source.charCodeAt(offset);

            switch (charCodeDefinitions.charCodeCategory(code)) {
                // ending code point
                case endingCodePoint:
                    // Return the <string-token>.
                    offset++;
                    return;

                    // EOF
                    // case EofCategory:
                    // This is a parse error. Return the <string-token>.
                    // return;

                // newline
                case charCodeDefinitions.WhiteSpaceCategory:
                    if (charCodeDefinitions.isNewline(code)) {
                        // This is a parse error. Reconsume the current input code point,
                        // create a <bad-string-token>, and return it.
                        offset += utils.getNewlineLength(source, offset, code);
                        type = types.BadString;
                        return;
                    }
                    break;

                // U+005C REVERSE SOLIDUS (\)
                case 0x005C:
                    // If the next input code point is EOF, do nothing.
                    if (offset === source.length - 1) {
                        break;
                    }

                    const nextCode = getCharCode(offset + 1);

                    // Otherwise, if the next input code point is a newline, consume it.
                    if (charCodeDefinitions.isNewline(nextCode)) {
                        offset += utils.getNewlineLength(source, offset + 1, nextCode);
                    } else if (charCodeDefinitions.isValidEscape(code, nextCode)) {
                        // Otherwise, (the stream starts with a valid escape) consume
                        // an escaped code point and append the returned code point to
                        // the <string-token>’s value.
                        offset = utils.consumeEscaped(source, offset) - 1;
                    }
                    break;

                // anything else
                // Append the current input code point to the <string-token>’s value.
            }
        }
    }

    // § 4.3.6. Consume a url token
    // Note: This algorithm assumes that the initial "url(" has already been consumed.
    // This algorithm also assumes that it’s being called to consume an "unquoted" value, like url(foo).
    // A quoted value, like url("foo"), is parsed as a <function-token>. Consume an ident-like token
    // automatically handles this distinction; this algorithm shouldn’t be called directly otherwise.
    function consumeUrlToken() {
        // Initially create a <url-token> with its value set to the empty string.
        type = types.Url;

        // Consume as much whitespace as possible.
        offset = utils.findWhiteSpaceEnd(source, offset);

        // Repeatedly consume the next input code point from the stream:
        for (; offset < source.length; offset++) {
            const code = source.charCodeAt(offset);

            switch (charCodeDefinitions.charCodeCategory(code)) {
                // U+0029 RIGHT PARENTHESIS ())
                case 0x0029:
                    // Return the <url-token>.
                    offset++;
                    return;

                    // EOF
                    // case EofCategory:
                    // This is a parse error. Return the <url-token>.
                    // return;

                // whitespace
                case charCodeDefinitions.WhiteSpaceCategory:
                    // Consume as much whitespace as possible.
                    offset = utils.findWhiteSpaceEnd(source, offset);

                    // If the next input code point is U+0029 RIGHT PARENTHESIS ()) or EOF,
                    // consume it and return the <url-token>
                    // (if EOF was encountered, this is a parse error);
                    if (getCharCode(offset) === 0x0029 || offset >= source.length) {
                        if (offset < source.length) {
                            offset++;
                        }
                        return;
                    }

                    // otherwise, consume the remnants of a bad url, create a <bad-url-token>,
                    // and return it.
                    offset = utils.consumeBadUrlRemnants(source, offset);
                    type = types.BadUrl;
                    return;

                // U+0022 QUOTATION MARK (")
                // U+0027 APOSTROPHE (')
                // U+0028 LEFT PARENTHESIS (()
                // non-printable code point
                case 0x0022:
                case 0x0027:
                case 0x0028:
                case charCodeDefinitions.NonPrintableCategory:
                    // This is a parse error. Consume the remnants of a bad url,
                    // create a <bad-url-token>, and return it.
                    offset = utils.consumeBadUrlRemnants(source, offset);
                    type = types.BadUrl;
                    return;

                // U+005C REVERSE SOLIDUS (\)
                case 0x005C:
                    // If the stream starts with a valid escape, consume an escaped code point and
                    // append the returned code point to the <url-token>’s value.
                    if (charCodeDefinitions.isValidEscape(code, getCharCode(offset + 1))) {
                        offset = utils.consumeEscaped(source, offset) - 1;
                        break;
                    }

                    // Otherwise, this is a parse error. Consume the remnants of a bad url,
                    // create a <bad-url-token>, and return it.
                    offset = utils.consumeBadUrlRemnants(source, offset);
                    type = types.BadUrl;
                    return;

                // anything else
                // Append the current input code point to the <url-token>’s value.
            }
        }
    }

    // ensure source is a string
    source = String(source || '');

    const sourceLength = source.length;
    let start = charCodeDefinitions.isBOM(getCharCode(0));
    let offset = start;
    let type;

    // https://drafts.csswg.org/css-syntax-3/#consume-token
    // § 4.3.1. Consume a token
    while (offset < sourceLength) {
        const code = source.charCodeAt(offset);

        switch (charCodeDefinitions.charCodeCategory(code)) {
            // whitespace
            case charCodeDefinitions.WhiteSpaceCategory:
                // Consume as much whitespace as possible. Return a <whitespace-token>.
                type = types.WhiteSpace;
                offset = utils.findWhiteSpaceEnd(source, offset + 1);
                break;

            // U+0022 QUOTATION MARK (")
            case 0x0022:
                // Consume a string token and return it.
                consumeStringToken();
                break;

            // U+0023 NUMBER SIGN (#)
            case 0x0023:
                // If the next input code point is a name code point or the next two input code points are a valid escape, then:
                if (charCodeDefinitions.isName(getCharCode(offset + 1)) || charCodeDefinitions.isValidEscape(getCharCode(offset + 1), getCharCode(offset + 2))) {
                    // Create a <hash-token>.
                    type = types.Hash;

                    // If the next 3 input code points would start an identifier, set the <hash-token>’s type flag to "id".
                    // if (isIdentifierStart(getCharCode(offset + 1), getCharCode(offset + 2), getCharCode(offset + 3))) {
                    //     // TODO: set id flag
                    // }

                    // Consume a name, and set the <hash-token>’s value to the returned string.
                    offset = utils.consumeName(source, offset + 1);

                    // Return the <hash-token>.
                } else {
                    // Otherwise, return a <delim-token> with its value set to the current input code point.
                    type = types.Delim;
                    offset++;
                }

                break;

            // U+0027 APOSTROPHE (')
            case 0x0027:
                // Consume a string token and return it.
                consumeStringToken();
                break;

            // U+0028 LEFT PARENTHESIS (()
            case 0x0028:
                // Return a <(-token>.
                type = types.LeftParenthesis;
                offset++;
                break;

            // U+0029 RIGHT PARENTHESIS ())
            case 0x0029:
                // Return a <)-token>.
                type = types.RightParenthesis;
                offset++;
                break;

            // U+002B PLUS SIGN (+)
            case 0x002B:
                // If the input stream starts with a number, ...
                if (charCodeDefinitions.isNumberStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                    // ... reconsume the current input code point, consume a numeric token, and return it.
                    consumeNumericToken();
                } else {
                    // Otherwise, return a <delim-token> with its value set to the current input code point.
                    type = types.Delim;
                    offset++;
                }
                break;

            // U+002C COMMA (,)
            case 0x002C:
                // Return a <comma-token>.
                type = types.Comma;
                offset++;
                break;

            // U+002D HYPHEN-MINUS (-)
            case 0x002D:
                // If the input stream starts with a number, reconsume the current input code point, consume a numeric token, and return it.
                if (charCodeDefinitions.isNumberStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                    consumeNumericToken();
                } else {
                    // Otherwise, if the next 2 input code points are U+002D HYPHEN-MINUS U+003E GREATER-THAN SIGN (->), consume them and return a <CDC-token>.
                    if (getCharCode(offset + 1) === 0x002D &&
                        getCharCode(offset + 2) === 0x003E) {
                        type = types.CDC;
                        offset = offset + 3;
                    } else {
                        // Otherwise, if the input stream starts with an identifier, ...
                        if (charCodeDefinitions.isIdentifierStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                            // ... reconsume the current input code point, consume an ident-like token, and return it.
                            consumeIdentLikeToken();
                        } else {
                            // Otherwise, return a <delim-token> with its value set to the current input code point.
                            type = types.Delim;
                            offset++;
                        }
                    }
                }
                break;

            // U+002E FULL STOP (.)
            case 0x002E:
                // If the input stream starts with a number, ...
                if (charCodeDefinitions.isNumberStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                    // ... reconsume the current input code point, consume a numeric token, and return it.
                    consumeNumericToken();
                } else {
                    // Otherwise, return a <delim-token> with its value set to the current input code point.
                    type = types.Delim;
                    offset++;
                }

                break;

            // U+002F SOLIDUS (/)
            case 0x002F:
                // If the next two input code point are U+002F SOLIDUS (/) followed by a U+002A ASTERISK (*),
                if (getCharCode(offset + 1) === 0x002A) {
                    // ... consume them and all following code points up to and including the first U+002A ASTERISK (*)
                    // followed by a U+002F SOLIDUS (/), or up to an EOF code point.
                    type = types.Comment;
                    offset = source.indexOf('*/', offset + 2);
                    offset = offset === -1 ? source.length : offset + 2;
                } else {
                    type = types.Delim;
                    offset++;
                }
                break;

            // U+003A COLON (:)
            case 0x003A:
                // Return a <colon-token>.
                type = types.Colon;
                offset++;
                break;

            // U+003B SEMICOLON (;)
            case 0x003B:
                // Return a <semicolon-token>.
                type = types.Semicolon;
                offset++;
                break;

            // U+003C LESS-THAN SIGN (<)
            case 0x003C:
                // If the next 3 input code points are U+0021 EXCLAMATION MARK U+002D HYPHEN-MINUS U+002D HYPHEN-MINUS (!--), ...
                if (getCharCode(offset + 1) === 0x0021 &&
                    getCharCode(offset + 2) === 0x002D &&
                    getCharCode(offset + 3) === 0x002D) {
                    // ... consume them and return a <CDO-token>.
                    type = types.CDO;
                    offset = offset + 4;
                } else {
                    // Otherwise, return a <delim-token> with its value set to the current input code point.
                    type = types.Delim;
                    offset++;
                }

                break;

            // U+0040 COMMERCIAL AT (@)
            case 0x0040:
                // If the next 3 input code points would start an identifier, ...
                if (charCodeDefinitions.isIdentifierStart(getCharCode(offset + 1), getCharCode(offset + 2), getCharCode(offset + 3))) {
                    // ... consume a name, create an <at-keyword-token> with its value set to the returned value, and return it.
                    type = types.AtKeyword;
                    offset = utils.consumeName(source, offset + 1);
                } else {
                    // Otherwise, return a <delim-token> with its value set to the current input code point.
                    type = types.Delim;
                    offset++;
                }

                break;

            // U+005B LEFT SQUARE BRACKET ([)
            case 0x005B:
                // Return a <[-token>.
                type = types.LeftSquareBracket;
                offset++;
                break;

            // U+005C REVERSE SOLIDUS (\)
            case 0x005C:
                // If the input stream starts with a valid escape, ...
                if (charCodeDefinitions.isValidEscape(code, getCharCode(offset + 1))) {
                    // ... reconsume the current input code point, consume an ident-like token, and return it.
                    consumeIdentLikeToken();
                } else {
                    // Otherwise, this is a parse error. Return a <delim-token> with its value set to the current input code point.
                    type = types.Delim;
                    offset++;
                }
                break;

            // U+005D RIGHT SQUARE BRACKET (])
            case 0x005D:
                // Return a <]-token>.
                type = types.RightSquareBracket;
                offset++;
                break;

            // U+007B LEFT CURLY BRACKET ({)
            case 0x007B:
                // Return a <{-token>.
                type = types.LeftCurlyBracket;
                offset++;
                break;

            // U+007D RIGHT CURLY BRACKET (})
            case 0x007D:
                // Return a <}-token>.
                type = types.RightCurlyBracket;
                offset++;
                break;

            // digit
            case charCodeDefinitions.DigitCategory:
                // Reconsume the current input code point, consume a numeric token, and return it.
                consumeNumericToken();
                break;

            // name-start code point
            case charCodeDefinitions.NameStartCategory:
                // Reconsume the current input code point, consume an ident-like token, and return it.
                consumeIdentLikeToken();
                break;

                // EOF
                // case EofCategory:
                // Return an <EOF-token>.
                // break;

            // anything else
            default:
                // Return a <delim-token> with its value set to the current input code point.
                type = types.Delim;
                offset++;
        }

        // put token to stream
        onToken(type, start, start = offset);
    }
}

exports.AtKeyword = types.AtKeyword;
exports.BadString = types.BadString;
exports.BadUrl = types.BadUrl;
exports.CDC = types.CDC;
exports.CDO = types.CDO;
exports.Colon = types.Colon;
exports.Comma = types.Comma;
exports.Comment = types.Comment;
exports.Delim = types.Delim;
exports.Dimension = types.Dimension;
exports.EOF = types.EOF;
exports.Function = types.Function;
exports.Hash = types.Hash;
exports.Ident = types.Ident;
exports.LeftCurlyBracket = types.LeftCurlyBracket;
exports.LeftParenthesis = types.LeftParenthesis;
exports.LeftSquareBracket = types.LeftSquareBracket;
exports.Number = types.Number;
exports.Percentage = types.Percentage;
exports.RightCurlyBracket = types.RightCurlyBracket;
exports.RightParenthesis = types.RightParenthesis;
exports.RightSquareBracket = types.RightSquareBracket;
exports.Semicolon = types.Semicolon;
exports.String = types.String;
exports.Url = types.Url;
exports.WhiteSpace = types.WhiteSpace;
exports.tokenTypes = types;
exports.DigitCategory = charCodeDefinitions.DigitCategory;
exports.EofCategory = charCodeDefinitions.EofCategory;
exports.NameStartCategory = charCodeDefinitions.NameStartCategory;
exports.NonPrintableCategory = charCodeDefinitions.NonPrintableCategory;
exports.WhiteSpaceCategory = charCodeDefinitions.WhiteSpaceCategory;
exports.charCodeCategory = charCodeDefinitions.charCodeCategory;
exports.isBOM = charCodeDefinitions.isBOM;
exports.isDigit = charCodeDefinitions.isDigit;
exports.isHexDigit = charCodeDefinitions.isHexDigit;
exports.isIdentifierStart = charCodeDefinitions.isIdentifierStart;
exports.isLetter = charCodeDefinitions.isLetter;
exports.isLowercaseLetter = charCodeDefinitions.isLowercaseLetter;
exports.isName = charCodeDefinitions.isName;
exports.isNameStart = charCodeDefinitions.isNameStart;
exports.isNewline = charCodeDefinitions.isNewline;
exports.isNonAscii = charCodeDefinitions.isNonAscii;
exports.isNonPrintable = charCodeDefinitions.isNonPrintable;
exports.isNumberStart = charCodeDefinitions.isNumberStart;
exports.isUppercaseLetter = charCodeDefinitions.isUppercaseLetter;
exports.isValidEscape = charCodeDefinitions.isValidEscape;
exports.isWhiteSpace = charCodeDefinitions.isWhiteSpace;
exports.cmpChar = utils.cmpChar;
exports.cmpStr = utils.cmpStr;
exports.consumeBadUrlRemnants = utils.consumeBadUrlRemnants;
exports.consumeEscaped = utils.consumeEscaped;
exports.consumeName = utils.consumeName;
exports.consumeNumber = utils.consumeNumber;
exports.decodeEscaped = utils.decodeEscaped;
exports.findDecimalNumberEnd = utils.findDecimalNumberEnd;
exports.findWhiteSpaceEnd = utils.findWhiteSpaceEnd;
exports.findWhiteSpaceStart = utils.findWhiteSpaceStart;
exports.getNewlineLength = utils.getNewlineLength;
exports.tokenNames = names;
exports.OffsetToLocation = OffsetToLocation.OffsetToLocation;
exports.TokenStream = TokenStream.TokenStream;
exports.tokenize = tokenize;

},{"./OffsetToLocation.cjs":94,"./TokenStream.cjs":95,"./char-code-definitions.cjs":97,"./names.cjs":99,"./types.cjs":100,"./utils.cjs":101}],99:[function(require,module,exports){
'use strict';

const tokenNames = [
    'EOF-token',
    'ident-token',
    'function-token',
    'at-keyword-token',
    'hash-token',
    'string-token',
    'bad-string-token',
    'url-token',
    'bad-url-token',
    'delim-token',
    'number-token',
    'percentage-token',
    'dimension-token',
    'whitespace-token',
    'CDO-token',
    'CDC-token',
    'colon-token',
    'semicolon-token',
    'comma-token',
    '[-token',
    ']-token',
    '(-token',
    ')-token',
    '{-token',
    '}-token'
];

module.exports = tokenNames;

},{}],100:[function(require,module,exports){
'use strict';

// CSS Syntax Module Level 3
// https://www.w3.org/TR/css-syntax-3/
const EOF = 0;                 // <EOF-token>
const Ident = 1;               // <ident-token>
const Function = 2;            // <function-token>
const AtKeyword = 3;           // <at-keyword-token>
const Hash = 4;                // <hash-token>
const String = 5;              // <string-token>
const BadString = 6;           // <bad-string-token>
const Url = 7;                 // <url-token>
const BadUrl = 8;              // <bad-url-token>
const Delim = 9;               // <delim-token>
const Number = 10;             // <number-token>
const Percentage = 11;         // <percentage-token>
const Dimension = 12;          // <dimension-token>
const WhiteSpace = 13;         // <whitespace-token>
const CDO = 14;                // <CDO-token>
const CDC = 15;                // <CDC-token>
const Colon = 16;              // <colon-token>     :
const Semicolon = 17;          // <semicolon-token> ;
const Comma = 18;              // <comma-token>     ,
const LeftSquareBracket = 19;  // <[-token>
const RightSquareBracket = 20; // <]-token>
const LeftParenthesis = 21;    // <(-token>
const RightParenthesis = 22;   // <)-token>
const LeftCurlyBracket = 23;   // <{-token>
const RightCurlyBracket = 24;  // <}-token>
const Comment = 25;

exports.AtKeyword = AtKeyword;
exports.BadString = BadString;
exports.BadUrl = BadUrl;
exports.CDC = CDC;
exports.CDO = CDO;
exports.Colon = Colon;
exports.Comma = Comma;
exports.Comment = Comment;
exports.Delim = Delim;
exports.Dimension = Dimension;
exports.EOF = EOF;
exports.Function = Function;
exports.Hash = Hash;
exports.Ident = Ident;
exports.LeftCurlyBracket = LeftCurlyBracket;
exports.LeftParenthesis = LeftParenthesis;
exports.LeftSquareBracket = LeftSquareBracket;
exports.Number = Number;
exports.Percentage = Percentage;
exports.RightCurlyBracket = RightCurlyBracket;
exports.RightParenthesis = RightParenthesis;
exports.RightSquareBracket = RightSquareBracket;
exports.Semicolon = Semicolon;
exports.String = String;
exports.Url = Url;
exports.WhiteSpace = WhiteSpace;

},{}],101:[function(require,module,exports){
'use strict';

const charCodeDefinitions = require('./char-code-definitions.cjs');

function getCharCode(source, offset) {
    return offset < source.length ? source.charCodeAt(offset) : 0;
}

function getNewlineLength(source, offset, code) {
    if (code === 13 /* \r */ && getCharCode(source, offset + 1) === 10 /* \n */) {
        return 2;
    }

    return 1;
}

function cmpChar(testStr, offset, referenceCode) {
    let code = testStr.charCodeAt(offset);

    // code.toLowerCase() for A..Z
    if (charCodeDefinitions.isUppercaseLetter(code)) {
        code = code | 32;
    }

    return code === referenceCode;
}

function cmpStr(testStr, start, end, referenceStr) {
    if (end - start !== referenceStr.length) {
        return false;
    }

    if (start < 0 || end > testStr.length) {
        return false;
    }

    for (let i = start; i < end; i++) {
        const referenceCode = referenceStr.charCodeAt(i - start);
        let testCode = testStr.charCodeAt(i);

        // testCode.toLowerCase() for A..Z
        if (charCodeDefinitions.isUppercaseLetter(testCode)) {
            testCode = testCode | 32;
        }

        if (testCode !== referenceCode) {
            return false;
        }
    }

    return true;
}

function findWhiteSpaceStart(source, offset) {
    for (; offset >= 0; offset--) {
        if (!charCodeDefinitions.isWhiteSpace(source.charCodeAt(offset))) {
            break;
        }
    }

    return offset + 1;
}

function findWhiteSpaceEnd(source, offset) {
    for (; offset < source.length; offset++) {
        if (!charCodeDefinitions.isWhiteSpace(source.charCodeAt(offset))) {
            break;
        }
    }

    return offset;
}

function findDecimalNumberEnd(source, offset) {
    for (; offset < source.length; offset++) {
        if (!charCodeDefinitions.isDigit(source.charCodeAt(offset))) {
            break;
        }
    }

    return offset;
}

// § 4.3.7. Consume an escaped code point
function consumeEscaped(source, offset) {
    // It assumes that the U+005C REVERSE SOLIDUS (\) has already been consumed and
    // that the next input code point has already been verified to be part of a valid escape.
    offset += 2;

    // hex digit
    if (charCodeDefinitions.isHexDigit(getCharCode(source, offset - 1))) {
        // Consume as many hex digits as possible, but no more than 5.
        // Note that this means 1-6 hex digits have been consumed in total.
        for (const maxOffset = Math.min(source.length, offset + 5); offset < maxOffset; offset++) {
            if (!charCodeDefinitions.isHexDigit(getCharCode(source, offset))) {
                break;
            }
        }

        // If the next input code point is whitespace, consume it as well.
        const code = getCharCode(source, offset);
        if (charCodeDefinitions.isWhiteSpace(code)) {
            offset += getNewlineLength(source, offset, code);
        }
    }

    return offset;
}

// §4.3.11. Consume a name
// Note: This algorithm does not do the verification of the first few code points that are necessary
// to ensure the returned code points would constitute an <ident-token>. If that is the intended use,
// ensure that the stream starts with an identifier before calling this algorithm.
function consumeName(source, offset) {
    // Let result initially be an empty string.
    // Repeatedly consume the next input code point from the stream:
    for (; offset < source.length; offset++) {
        const code = source.charCodeAt(offset);

        // name code point
        if (charCodeDefinitions.isName(code)) {
            // Append the code point to result.
            continue;
        }

        // the stream starts with a valid escape
        if (charCodeDefinitions.isValidEscape(code, getCharCode(source, offset + 1))) {
            // Consume an escaped code point. Append the returned code point to result.
            offset = consumeEscaped(source, offset) - 1;
            continue;
        }

        // anything else
        // Reconsume the current input code point. Return result.
        break;
    }

    return offset;
}

// §4.3.12. Consume a number
function consumeNumber(source, offset) {
    let code = source.charCodeAt(offset);

    // 2. If the next input code point is U+002B PLUS SIGN (+) or U+002D HYPHEN-MINUS (-),
    // consume it and append it to repr.
    if (code === 0x002B || code === 0x002D) {
        code = source.charCodeAt(offset += 1);
    }

    // 3. While the next input code point is a digit, consume it and append it to repr.
    if (charCodeDefinitions.isDigit(code)) {
        offset = findDecimalNumberEnd(source, offset + 1);
        code = source.charCodeAt(offset);
    }

    // 4. If the next 2 input code points are U+002E FULL STOP (.) followed by a digit, then:
    if (code === 0x002E && charCodeDefinitions.isDigit(source.charCodeAt(offset + 1))) {
        // 4.1 Consume them.
        // 4.2 Append them to repr.
        offset += 2;

        // 4.3 Set type to "number".
        // TODO

        // 4.4 While the next input code point is a digit, consume it and append it to repr.

        offset = findDecimalNumberEnd(source, offset);
    }

    // 5. If the next 2 or 3 input code points are U+0045 LATIN CAPITAL LETTER E (E)
    // or U+0065 LATIN SMALL LETTER E (e), ... , followed by a digit, then:
    if (cmpChar(source, offset, 101 /* e */)) {
        let sign = 0;
        code = source.charCodeAt(offset + 1);

        // ... optionally followed by U+002D HYPHEN-MINUS (-) or U+002B PLUS SIGN (+) ...
        if (code === 0x002D || code === 0x002B) {
            sign = 1;
            code = source.charCodeAt(offset + 2);
        }

        // ... followed by a digit
        if (charCodeDefinitions.isDigit(code)) {
            // 5.1 Consume them.
            // 5.2 Append them to repr.

            // 5.3 Set type to "number".
            // TODO

            // 5.4 While the next input code point is a digit, consume it and append it to repr.
            offset = findDecimalNumberEnd(source, offset + 1 + sign + 1);
        }
    }

    return offset;
}

// § 4.3.14. Consume the remnants of a bad url
// ... its sole use is to consume enough of the input stream to reach a recovery point
// where normal tokenizing can resume.
function consumeBadUrlRemnants(source, offset) {
    // Repeatedly consume the next input code point from the stream:
    for (; offset < source.length; offset++) {
        const code = source.charCodeAt(offset);

        // U+0029 RIGHT PARENTHESIS ())
        // EOF
        if (code === 0x0029) {
            // Return.
            offset++;
            break;
        }

        if (charCodeDefinitions.isValidEscape(code, getCharCode(source, offset + 1))) {
            // Consume an escaped code point.
            // Note: This allows an escaped right parenthesis ("\)") to be encountered
            // without ending the <bad-url-token>. This is otherwise identical to
            // the "anything else" clause.
            offset = consumeEscaped(source, offset);
        }
    }

    return offset;
}

// § 4.3.7. Consume an escaped code point
// Note: This algorithm assumes that escaped is valid without leading U+005C REVERSE SOLIDUS (\)
function decodeEscaped(escaped) {
    // Single char escaped that's not a hex digit
    if (escaped.length === 1 && !charCodeDefinitions.isHexDigit(escaped.charCodeAt(0))) {
        return escaped[0];
    }

    // Interpret the hex digits as a hexadecimal number.
    let code = parseInt(escaped, 16);

    if (
        (code === 0) ||                       // If this number is zero,
        (code >= 0xD800 && code <= 0xDFFF) || // or is for a surrogate,
        (code > 0x10FFFF)                     // or is greater than the maximum allowed code point
    ) {
        // ... return U+FFFD REPLACEMENT CHARACTER
        code = 0xFFFD;
    }

    // Otherwise, return the code point with that value.
    return String.fromCodePoint(code);
}

exports.cmpChar = cmpChar;
exports.cmpStr = cmpStr;
exports.consumeBadUrlRemnants = consumeBadUrlRemnants;
exports.consumeEscaped = consumeEscaped;
exports.consumeName = consumeName;
exports.consumeNumber = consumeNumber;
exports.decodeEscaped = decodeEscaped;
exports.findDecimalNumberEnd = findDecimalNumberEnd;
exports.findWhiteSpaceEnd = findWhiteSpaceEnd;
exports.findWhiteSpaceStart = findWhiteSpaceStart;
exports.getNewlineLength = getNewlineLength;

},{"./char-code-definitions.cjs":97}],102:[function(require,module,exports){
'use strict';

//
//                              list
//                            ┌──────┐
//             ┌──────────────┼─head │
//             │              │ tail─┼──────────────┐
//             │              └──────┘              │
//             ▼                                    ▼
//            item        item        item        item
//          ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
//  null ◀──┼─prev │◀───┼─prev │◀───┼─prev │◀───┼─prev │
//          │ next─┼───▶│ next─┼───▶│ next─┼───▶│ next─┼──▶ null
//          ├──────┤    ├──────┤    ├──────┤    ├──────┤
//          │ data │    │ data │    │ data │    │ data │
//          └──────┘    └──────┘    └──────┘    └──────┘
//

let releasedCursors = null;

class List {
    static createItem(data) {
        return {
            prev: null,
            next: null,
            data
        };
    }

    constructor() {
        this.head = null;
        this.tail = null;
        this.cursor = null;
    }
    createItem(data) {
        return List.createItem(data);
    }

    // cursor helpers
    allocateCursor(prev, next) {
        let cursor;

        if (releasedCursors !== null) {
            cursor = releasedCursors;
            releasedCursors = releasedCursors.cursor;
            cursor.prev = prev;
            cursor.next = next;
            cursor.cursor = this.cursor;
        } else {
            cursor = {
                prev,
                next,
                cursor: this.cursor
            };
        }

        this.cursor = cursor;

        return cursor;
    }
    releaseCursor() {
        const { cursor } = this;

        this.cursor = cursor.cursor;
        cursor.prev = null;
        cursor.next = null;
        cursor.cursor = releasedCursors;
        releasedCursors = cursor;
    }
    updateCursors(prevOld, prevNew, nextOld, nextNew) {
        let { cursor } = this;

        while (cursor !== null) {
            if (cursor.prev === prevOld) {
                cursor.prev = prevNew;
            }

            if (cursor.next === nextOld) {
                cursor.next = nextNew;
            }

            cursor = cursor.cursor;
        }
    }
    *[Symbol.iterator]() {
        for (let cursor = this.head; cursor !== null; cursor = cursor.next) {
            yield cursor.data;
        }
    }

    // getters
    get size() {
        let size = 0;

        for (let cursor = this.head; cursor !== null; cursor = cursor.next) {
            size++;
        }

        return size;
    }
    get isEmpty() {
        return this.head === null;
    }
    get first() {
        return this.head && this.head.data;
    }
    get last() {
        return this.tail && this.tail.data;
    }

    // convertors
    fromArray(array) {
        let cursor = null;
        this.head = null;

        for (let data of array) {
            const item = List.createItem(data);

            if (cursor !== null) {
                cursor.next = item;
            } else {
                this.head = item;
            }

            item.prev = cursor;
            cursor = item;
        }

        this.tail = cursor;
        return this;
    }
    toArray() {
        return [...this];
    }
    toJSON() {
        return [...this];
    }

    // array-like methods
    forEach(fn, thisArg = this) {
        // push cursor
        const cursor = this.allocateCursor(null, this.head);

        while (cursor.next !== null) {
            const item = cursor.next;
            cursor.next = item.next;
            fn.call(thisArg, item.data, item, this);
        }

        // pop cursor
        this.releaseCursor();
    }
    forEachRight(fn, thisArg = this) {
        // push cursor
        const cursor = this.allocateCursor(this.tail, null);

        while (cursor.prev !== null) {
            const item = cursor.prev;
            cursor.prev = item.prev;
            fn.call(thisArg, item.data, item, this);
        }

        // pop cursor
        this.releaseCursor();
    }
    reduce(fn, initialValue, thisArg = this) {
        // push cursor
        let cursor = this.allocateCursor(null, this.head);
        let acc = initialValue;
        let item;

        while (cursor.next !== null) {
            item = cursor.next;
            cursor.next = item.next;

            acc = fn.call(thisArg, acc, item.data, item, this);
        }

        // pop cursor
        this.releaseCursor();

        return acc;
    }
    reduceRight(fn, initialValue, thisArg = this) {
        // push cursor
        let cursor = this.allocateCursor(this.tail, null);
        let acc = initialValue;
        let item;

        while (cursor.prev !== null) {
            item = cursor.prev;
            cursor.prev = item.prev;

            acc = fn.call(thisArg, acc, item.data, item, this);
        }

        // pop cursor
        this.releaseCursor();

        return acc;
    }
    some(fn, thisArg = this) {
        for (let cursor = this.head; cursor !== null; cursor = cursor.next) {
            if (fn.call(thisArg, cursor.data, cursor, this)) {
                return true;
            }
        }

        return false;
    }
    map(fn, thisArg = this) {
        const result = new List();

        for (let cursor = this.head; cursor !== null; cursor = cursor.next) {
            result.appendData(fn.call(thisArg, cursor.data, cursor, this));
        }

        return result;
    }
    filter(fn, thisArg = this) {
        const result = new List();

        for (let cursor = this.head; cursor !== null; cursor = cursor.next) {
            if (fn.call(thisArg, cursor.data, cursor, this)) {
                result.appendData(cursor.data);
            }
        }

        return result;
    }

    nextUntil(start, fn, thisArg = this) {
        if (start === null) {
            return;
        }

        // push cursor
        const cursor = this.allocateCursor(null, start);

        while (cursor.next !== null) {
            const item = cursor.next;
            cursor.next = item.next;
            if (fn.call(thisArg, item.data, item, this)) {
                break;
            }
        }

        // pop cursor
        this.releaseCursor();
    }
    prevUntil(start, fn, thisArg = this) {
        if (start === null) {
            return;
        }

        // push cursor
        const cursor = this.allocateCursor(start, null);

        while (cursor.prev !== null) {
            const item = cursor.prev;
            cursor.prev = item.prev;
            if (fn.call(thisArg, item.data, item, this)) {
                break;
            }
        }

        // pop cursor
        this.releaseCursor();
    }

    // mutation
    clear() {
        this.head = null;
        this.tail = null;
    }
    copy() {
        const result = new List();

        for (let data of this) {
            result.appendData(data);
        }

        return result;
    }
    prepend(item) {
        //      head
        //    ^
        // item
        this.updateCursors(null, item, this.head, item);

        // insert to the beginning of the list
        if (this.head !== null) {
            // new item <- first item
            this.head.prev = item;
            // new item -> first item
            item.next = this.head;
        } else {
            // if list has no head, then it also has no tail
            // in this case tail points to the new item
            this.tail = item;
        }

        // head always points to new item
        this.head = item;
        return this;
    }
    prependData(data) {
        return this.prepend(List.createItem(data));
    }
    append(item) {
        return this.insert(item);
    }
    appendData(data) {
        return this.insert(List.createItem(data));
    }
    insert(item, before = null) {
        if (before !== null) {
            // prev   before
            //      ^
            //     item
            this.updateCursors(before.prev, item, before, item);

            if (before.prev === null) {
                // insert to the beginning of list
                if (this.head !== before) {
                    throw new Error('before doesn\'t belong to list');
                }
                // since head points to before therefore list doesn't empty
                // no need to check tail
                this.head = item;
                before.prev = item;
                item.next = before;
                this.updateCursors(null, item);
            } else {
                // insert between two items
                before.prev.next = item;
                item.prev = before.prev;
                before.prev = item;
                item.next = before;
            }
        } else {
            // tail
            //      ^
            //      item
            this.updateCursors(this.tail, item, null, item);

            // insert to the ending of the list
            if (this.tail !== null) {
                // last item -> new item
                this.tail.next = item;
                // last item <- new item
                item.prev = this.tail;
            } else {
                // if list has no tail, then it also has no head
                // in this case head points to new item
                this.head = item;
            }

            // tail always points to new item
            this.tail = item;
        }

        return this;
    }
    insertData(data, before) {
        return this.insert(List.createItem(data), before);
    }
    remove(item) {
        //      item
        //       ^
        // prev     next
        this.updateCursors(item, item.prev, item, item.next);

        if (item.prev !== null) {
            item.prev.next = item.next;
        } else {
            if (this.head !== item) {
                throw new Error('item doesn\'t belong to list');
            }

            this.head = item.next;
        }

        if (item.next !== null) {
            item.next.prev = item.prev;
        } else {
            if (this.tail !== item) {
                throw new Error('item doesn\'t belong to list');
            }

            this.tail = item.prev;
        }

        item.prev = null;
        item.next = null;

        return item;
    }
    push(data) {
        this.insert(List.createItem(data));
    }
    pop() {
        return this.tail !== null ? this.remove(this.tail) : null;
    }
    unshift(data) {
        this.prepend(List.createItem(data));
    }
    shift() {
        return this.head !== null ? this.remove(this.head) : null;
    }
    prependList(list) {
        return this.insertList(list, this.head);
    }
    appendList(list) {
        return this.insertList(list);
    }
    insertList(list, before) {
        // ignore empty lists
        if (list.head === null) {
            return this;
        }

        if (before !== undefined && before !== null) {
            this.updateCursors(before.prev, list.tail, before, list.head);

            // insert in the middle of dist list
            if (before.prev !== null) {
                // before.prev <-> list.head
                before.prev.next = list.head;
                list.head.prev = before.prev;
            } else {
                this.head = list.head;
            }

            before.prev = list.tail;
            list.tail.next = before;
        } else {
            this.updateCursors(this.tail, list.tail, null, list.head);

            // insert to end of the list
            if (this.tail !== null) {
                // if destination list has a tail, then it also has a head,
                // but head doesn't change
                // dest tail -> source head
                this.tail.next = list.head;
                // dest tail <- source head
                list.head.prev = this.tail;
            } else {
                // if list has no a tail, then it also has no a head
                // in this case points head to new item
                this.head = list.head;
            }

            // tail always start point to new item
            this.tail = list.tail;
        }

        list.head = null;
        list.tail = null;
        return this;
    }
    replace(oldItem, newItemOrList) {
        if ('head' in newItemOrList) {
            this.insertList(newItemOrList, oldItem);
        } else {
            this.insert(newItemOrList, oldItem);
        }

        this.remove(oldItem);
    }
}

exports.List = List;

},{}],103:[function(require,module,exports){
'use strict';

const List = require('./List.cjs');

function clone(node) {
    const result = {};

    for (const key in node) {
        let value = node[key];

        if (value) {
            if (Array.isArray(value) || value instanceof List.List) {
                value = value.map(clone);
            } else if (value.constructor === Object) {
                value = clone(value);
            }
        }

        result[key] = value;
    }

    return result;
}

exports.clone = clone;

},{"./List.cjs":102}],104:[function(require,module,exports){
'use strict';

function createCustomError(name, message) {
    // use Object.create(), because some VMs prevent setting line/column otherwise
    // (iOS Safari 10 even throws an exception)
    const error = Object.create(SyntaxError.prototype);
    const errorStack = new Error();

    return Object.assign(error, {
        name,
        message,
        get stack() {
            return (errorStack.stack || '').replace(/^(.+\n){1,3}/, `${name}: ${message}\n`);
        }
    });
}

exports.createCustomError = createCustomError;

},{}],105:[function(require,module,exports){
'use strict';

const charCodeDefinitions = require('../tokenizer/char-code-definitions.cjs');
const utils = require('../tokenizer/utils.cjs');

const REVERSE_SOLIDUS = 0x005c; // U+005C REVERSE SOLIDUS (\)

function decode(str) {
    const end = str.length - 1;
    let decoded = '';

    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);

        if (code === REVERSE_SOLIDUS) {
            // special case at the ending
            if (i === end) {
                // if the next input code point is EOF, do nothing
                break;
            }

            code = str.charCodeAt(++i);

            // consume escaped
            if (charCodeDefinitions.isValidEscape(REVERSE_SOLIDUS, code)) {
                const escapeStart = i - 1;
                const escapeEnd = utils.consumeEscaped(str, escapeStart);

                i = escapeEnd - 1;
                decoded += utils.decodeEscaped(str.substring(escapeStart + 1, escapeEnd));
            } else {
                // \r\n
                if (code === 0x000d && str.charCodeAt(i + 1) === 0x000a) {
                    i++;
                }
            }
        } else {
            decoded += str[i];
        }
    }

    return decoded;
}

// https://drafts.csswg.org/cssom/#serialize-an-identifier
// § 2.1. Common Serializing Idioms
function encode(str) {
    let encoded = '';

    // If the character is the first character and is a "-" (U+002D),
    // and there is no second character, then the escaped character.
    // Note: That's means a single dash string "-" return as escaped dash,
    // so move the condition out of the main loop
    if (str.length === 1 && str.charCodeAt(0) === 0x002D) {
        return '\\-';
    }

    // To serialize an identifier means to create a string represented
    // by the concatenation of, for each character of the identifier:
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER (U+FFFD).
        if (code === 0x0000) {
            encoded += '\uFFFD';
            continue;
        }

        if (
            // If the character is in the range [\1-\1f] (U+0001 to U+001F) or is U+007F ...
            // Note: Do not compare with 0x0001 since 0x0000 is precessed before
            code <= 0x001F || code === 0x007F ||
            // [or] ... is in the range [0-9] (U+0030 to U+0039),
            (code >= 0x0030 && code <= 0x0039 && (
                // If the character is the first character ...
                i === 0 ||
                // If the character is the second character ... and the first character is a "-" (U+002D)
                i === 1 && str.charCodeAt(0) === 0x002D
            ))
        ) {
            // ... then the character escaped as code point.
            encoded += '\\' + code.toString(16) + ' ';
            continue;
        }

        // If the character is not handled by one of the above rules and is greater
        // than or equal to U+0080, is "-" (U+002D) or "_" (U+005F), or is in one
        // of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to U+005A),
        // or \[a-z] (U+0061 to U+007A), then the character itself.
        if (charCodeDefinitions.isName(code)) {
            encoded += str.charAt(i);
        } else {
            // Otherwise, the escaped character.
            encoded += '\\' + str.charAt(i);
        }
    }

    return encoded;
}

exports.decode = decode;
exports.encode = encode;

},{"../tokenizer/char-code-definitions.cjs":97,"../tokenizer/utils.cjs":101}],106:[function(require,module,exports){
'use strict';

const keywords = new Map();
const properties = new Map();
const HYPHENMINUS = 45; // '-'.charCodeAt()

const keyword = getKeywordDescriptor;
const property = getPropertyDescriptor;
const vendorPrefix = getVendorPrefix;
function isCustomProperty(str, offset) {
    offset = offset || 0;

    return str.length - offset >= 2 &&
           str.charCodeAt(offset) === HYPHENMINUS &&
           str.charCodeAt(offset + 1) === HYPHENMINUS;
}

function getVendorPrefix(str, offset) {
    offset = offset || 0;

    // verdor prefix should be at least 3 chars length
    if (str.length - offset >= 3) {
        // vendor prefix starts with hyper minus following non-hyper minus
        if (str.charCodeAt(offset) === HYPHENMINUS &&
            str.charCodeAt(offset + 1) !== HYPHENMINUS) {
            // vendor prefix should contain a hyper minus at the ending
            const secondDashIndex = str.indexOf('-', offset + 2);

            if (secondDashIndex !== -1) {
                return str.substring(offset, secondDashIndex + 1);
            }
        }
    }

    return '';
}

function getKeywordDescriptor(keyword) {
    if (keywords.has(keyword)) {
        return keywords.get(keyword);
    }

    const name = keyword.toLowerCase();
    let descriptor = keywords.get(name);

    if (descriptor === undefined) {
        const custom = isCustomProperty(name, 0);
        const vendor = !custom ? getVendorPrefix(name, 0) : '';
        descriptor = Object.freeze({
            basename: name.substr(vendor.length),
            name,
            prefix: vendor,
            vendor,
            custom
        });
    }

    keywords.set(keyword, descriptor);

    return descriptor;
}

function getPropertyDescriptor(property) {
    if (properties.has(property)) {
        return properties.get(property);
    }

    let name = property;
    let hack = property[0];

    if (hack === '/') {
        hack = property[1] === '/' ? '//' : '/';
    } else if (hack !== '_' &&
               hack !== '*' &&
               hack !== '$' &&
               hack !== '#' &&
               hack !== '+' &&
               hack !== '&') {
        hack = '';
    }

    const custom = isCustomProperty(name, hack.length);

    // re-use result when possible (the same as for lower case)
    if (!custom) {
        name = name.toLowerCase();
        if (properties.has(name)) {
            const descriptor = properties.get(name);
            properties.set(property, descriptor);
            return descriptor;
        }
    }

    const vendor = !custom ? getVendorPrefix(name, hack.length) : '';
    const prefix = name.substr(0, hack.length + vendor.length);
    const descriptor = Object.freeze({
        basename: name.substr(prefix.length),
        name: name.substr(hack.length),
        hack,
        vendor,
        prefix,
        custom
    });

    properties.set(property, descriptor);

    return descriptor;
}

exports.isCustomProperty = isCustomProperty;
exports.keyword = keyword;
exports.property = property;
exports.vendorPrefix = vendorPrefix;

},{}],107:[function(require,module,exports){
'use strict';

const charCodeDefinitions = require('../tokenizer/char-code-definitions.cjs');
const utils = require('../tokenizer/utils.cjs');

const REVERSE_SOLIDUS = 0x005c; // U+005C REVERSE SOLIDUS (\)
const QUOTATION_MARK = 0x0022;  // "
const APOSTROPHE = 0x0027;      // '

function decode(str) {
    const len = str.length;
    const firstChar = str.charCodeAt(0);
    const start = firstChar === QUOTATION_MARK || firstChar === APOSTROPHE ? 1 : 0;
    const end = start === 1 && len > 1 && str.charCodeAt(len - 1) === firstChar ? len - 2 : len - 1;
    let decoded = '';

    for (let i = start; i <= end; i++) {
        let code = str.charCodeAt(i);

        if (code === REVERSE_SOLIDUS) {
            // special case at the ending
            if (i === end) {
                // if the next input code point is EOF, do nothing
                // otherwise include last quote as escaped
                if (i !== len - 1) {
                    decoded = str.substr(i + 1);
                }
                break;
            }

            code = str.charCodeAt(++i);

            // consume escaped
            if (charCodeDefinitions.isValidEscape(REVERSE_SOLIDUS, code)) {
                const escapeStart = i - 1;
                const escapeEnd = utils.consumeEscaped(str, escapeStart);

                i = escapeEnd - 1;
                decoded += utils.decodeEscaped(str.substring(escapeStart + 1, escapeEnd));
            } else {
                // \r\n
                if (code === 0x000d && str.charCodeAt(i + 1) === 0x000a) {
                    i++;
                }
            }
        } else {
            decoded += str[i];
        }
    }

    return decoded;
}

// https://drafts.csswg.org/cssom/#serialize-a-string
// § 2.1. Common Serializing Idioms
function encode(str, apostrophe) {
    const quote = apostrophe ? '\'' : '"';
    const quoteCode = apostrophe ? APOSTROPHE : QUOTATION_MARK;
    let encoded = '';
    let wsBeforeHexIsNeeded = false;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER (U+FFFD).
        if (code === 0x0000) {
            encoded += '\uFFFD';
            continue;
        }

        // If the character is in the range [\1-\1f] (U+0001 to U+001F) or is U+007F,
        // the character escaped as code point.
        // Note: Do not compare with 0x0001 since 0x0000 is precessed before
        if (code <= 0x001f || code === 0x007F) {
            encoded += '\\' + code.toString(16);
            wsBeforeHexIsNeeded = true;
            continue;
        }

        // If the character is '"' (U+0022) or "\" (U+005C), the escaped character.
        if (code === quoteCode || code === REVERSE_SOLIDUS) {
            encoded += '\\' + str.charAt(i);
            wsBeforeHexIsNeeded = false;
        } else {
            if (wsBeforeHexIsNeeded && (charCodeDefinitions.isHexDigit(code) || charCodeDefinitions.isWhiteSpace(code))) {
                encoded += ' ';
            }

            // Otherwise, the character itself.
            encoded += str.charAt(i);
            wsBeforeHexIsNeeded = false;
        }
    }

    return quote + encoded + quote;
}

exports.decode = decode;
exports.encode = encode;

},{"../tokenizer/char-code-definitions.cjs":97,"../tokenizer/utils.cjs":101}],108:[function(require,module,exports){
'use strict';

const charCodeDefinitions = require('../tokenizer/char-code-definitions.cjs');
const utils = require('../tokenizer/utils.cjs');

const SPACE = 0x0020;            // U+0020 SPACE
const REVERSE_SOLIDUS = 0x005c;  // U+005C REVERSE SOLIDUS (\)
const QUOTATION_MARK = 0x0022;   // "
const APOSTROPHE = 0x0027;       // '
const LEFTPARENTHESIS = 0x0028;  // U+0028 LEFT PARENTHESIS (()
const RIGHTPARENTHESIS = 0x0029; // U+0029 RIGHT PARENTHESIS ())

function decode(str) {
    const len = str.length;
    let start = 4; // length of "url("
    let end = str.charCodeAt(len - 1) === RIGHTPARENTHESIS ? len - 2 : len - 1;
    let decoded = '';

    while (start < end && charCodeDefinitions.isWhiteSpace(str.charCodeAt(start))) {
        start++;
    }

    while (start < end && charCodeDefinitions.isWhiteSpace(str.charCodeAt(end))) {
        end--;
    }

    for (let i = start; i <= end; i++) {
        let code = str.charCodeAt(i);

        if (code === REVERSE_SOLIDUS) {
            // special case at the ending
            if (i === end) {
                // if the next input code point is EOF, do nothing
                // otherwise include last left parenthesis as escaped
                if (i !== len - 1) {
                    decoded = str.substr(i + 1);
                }
                break;
            }

            code = str.charCodeAt(++i);

            // consume escaped
            if (charCodeDefinitions.isValidEscape(REVERSE_SOLIDUS, code)) {
                const escapeStart = i - 1;
                const escapeEnd = utils.consumeEscaped(str, escapeStart);

                i = escapeEnd - 1;
                decoded += utils.decodeEscaped(str.substring(escapeStart + 1, escapeEnd));
            } else {
                // \r\n
                if (code === 0x000d && str.charCodeAt(i + 1) === 0x000a) {
                    i++;
                }
            }
        } else {
            decoded += str[i];
        }
    }

    return decoded;
}

function encode(str) {
    let encoded = '';
    let wsBeforeHexIsNeeded = false;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER (U+FFFD).
        if (code === 0x0000) {
            encoded += '\uFFFD';
            continue;
        }

        // If the character is in the range [\1-\1f] (U+0001 to U+001F) or is U+007F,
        // the character escaped as code point.
        // Note: Do not compare with 0x0001 since 0x0000 is precessed before
        if (code <= 0x001f || code === 0x007F) {
            encoded += '\\' + code.toString(16);
            wsBeforeHexIsNeeded = true;
            continue;
        }

        if (code === SPACE ||
            code === REVERSE_SOLIDUS ||
            code === QUOTATION_MARK ||
            code === APOSTROPHE ||
            code === LEFTPARENTHESIS ||
            code === RIGHTPARENTHESIS) {
            encoded += '\\' + str.charAt(i);
            wsBeforeHexIsNeeded = false;
        } else {
            if (wsBeforeHexIsNeeded && charCodeDefinitions.isHexDigit(code)) {
                encoded += ' ';
            }

            encoded += str.charAt(i);
            wsBeforeHexIsNeeded = false;
        }
    }

    return 'url(' + encoded + ')';
}

exports.decode = decode;
exports.encode = encode;

},{"../tokenizer/char-code-definitions.cjs":97,"../tokenizer/utils.cjs":101}],109:[function(require,module,exports){
'use strict';

const { hasOwnProperty } = Object.prototype;
const noop = function() {};

function ensureFunction(value) {
    return typeof value === 'function' ? value : noop;
}

function invokeForType(fn, type) {
    return function(node, item, list) {
        if (node.type === type) {
            fn.call(this, node, item, list);
        }
    };
}

function getWalkersFromStructure(name, nodeType) {
    const structure = nodeType.structure;
    const walkers = [];

    for (const key in structure) {
        if (hasOwnProperty.call(structure, key) === false) {
            continue;
        }

        let fieldTypes = structure[key];
        const walker = {
            name: key,
            type: false,
            nullable: false
        };

        if (!Array.isArray(fieldTypes)) {
            fieldTypes = [fieldTypes];
        }

        for (const fieldType of fieldTypes) {
            if (fieldType === null) {
                walker.nullable = true;
            } else if (typeof fieldType === 'string') {
                walker.type = 'node';
            } else if (Array.isArray(fieldType)) {
                walker.type = 'list';
            }
        }

        if (walker.type) {
            walkers.push(walker);
        }
    }

    if (walkers.length) {
        return {
            context: nodeType.walkContext,
            fields: walkers
        };
    }

    return null;
}

function getTypesFromConfig(config) {
    const types = {};

    for (const name in config.node) {
        if (hasOwnProperty.call(config.node, name)) {
            const nodeType = config.node[name];

            if (!nodeType.structure) {
                throw new Error('Missed `structure` field in `' + name + '` node type definition');
            }

            types[name] = getWalkersFromStructure(name, nodeType);
        }
    }

    return types;
}

function createTypeIterator(config, reverse) {
    const fields = config.fields.slice();
    const contextName = config.context;
    const useContext = typeof contextName === 'string';

    if (reverse) {
        fields.reverse();
    }

    return function(node, context, walk, walkReducer) {
        let prevContextValue;

        if (useContext) {
            prevContextValue = context[contextName];
            context[contextName] = node;
        }

        for (const field of fields) {
            const ref = node[field.name];

            if (!field.nullable || ref) {
                if (field.type === 'list') {
                    const breakWalk = reverse
                        ? ref.reduceRight(walkReducer, false)
                        : ref.reduce(walkReducer, false);

                    if (breakWalk) {
                        return true;
                    }
                } else if (walk(ref)) {
                    return true;
                }
            }
        }

        if (useContext) {
            context[contextName] = prevContextValue;
        }
    };
}

function createFastTraveralMap({
    StyleSheet,
    Atrule,
    Rule,
    Block,
    DeclarationList
}) {
    return {
        Atrule: {
            StyleSheet,
            Atrule,
            Rule,
            Block
        },
        Rule: {
            StyleSheet,
            Atrule,
            Rule,
            Block
        },
        Declaration: {
            StyleSheet,
            Atrule,
            Rule,
            Block,
            DeclarationList
        }
    };
}

function createWalker(config) {
    const types = getTypesFromConfig(config);
    const iteratorsNatural = {};
    const iteratorsReverse = {};
    const breakWalk = Symbol('break-walk');
    const skipNode = Symbol('skip-node');

    for (const name in types) {
        if (hasOwnProperty.call(types, name) && types[name] !== null) {
            iteratorsNatural[name] = createTypeIterator(types[name], false);
            iteratorsReverse[name] = createTypeIterator(types[name], true);
        }
    }

    const fastTraversalIteratorsNatural = createFastTraveralMap(iteratorsNatural);
    const fastTraversalIteratorsReverse = createFastTraveralMap(iteratorsReverse);

    const walk = function(root, options) {
        function walkNode(node, item, list) {
            const enterRet = enter.call(context, node, item, list);

            if (enterRet === breakWalk) {
                return true;
            }

            if (enterRet === skipNode) {
                return false;
            }

            if (iterators.hasOwnProperty(node.type)) {
                if (iterators[node.type](node, context, walkNode, walkReducer)) {
                    return true;
                }
            }

            if (leave.call(context, node, item, list) === breakWalk) {
                return true;
            }

            return false;
        }

        let enter = noop;
        let leave = noop;
        let iterators = iteratorsNatural;
        let walkReducer = (ret, data, item, list) => ret || walkNode(data, item, list);
        const context = {
            break: breakWalk,
            skip: skipNode,

            root,
            stylesheet: null,
            atrule: null,
            atrulePrelude: null,
            rule: null,
            selector: null,
            block: null,
            declaration: null,
            function: null
        };

        if (typeof options === 'function') {
            enter = options;
        } else if (options) {
            enter = ensureFunction(options.enter);
            leave = ensureFunction(options.leave);

            if (options.reverse) {
                iterators = iteratorsReverse;
            }

            if (options.visit) {
                if (fastTraversalIteratorsNatural.hasOwnProperty(options.visit)) {
                    iterators = options.reverse
                        ? fastTraversalIteratorsReverse[options.visit]
                        : fastTraversalIteratorsNatural[options.visit];
                } else if (!types.hasOwnProperty(options.visit)) {
                    throw new Error('Bad value `' + options.visit + '` for `visit` option (should be: ' + Object.keys(types).sort().join(', ') + ')');
                }

                enter = invokeForType(enter, options.visit);
                leave = invokeForType(leave, options.visit);
            }
        }

        if (enter === noop && leave === noop) {
            throw new Error('Neither `enter` nor `leave` walker handler is set or both aren\'t a function');
        }

        walkNode(root);
    };

    walk.break = breakWalk;
    walk.skip = skipNode;

    walk.find = function(ast, fn) {
        let found = null;

        walk(ast, function(node, item, list) {
            if (fn.call(this, node, item, list)) {
                found = node;
                return breakWalk;
            }
        });

        return found;
    };

    walk.findLast = function(ast, fn) {
        let found = null;

        walk(ast, {
            reverse: true,
            enter(node, item, list) {
                if (fn.call(this, node, item, list)) {
                    found = node;
                    return breakWalk;
                }
            }
        });

        return found;
    };

    walk.findAll = function(ast, fn) {
        const found = [];

        walk(ast, function(node, item, list) {
            if (fn.call(this, node, item, list)) {
                found.push(node);
            }
        });

        return found;
    };

    return walk;
}

exports.createWalker = createWalker;

},{}],110:[function(require,module,exports){
module.exports = {
    "generic": true,
    "units": {
        "angle": [
            "deg",
            "grad",
            "rad",
            "turn"
        ],
        "decibel": [
            "db"
        ],
        "flex": [
            "fr"
        ],
        "frequency": [
            "hz",
            "khz"
        ],
        "length": [
            "cm",
            "mm",
            "q",
            "in",
            "pt",
            "pc",
            "px",
            "em",
            "rem",
            "ex",
            "rex",
            "cap",
            "rcap",
            "ch",
            "rch",
            "ic",
            "ric",
            "lh",
            "rlh",
            "vw",
            "svw",
            "lvw",
            "dvw",
            "vh",
            "svh",
            "lvh",
            "dvh",
            "vi",
            "svi",
            "lvi",
            "dvi",
            "vb",
            "svb",
            "lvb",
            "dvb",
            "vmin",
            "svmin",
            "lvmin",
            "dvmin",
            "vmax",
            "svmax",
            "lvmax",
            "dvmax",
            "cqw",
            "cqh",
            "cqi",
            "cqb",
            "cqmin",
            "cqmax"
        ],
        "resolution": [
            "dpi",
            "dpcm",
            "dppx",
            "x"
        ],
        "semitones": [
            "st"
        ],
        "time": [
            "s",
            "ms"
        ]
    },
    "types": {
        "abs()": "abs( <calc-sum> )",
        "absolute-size": "xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large",
        "acos()": "acos( <calc-sum> )",
        "alpha-value": "<number>|<percentage>",
        "angle-percentage": "<angle>|<percentage>",
        "angular-color-hint": "<angle-percentage>",
        "angular-color-stop": "<color>&&<color-stop-angle>?",
        "angular-color-stop-list": "[<angular-color-stop> [, <angular-color-hint>]?]# , <angular-color-stop>",
        "animateable-feature": "scroll-position|contents|<custom-ident>",
        "asin()": "asin( <calc-sum> )",
        "atan()": "atan( <calc-sum> )",
        "atan2()": "atan2( <calc-sum> , <calc-sum> )",
        "attachment": "scroll|fixed|local",
        "attr()": "attr( <attr-name> <type-or-unit>? [, <attr-fallback>]? )",
        "attr-matcher": "['~'|'|'|'^'|'$'|'*']? '='",
        "attr-modifier": "i|s",
        "attribute-selector": "'[' <wq-name> ']'|'[' <wq-name> <attr-matcher> [<string-token>|<ident-token>] <attr-modifier>? ']'",
        "auto-repeat": "repeat( [auto-fill|auto-fit] , [<line-names>? <fixed-size>]+ <line-names>? )",
        "auto-track-list": "[<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>? <auto-repeat> [<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>?",
        "axis": "block|inline|vertical|horizontal",
        "baseline-position": "[first|last]? baseline",
        "basic-shape": "<inset()>|<circle()>|<ellipse()>|<polygon()>|<path()>",
        "bg-image": "none|<image>",
        "bg-layer": "<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>",
        "bg-position": "[[left|center|right|top|bottom|<length-percentage>]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]|[center|[left|right] <length-percentage>?]&&[center|[top|bottom] <length-percentage>?]]",
        "bg-size": "[<length-percentage>|auto]{1,2}|cover|contain",
        "blur()": "blur( <length> )",
        "blend-mode": "normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity",
        "box": "border-box|padding-box|content-box",
        "brightness()": "brightness( <number-percentage> )",
        "calc()": "calc( <calc-sum> )",
        "calc-sum": "<calc-product> [['+'|'-'] <calc-product>]*",
        "calc-product": "<calc-value> ['*' <calc-value>|'/' <number>]*",
        "calc-value": "<number>|<dimension>|<percentage>|<calc-constant>|( <calc-sum> )",
        "calc-constant": "e|pi|infinity|-infinity|NaN",
        "cf-final-image": "<image>|<color>",
        "cf-mixing-image": "<percentage>?&&<image>",
        "circle()": "circle( [<shape-radius>]? [at <position>]? )",
        "clamp()": "clamp( <calc-sum>#{3} )",
        "class-selector": "'.' <ident-token>",
        "clip-source": "<url>",
        "color": "<rgb()>|<rgba()>|<hsl()>|<hsla()>|<hwb()>|<lab()>|<lch()>|<hex-color>|<named-color>|currentcolor|<deprecated-system-color>",
        "color-stop": "<color-stop-length>|<color-stop-angle>",
        "color-stop-angle": "<angle-percentage>{1,2}",
        "color-stop-length": "<length-percentage>{1,2}",
        "color-stop-list": "[<linear-color-stop> [, <linear-color-hint>]?]# , <linear-color-stop>",
        "combinator": "'>'|'+'|'~'|['||']",
        "common-lig-values": "[common-ligatures|no-common-ligatures]",
        "compat-auto": "searchfield|textarea|push-button|slider-horizontal|checkbox|radio|square-button|menulist|listbox|meter|progress-bar|button",
        "composite-style": "clear|copy|source-over|source-in|source-out|source-atop|destination-over|destination-in|destination-out|destination-atop|xor",
        "compositing-operator": "add|subtract|intersect|exclude",
        "compound-selector": "[<type-selector>? <subclass-selector>* [<pseudo-element-selector> <pseudo-class-selector>*]*]!",
        "compound-selector-list": "<compound-selector>#",
        "complex-selector": "<compound-selector> [<combinator>? <compound-selector>]*",
        "complex-selector-list": "<complex-selector>#",
        "conic-gradient()": "conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )",
        "contextual-alt-values": "[contextual|no-contextual]",
        "content-distribution": "space-between|space-around|space-evenly|stretch",
        "content-list": "[<string>|contents|<image>|<counter>|<quote>|<target>|<leader()>|<attr()>]+",
        "content-position": "center|start|end|flex-start|flex-end",
        "content-replacement": "<image>",
        "contrast()": "contrast( [<number-percentage>] )",
        "cos()": "cos( <calc-sum> )",
        "counter": "<counter()>|<counters()>",
        "counter()": "counter( <counter-name> , <counter-style>? )",
        "counter-name": "<custom-ident>",
        "counter-style": "<counter-style-name>|symbols( )",
        "counter-style-name": "<custom-ident>",
        "counters()": "counters( <counter-name> , <string> , <counter-style>? )",
        "cross-fade()": "cross-fade( <cf-mixing-image> , <cf-final-image>? )",
        "cubic-bezier-timing-function": "ease|ease-in|ease-out|ease-in-out|cubic-bezier( <number [0,1]> , <number> , <number [0,1]> , <number> )",
        "deprecated-system-color": "ActiveBorder|ActiveCaption|AppWorkspace|Background|ButtonFace|ButtonHighlight|ButtonShadow|ButtonText|CaptionText|GrayText|Highlight|HighlightText|InactiveBorder|InactiveCaption|InactiveCaptionText|InfoBackground|InfoText|Menu|MenuText|Scrollbar|ThreeDDarkShadow|ThreeDFace|ThreeDHighlight|ThreeDLightShadow|ThreeDShadow|Window|WindowFrame|WindowText",
        "discretionary-lig-values": "[discretionary-ligatures|no-discretionary-ligatures]",
        "display-box": "contents|none",
        "display-inside": "flow|flow-root|table|flex|grid|ruby",
        "display-internal": "table-row-group|table-header-group|table-footer-group|table-row|table-cell|table-column-group|table-column|table-caption|ruby-base|ruby-text|ruby-base-container|ruby-text-container",
        "display-legacy": "inline-block|inline-list-item|inline-table|inline-flex|inline-grid",
        "display-listitem": "<display-outside>?&&[flow|flow-root]?&&list-item",
        "display-outside": "block|inline|run-in",
        "drop-shadow()": "drop-shadow( <length>{2,3} <color>? )",
        "east-asian-variant-values": "[jis78|jis83|jis90|jis04|simplified|traditional]",
        "east-asian-width-values": "[full-width|proportional-width]",
        "element()": "element( <custom-ident> , [first|start|last|first-except]? )|element( <id-selector> )",
        "ellipse()": "ellipse( [<shape-radius>{2}]? [at <position>]? )",
        "ending-shape": "circle|ellipse",
        "env()": "env( <custom-ident> , <declaration-value>? )",
        "exp()": "exp( <calc-sum> )",
        "explicit-track-list": "[<line-names>? <track-size>]+ <line-names>?",
        "family-name": "<string>|<custom-ident>+",
        "feature-tag-value": "<string> [<integer>|on|off]?",
        "feature-type": "@stylistic|@historical-forms|@styleset|@character-variant|@swash|@ornaments|@annotation",
        "feature-value-block": "<feature-type> '{' <feature-value-declaration-list> '}'",
        "feature-value-block-list": "<feature-value-block>+",
        "feature-value-declaration": "<custom-ident> : <integer>+ ;",
        "feature-value-declaration-list": "<feature-value-declaration>",
        "feature-value-name": "<custom-ident>",
        "fill-rule": "nonzero|evenodd",
        "filter-function": "<blur()>|<brightness()>|<contrast()>|<drop-shadow()>|<grayscale()>|<hue-rotate()>|<invert()>|<opacity()>|<saturate()>|<sepia()>",
        "filter-function-list": "[<filter-function>|<url>]+",
        "final-bg-layer": "<'background-color'>||<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>",
        "fixed-breadth": "<length-percentage>",
        "fixed-repeat": "repeat( [<integer [1,∞]>] , [<line-names>? <fixed-size>]+ <line-names>? )",
        "fixed-size": "<fixed-breadth>|minmax( <fixed-breadth> , <track-breadth> )|minmax( <inflexible-breadth> , <fixed-breadth> )",
        "font-stretch-absolute": "normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|<percentage>",
        "font-variant-css21": "[normal|small-caps]",
        "font-weight-absolute": "normal|bold|<number [1,1000]>",
        "frequency-percentage": "<frequency>|<percentage>",
        "general-enclosed": "[<function-token> <any-value> )]|( <ident> <any-value> )",
        "generic-family": "serif|sans-serif|cursive|fantasy|monospace|-apple-system",
        "generic-name": "serif|sans-serif|cursive|fantasy|monospace",
        "geometry-box": "<shape-box>|fill-box|stroke-box|view-box",
        "gradient": "<linear-gradient()>|<repeating-linear-gradient()>|<radial-gradient()>|<repeating-radial-gradient()>|<conic-gradient()>|<repeating-conic-gradient()>|<-legacy-gradient>",
        "grayscale()": "grayscale( <number-percentage> )",
        "grid-line": "auto|<custom-ident>|[<integer>&&<custom-ident>?]|[span&&[<integer>||<custom-ident>]]",
        "historical-lig-values": "[historical-ligatures|no-historical-ligatures]",
        "hsl()": "hsl( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsl( <hue> , <percentage> , <percentage> , <alpha-value>? )",
        "hsla()": "hsla( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsla( <hue> , <percentage> , <percentage> , <alpha-value>? )",
        "hue": "<number>|<angle>",
        "hue-rotate()": "hue-rotate( <angle> )",
        "hwb()": "hwb( [<hue>|none] [<percentage>|none] [<percentage>|none] [/ [<alpha-value>|none]]? )",
        "hypot()": "hypot( <calc-sum># )",
        "image": "<url>|<image()>|<image-set()>|<element()>|<paint()>|<cross-fade()>|<gradient>",
        "image()": "image( <image-tags>? [<image-src>? , <color>?]! )",
        "image-set()": "image-set( <image-set-option># )",
        "image-set-option": "[<image>|<string>] [<resolution>||type( <string> )]",
        "image-src": "<url>|<string>",
        "image-tags": "ltr|rtl",
        "inflexible-breadth": "<length-percentage>|min-content|max-content|auto",
        "inset()": "inset( <length-percentage>{1,4} [round <'border-radius'>]? )",
        "invert()": "invert( <number-percentage> )",
        "keyframes-name": "<custom-ident>|<string>",
        "keyframe-block": "<keyframe-selector># { <declaration-list> }",
        "keyframe-block-list": "<keyframe-block>+",
        "keyframe-selector": "from|to|<percentage>",
        "lab()": "lab( [<percentage>|<number>|none] [<percentage>|<number>|none] [<percentage>|<number>|none] [/ [<alpha-value>|none]]? )",
        "layer()": "layer( <layer-name> )",
        "layer-name": "<ident> ['.' <ident>]*",
        "lch()": "lch( [<percentage>|<number>|none] [<percentage>|<number>|none] [<hue>|none] [/ [<alpha-value>|none]]? )",
        "leader()": "leader( <leader-type> )",
        "leader-type": "dotted|solid|space|<string>",
        "length-percentage": "<length>|<percentage>",
        "line-names": "'[' <custom-ident>* ']'",
        "line-name-list": "[<line-names>|<name-repeat>]+",
        "line-style": "none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset",
        "line-width": "<length>|thin|medium|thick",
        "linear-color-hint": "<length-percentage>",
        "linear-color-stop": "<color> <color-stop-length>?",
        "linear-gradient()": "linear-gradient( [<angle>|to <side-or-corner>]? , <color-stop-list> )",
        "log()": "log( <calc-sum> , <calc-sum>? )",
        "mask-layer": "<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||<geometry-box>||[<geometry-box>|no-clip]||<compositing-operator>||<masking-mode>",
        "mask-position": "[<length-percentage>|left|center|right] [<length-percentage>|top|center|bottom]?",
        "mask-reference": "none|<image>|<mask-source>",
        "mask-source": "<url>",
        "masking-mode": "alpha|luminance|match-source",
        "matrix()": "matrix( <number>#{6} )",
        "matrix3d()": "matrix3d( <number>#{16} )",
        "max()": "max( <calc-sum># )",
        "media-and": "<media-in-parens> [and <media-in-parens>]+",
        "media-condition": "<media-not>|<media-and>|<media-or>|<media-in-parens>",
        "media-condition-without-or": "<media-not>|<media-and>|<media-in-parens>",
        "media-feature": "( [<mf-plain>|<mf-boolean>|<mf-range>] )",
        "media-in-parens": "( <media-condition> )|<media-feature>|<general-enclosed>",
        "media-not": "not <media-in-parens>",
        "media-or": "<media-in-parens> [or <media-in-parens>]+",
        "media-query": "<media-condition>|[not|only]? <media-type> [and <media-condition-without-or>]?",
        "media-query-list": "<media-query>#",
        "media-type": "<ident>",
        "mf-boolean": "<mf-name>",
        "mf-name": "<ident>",
        "mf-plain": "<mf-name> : <mf-value>",
        "mf-range": "<mf-name> ['<'|'>']? '='? <mf-value>|<mf-value> ['<'|'>']? '='? <mf-name>|<mf-value> '<' '='? <mf-name> '<' '='? <mf-value>|<mf-value> '>' '='? <mf-name> '>' '='? <mf-value>",
        "mf-value": "<number>|<dimension>|<ident>|<ratio>",
        "min()": "min( <calc-sum># )",
        "minmax()": "minmax( [<length-percentage>|min-content|max-content|auto] , [<length-percentage>|<flex>|min-content|max-content|auto] )",
        "mod()": "mod( <calc-sum> , <calc-sum> )",
        "name-repeat": "repeat( [<integer [1,∞]>|auto-fill] , <line-names>+ )",
        "named-color": "transparent|aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen|<-non-standard-color>",
        "namespace-prefix": "<ident>",
        "ns-prefix": "[<ident-token>|'*']? '|'",
        "number-percentage": "<number>|<percentage>",
        "numeric-figure-values": "[lining-nums|oldstyle-nums]",
        "numeric-fraction-values": "[diagonal-fractions|stacked-fractions]",
        "numeric-spacing-values": "[proportional-nums|tabular-nums]",
        "nth": "<an-plus-b>|even|odd",
        "opacity()": "opacity( [<number-percentage>] )",
        "overflow-position": "unsafe|safe",
        "outline-radius": "<length>|<percentage>",
        "page-body": "<declaration>? [; <page-body>]?|<page-margin-box> <page-body>",
        "page-margin-box": "<page-margin-box-type> '{' <declaration-list> '}'",
        "page-margin-box-type": "@top-left-corner|@top-left|@top-center|@top-right|@top-right-corner|@bottom-left-corner|@bottom-left|@bottom-center|@bottom-right|@bottom-right-corner|@left-top|@left-middle|@left-bottom|@right-top|@right-middle|@right-bottom",
        "page-selector-list": "[<page-selector>#]?",
        "page-selector": "<pseudo-page>+|<ident> <pseudo-page>*",
        "page-size": "A5|A4|A3|B5|B4|JIS-B5|JIS-B4|letter|legal|ledger",
        "path()": "path( [<fill-rule> ,]? <string> )",
        "paint()": "paint( <ident> , <declaration-value>? )",
        "perspective()": "perspective( [<length [0,∞]>|none] )",
        "polygon()": "polygon( <fill-rule>? , [<length-percentage> <length-percentage>]# )",
        "position": "[[left|center|right]||[top|center|bottom]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]?|[[left|right] <length-percentage>]&&[[top|bottom] <length-percentage>]]",
        "pow()": "pow( <calc-sum> , <calc-sum> )",
        "pseudo-class-selector": "':' <ident-token>|':' <function-token> <any-value> ')'",
        "pseudo-element-selector": "':' <pseudo-class-selector>",
        "pseudo-page": ": [left|right|first|blank]",
        "quote": "open-quote|close-quote|no-open-quote|no-close-quote",
        "radial-gradient()": "radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )",
        "ratio": "<number [0,∞]> [/ <number [0,∞]>]?",
        "relative-selector": "<combinator>? <complex-selector>",
        "relative-selector-list": "<relative-selector>#",
        "relative-size": "larger|smaller",
        "rem()": "rem( <calc-sum> , <calc-sum> )",
        "repeat-style": "repeat-x|repeat-y|[repeat|space|round|no-repeat]{1,2}",
        "repeating-conic-gradient()": "repeating-conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )",
        "repeating-linear-gradient()": "repeating-linear-gradient( [<angle>|to <side-or-corner>]? , <color-stop-list> )",
        "repeating-radial-gradient()": "repeating-radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )",
        "reversed-counter-name": "reversed( <counter-name> )",
        "rgb()": "rgb( <percentage>{3} [/ <alpha-value>]? )|rgb( <number>{3} [/ <alpha-value>]? )|rgb( <percentage>#{3} , <alpha-value>? )|rgb( <number>#{3} , <alpha-value>? )",
        "rgba()": "rgba( <percentage>{3} [/ <alpha-value>]? )|rgba( <number>{3} [/ <alpha-value>]? )|rgba( <percentage>#{3} , <alpha-value>? )|rgba( <number>#{3} , <alpha-value>? )",
        "rotate()": "rotate( [<angle>|<zero>] )",
        "rotate3d()": "rotate3d( <number> , <number> , <number> , [<angle>|<zero>] )",
        "rotateX()": "rotateX( [<angle>|<zero>] )",
        "rotateY()": "rotateY( [<angle>|<zero>] )",
        "rotateZ()": "rotateZ( [<angle>|<zero>] )",
        "round()": "round( <rounding-strategy>? , <calc-sum> , <calc-sum> )",
        "rounding-strategy": "nearest|up|down|to-zero",
        "saturate()": "saturate( <number-percentage> )",
        "scale()": "scale( [<number>|<percentage>]#{1,2} )",
        "scale3d()": "scale3d( [<number>|<percentage>]#{3} )",
        "scaleX()": "scaleX( [<number>|<percentage>] )",
        "scaleY()": "scaleY( [<number>|<percentage>] )",
        "scaleZ()": "scaleZ( [<number>|<percentage>] )",
        "scroller": "root|nearest",
        "self-position": "center|start|end|self-start|self-end|flex-start|flex-end",
        "shape-radius": "<length-percentage>|closest-side|farthest-side",
        "sign()": "sign( <calc-sum> )",
        "skew()": "skew( [<angle>|<zero>] , [<angle>|<zero>]? )",
        "skewX()": "skewX( [<angle>|<zero>] )",
        "skewY()": "skewY( [<angle>|<zero>] )",
        "sepia()": "sepia( <number-percentage> )",
        "shadow": "inset?&&<length>{2,4}&&<color>?",
        "shadow-t": "[<length>{2,3}&&<color>?]",
        "shape": "rect( <top> , <right> , <bottom> , <left> )|rect( <top> <right> <bottom> <left> )",
        "shape-box": "<box>|margin-box",
        "side-or-corner": "[left|right]||[top|bottom]",
        "sin()": "sin( <calc-sum> )",
        "single-animation": "<time>||<easing-function>||<time>||<single-animation-iteration-count>||<single-animation-direction>||<single-animation-fill-mode>||<single-animation-play-state>||[none|<keyframes-name>]",
        "single-animation-direction": "normal|reverse|alternate|alternate-reverse",
        "single-animation-fill-mode": "none|forwards|backwards|both",
        "single-animation-iteration-count": "infinite|<number>",
        "single-animation-play-state": "running|paused",
        "single-animation-timeline": "auto|none|<timeline-name>|scroll( <axis>? <scroller>? )",
        "single-transition": "[none|<single-transition-property>]||<time>||<easing-function>||<time>",
        "single-transition-property": "all|<custom-ident>",
        "size": "closest-side|farthest-side|closest-corner|farthest-corner|<length>|<length-percentage>{2}",
        "sqrt()": "sqrt( <calc-sum> )",
        "step-position": "jump-start|jump-end|jump-none|jump-both|start|end",
        "step-timing-function": "step-start|step-end|steps( <integer> [, <step-position>]? )",
        "subclass-selector": "<id-selector>|<class-selector>|<attribute-selector>|<pseudo-class-selector>",
        "supports-condition": "not <supports-in-parens>|<supports-in-parens> [and <supports-in-parens>]*|<supports-in-parens> [or <supports-in-parens>]*",
        "supports-in-parens": "( <supports-condition> )|<supports-feature>|<general-enclosed>",
        "supports-feature": "<supports-decl>|<supports-selector-fn>",
        "supports-decl": "( <declaration> )",
        "supports-selector-fn": "selector( <complex-selector> )",
        "symbol": "<string>|<image>|<custom-ident>",
        "tan()": "tan( <calc-sum> )",
        "target": "<target-counter()>|<target-counters()>|<target-text()>",
        "target-counter()": "target-counter( [<string>|<url>] , <custom-ident> , <counter-style>? )",
        "target-counters()": "target-counters( [<string>|<url>] , <custom-ident> , <string> , <counter-style>? )",
        "target-text()": "target-text( [<string>|<url>] , [content|before|after|first-letter]? )",
        "time-percentage": "<time>|<percentage>",
        "timeline-name": "<custom-ident>|<string>",
        "easing-function": "linear|<cubic-bezier-timing-function>|<step-timing-function>",
        "track-breadth": "<length-percentage>|<flex>|min-content|max-content|auto",
        "track-list": "[<line-names>? [<track-size>|<track-repeat>]]+ <line-names>?",
        "track-repeat": "repeat( [<integer [1,∞]>] , [<line-names>? <track-size>]+ <line-names>? )",
        "track-size": "<track-breadth>|minmax( <inflexible-breadth> , <track-breadth> )|fit-content( <length-percentage> )",
        "transform-function": "<matrix()>|<translate()>|<translateX()>|<translateY()>|<scale()>|<scaleX()>|<scaleY()>|<rotate()>|<skew()>|<skewX()>|<skewY()>|<matrix3d()>|<translate3d()>|<translateZ()>|<scale3d()>|<scaleZ()>|<rotate3d()>|<rotateX()>|<rotateY()>|<rotateZ()>|<perspective()>",
        "transform-list": "<transform-function>+",
        "translate()": "translate( <length-percentage> , <length-percentage>? )",
        "translate3d()": "translate3d( <length-percentage> , <length-percentage> , <length> )",
        "translateX()": "translateX( <length-percentage> )",
        "translateY()": "translateY( <length-percentage> )",
        "translateZ()": "translateZ( <length> )",
        "type-or-unit": "string|color|url|integer|number|length|angle|time|frequency|cap|ch|em|ex|ic|lh|rlh|rem|vb|vi|vw|vh|vmin|vmax|mm|Q|cm|in|pt|pc|px|deg|grad|rad|turn|ms|s|Hz|kHz|%",
        "type-selector": "<wq-name>|<ns-prefix>? '*'",
        "var()": "var( <custom-property-name> , <declaration-value>? )",
        "viewport-length": "auto|<length-percentage>",
        "visual-box": "content-box|padding-box|border-box",
        "wq-name": "<ns-prefix>? <ident-token>",
        "-legacy-gradient": "<-webkit-gradient()>|<-legacy-linear-gradient>|<-legacy-repeating-linear-gradient>|<-legacy-radial-gradient>|<-legacy-repeating-radial-gradient>",
        "-legacy-linear-gradient": "-moz-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-linear-gradient( <-legacy-linear-gradient-arguments> )",
        "-legacy-repeating-linear-gradient": "-moz-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )",
        "-legacy-linear-gradient-arguments": "[<angle>|<side-or-corner>]? , <color-stop-list>",
        "-legacy-radial-gradient": "-moz-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-radial-gradient( <-legacy-radial-gradient-arguments> )",
        "-legacy-repeating-radial-gradient": "-moz-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )",
        "-legacy-radial-gradient-arguments": "[<position> ,]? [[[<-legacy-radial-gradient-shape>||<-legacy-radial-gradient-size>]|[<length>|<percentage>]{2}] ,]? <color-stop-list>",
        "-legacy-radial-gradient-size": "closest-side|closest-corner|farthest-side|farthest-corner|contain|cover",
        "-legacy-radial-gradient-shape": "circle|ellipse",
        "-non-standard-font": "-apple-system-body|-apple-system-headline|-apple-system-subheadline|-apple-system-caption1|-apple-system-caption2|-apple-system-footnote|-apple-system-short-body|-apple-system-short-headline|-apple-system-short-subheadline|-apple-system-short-caption1|-apple-system-short-footnote|-apple-system-tall-body",
        "-non-standard-color": "-moz-ButtonDefault|-moz-ButtonHoverFace|-moz-ButtonHoverText|-moz-CellHighlight|-moz-CellHighlightText|-moz-Combobox|-moz-ComboboxText|-moz-Dialog|-moz-DialogText|-moz-dragtargetzone|-moz-EvenTreeRow|-moz-Field|-moz-FieldText|-moz-html-CellHighlight|-moz-html-CellHighlightText|-moz-mac-accentdarkestshadow|-moz-mac-accentdarkshadow|-moz-mac-accentface|-moz-mac-accentlightesthighlight|-moz-mac-accentlightshadow|-moz-mac-accentregularhighlight|-moz-mac-accentregularshadow|-moz-mac-chrome-active|-moz-mac-chrome-inactive|-moz-mac-focusring|-moz-mac-menuselect|-moz-mac-menushadow|-moz-mac-menutextselect|-moz-MenuHover|-moz-MenuHoverText|-moz-MenuBarText|-moz-MenuBarHoverText|-moz-nativehyperlinktext|-moz-OddTreeRow|-moz-win-communicationstext|-moz-win-mediatext|-moz-activehyperlinktext|-moz-default-background-color|-moz-default-color|-moz-hyperlinktext|-moz-visitedhyperlinktext|-webkit-activelink|-webkit-focus-ring-color|-webkit-link|-webkit-text",
        "-non-standard-image-rendering": "optimize-contrast|-moz-crisp-edges|-o-crisp-edges|-webkit-optimize-contrast",
        "-non-standard-overflow": "-moz-scrollbars-none|-moz-scrollbars-horizontal|-moz-scrollbars-vertical|-moz-hidden-unscrollable",
        "-non-standard-width": "fill-available|min-intrinsic|intrinsic|-moz-available|-moz-fit-content|-moz-min-content|-moz-max-content|-webkit-min-content|-webkit-max-content",
        "-webkit-gradient()": "-webkit-gradient( <-webkit-gradient-type> , <-webkit-gradient-point> [, <-webkit-gradient-point>|, <-webkit-gradient-radius> , <-webkit-gradient-point>] [, <-webkit-gradient-radius>]? [, <-webkit-gradient-color-stop>]* )",
        "-webkit-gradient-color-stop": "from( <color> )|color-stop( [<number-zero-one>|<percentage>] , <color> )|to( <color> )",
        "-webkit-gradient-point": "[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]",
        "-webkit-gradient-radius": "<length>|<percentage>",
        "-webkit-gradient-type": "linear|radial",
        "-webkit-mask-box-repeat": "repeat|stretch|round",
        "-webkit-mask-clip-style": "border|border-box|padding|padding-box|content|content-box|text",
        "-ms-filter-function-list": "<-ms-filter-function>+",
        "-ms-filter-function": "<-ms-filter-function-progid>|<-ms-filter-function-legacy>",
        "-ms-filter-function-progid": "'progid:' [<ident-token> '.']* [<ident-token>|<function-token> <any-value>? )]",
        "-ms-filter-function-legacy": "<ident-token>|<function-token> <any-value>? )",
        "-ms-filter": "<string>",
        "age": "child|young|old",
        "attr-name": "<wq-name>",
        "attr-fallback": "<any-value>",
        "bg-clip": "<box>|border|text",
        "bottom": "<length>|auto",
        "generic-voice": "[<age>? <gender> <integer>?]",
        "gender": "male|female|neutral",
        "left": "<length>|auto",
        "mask-image": "<mask-reference>#",
        "paint": "none|<color>|<url> [none|<color>]?|context-fill|context-stroke",
        "right": "<length>|auto",
        "scroll-timeline-axis": "block|inline|vertical|horizontal",
        "scroll-timeline-name": "none|<custom-ident>",
        "single-animation-composition": "replace|add|accumulate",
        "svg-length": "<percentage>|<length>|<number>",
        "svg-writing-mode": "lr-tb|rl-tb|tb-rl|lr|rl|tb",
        "top": "<length>|auto",
        "x": "<number>",
        "y": "<number>",
        "declaration": "<ident-token> : <declaration-value>? ['!' important]?",
        "declaration-list": "[<declaration>? ';']* <declaration>?",
        "url": "url( <string> <url-modifier>* )|<url-token>",
        "url-modifier": "<ident>|<function-token> <any-value> )",
        "number-zero-one": "<number [0,1]>",
        "number-one-or-greater": "<number [1,∞]>",
        "-non-standard-display": "-ms-inline-flexbox|-ms-grid|-ms-inline-grid|-webkit-flex|-webkit-inline-flex|-webkit-box|-webkit-inline-box|-moz-inline-stack|-moz-box|-moz-inline-box"
    },
    "properties": {
        "--*": "<declaration-value>",
        "-ms-accelerator": "false|true",
        "-ms-block-progression": "tb|rl|bt|lr",
        "-ms-content-zoom-chaining": "none|chained",
        "-ms-content-zooming": "none|zoom",
        "-ms-content-zoom-limit": "<'-ms-content-zoom-limit-min'> <'-ms-content-zoom-limit-max'>",
        "-ms-content-zoom-limit-max": "<percentage>",
        "-ms-content-zoom-limit-min": "<percentage>",
        "-ms-content-zoom-snap": "<'-ms-content-zoom-snap-type'>||<'-ms-content-zoom-snap-points'>",
        "-ms-content-zoom-snap-points": "snapInterval( <percentage> , <percentage> )|snapList( <percentage># )",
        "-ms-content-zoom-snap-type": "none|proximity|mandatory",
        "-ms-filter": "<string>",
        "-ms-flow-from": "[none|<custom-ident>]#",
        "-ms-flow-into": "[none|<custom-ident>]#",
        "-ms-grid-columns": "none|<track-list>|<auto-track-list>",
        "-ms-grid-rows": "none|<track-list>|<auto-track-list>",
        "-ms-high-contrast-adjust": "auto|none",
        "-ms-hyphenate-limit-chars": "auto|<integer>{1,3}",
        "-ms-hyphenate-limit-lines": "no-limit|<integer>",
        "-ms-hyphenate-limit-zone": "<percentage>|<length>",
        "-ms-ime-align": "auto|after",
        "-ms-overflow-style": "auto|none|scrollbar|-ms-autohiding-scrollbar",
        "-ms-scrollbar-3dlight-color": "<color>",
        "-ms-scrollbar-arrow-color": "<color>",
        "-ms-scrollbar-base-color": "<color>",
        "-ms-scrollbar-darkshadow-color": "<color>",
        "-ms-scrollbar-face-color": "<color>",
        "-ms-scrollbar-highlight-color": "<color>",
        "-ms-scrollbar-shadow-color": "<color>",
        "-ms-scrollbar-track-color": "<color>",
        "-ms-scroll-chaining": "chained|none",
        "-ms-scroll-limit": "<'-ms-scroll-limit-x-min'> <'-ms-scroll-limit-y-min'> <'-ms-scroll-limit-x-max'> <'-ms-scroll-limit-y-max'>",
        "-ms-scroll-limit-x-max": "auto|<length>",
        "-ms-scroll-limit-x-min": "<length>",
        "-ms-scroll-limit-y-max": "auto|<length>",
        "-ms-scroll-limit-y-min": "<length>",
        "-ms-scroll-rails": "none|railed",
        "-ms-scroll-snap-points-x": "snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )",
        "-ms-scroll-snap-points-y": "snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )",
        "-ms-scroll-snap-type": "none|proximity|mandatory",
        "-ms-scroll-snap-x": "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-x'>",
        "-ms-scroll-snap-y": "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-y'>",
        "-ms-scroll-translation": "none|vertical-to-horizontal",
        "-ms-text-autospace": "none|ideograph-alpha|ideograph-numeric|ideograph-parenthesis|ideograph-space",
        "-ms-touch-select": "grippers|none",
        "-ms-user-select": "none|element|text",
        "-ms-wrap-flow": "auto|both|start|end|maximum|clear",
        "-ms-wrap-margin": "<length>",
        "-ms-wrap-through": "wrap|none",
        "-moz-appearance": "none|button|button-arrow-down|button-arrow-next|button-arrow-previous|button-arrow-up|button-bevel|button-focus|caret|checkbox|checkbox-container|checkbox-label|checkmenuitem|dualbutton|groupbox|listbox|listitem|menuarrow|menubar|menucheckbox|menuimage|menuitem|menuitemtext|menulist|menulist-button|menulist-text|menulist-textfield|menupopup|menuradio|menuseparator|meterbar|meterchunk|progressbar|progressbar-vertical|progresschunk|progresschunk-vertical|radio|radio-container|radio-label|radiomenuitem|range|range-thumb|resizer|resizerpanel|scale-horizontal|scalethumbend|scalethumb-horizontal|scalethumbstart|scalethumbtick|scalethumb-vertical|scale-vertical|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|separator|sheet|spinner|spinner-downbutton|spinner-textfield|spinner-upbutton|splitter|statusbar|statusbarpanel|tab|tabpanel|tabpanels|tab-scroll-arrow-back|tab-scroll-arrow-forward|textfield|textfield-multiline|toolbar|toolbarbutton|toolbarbutton-dropdown|toolbargripper|toolbox|tooltip|treeheader|treeheadercell|treeheadersortarrow|treeitem|treeline|treetwisty|treetwistyopen|treeview|-moz-mac-unified-toolbar|-moz-win-borderless-glass|-moz-win-browsertabbar-toolbox|-moz-win-communicationstext|-moz-win-communications-toolbox|-moz-win-exclude-glass|-moz-win-glass|-moz-win-mediatext|-moz-win-media-toolbox|-moz-window-button-box|-moz-window-button-box-maximized|-moz-window-button-close|-moz-window-button-maximize|-moz-window-button-minimize|-moz-window-button-restore|-moz-window-frame-bottom|-moz-window-frame-left|-moz-window-frame-right|-moz-window-titlebar|-moz-window-titlebar-maximized",
        "-moz-binding": "<url>|none",
        "-moz-border-bottom-colors": "<color>+|none",
        "-moz-border-left-colors": "<color>+|none",
        "-moz-border-right-colors": "<color>+|none",
        "-moz-border-top-colors": "<color>+|none",
        "-moz-context-properties": "none|[fill|fill-opacity|stroke|stroke-opacity]#",
        "-moz-float-edge": "border-box|content-box|margin-box|padding-box",
        "-moz-force-broken-image-icon": "0|1",
        "-moz-image-region": "<shape>|auto",
        "-moz-orient": "inline|block|horizontal|vertical",
        "-moz-outline-radius": "<outline-radius>{1,4} [/ <outline-radius>{1,4}]?",
        "-moz-outline-radius-bottomleft": "<outline-radius>",
        "-moz-outline-radius-bottomright": "<outline-radius>",
        "-moz-outline-radius-topleft": "<outline-radius>",
        "-moz-outline-radius-topright": "<outline-radius>",
        "-moz-stack-sizing": "ignore|stretch-to-fit",
        "-moz-text-blink": "none|blink",
        "-moz-user-focus": "ignore|normal|select-after|select-before|select-menu|select-same|select-all|none",
        "-moz-user-input": "auto|none|enabled|disabled",
        "-moz-user-modify": "read-only|read-write|write-only",
        "-moz-window-dragging": "drag|no-drag",
        "-moz-window-shadow": "default|menu|tooltip|sheet|none",
        "-webkit-appearance": "none|button|button-bevel|caps-lock-indicator|caret|checkbox|default-button|inner-spin-button|listbox|listitem|media-controls-background|media-controls-fullscreen-background|media-current-time-display|media-enter-fullscreen-button|media-exit-fullscreen-button|media-fullscreen-button|media-mute-button|media-overlay-play-button|media-play-button|media-seek-back-button|media-seek-forward-button|media-slider|media-sliderthumb|media-time-remaining-display|media-toggle-closed-captions-button|media-volume-slider|media-volume-slider-container|media-volume-sliderthumb|menulist|menulist-button|menulist-text|menulist-textfield|meter|progress-bar|progress-bar-value|push-button|radio|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbargripper-horizontal|scrollbargripper-vertical|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|searchfield-cancel-button|searchfield-decoration|searchfield-results-button|searchfield-results-decoration|slider-horizontal|slider-vertical|sliderthumb-horizontal|sliderthumb-vertical|square-button|textarea|textfield|-apple-pay-button",
        "-webkit-border-before": "<'border-width'>||<'border-style'>||<color>",
        "-webkit-border-before-color": "<color>",
        "-webkit-border-before-style": "<'border-style'>",
        "-webkit-border-before-width": "<'border-width'>",
        "-webkit-box-reflect": "[above|below|right|left]? <length>? <image>?",
        "-webkit-line-clamp": "none|<integer>",
        "-webkit-mask": "[<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||[<box>|border|padding|content|text]||[<box>|border|padding|content]]#",
        "-webkit-mask-attachment": "<attachment>#",
        "-webkit-mask-clip": "[<box>|border|padding|content|text]#",
        "-webkit-mask-composite": "<composite-style>#",
        "-webkit-mask-image": "<mask-reference>#",
        "-webkit-mask-origin": "[<box>|border|padding|content]#",
        "-webkit-mask-position": "<position>#",
        "-webkit-mask-position-x": "[<length-percentage>|left|center|right]#",
        "-webkit-mask-position-y": "[<length-percentage>|top|center|bottom]#",
        "-webkit-mask-repeat": "<repeat-style>#",
        "-webkit-mask-repeat-x": "repeat|no-repeat|space|round",
        "-webkit-mask-repeat-y": "repeat|no-repeat|space|round",
        "-webkit-mask-size": "<bg-size>#",
        "-webkit-overflow-scrolling": "auto|touch",
        "-webkit-tap-highlight-color": "<color>",
        "-webkit-text-fill-color": "<color>",
        "-webkit-text-stroke": "<length>||<color>",
        "-webkit-text-stroke-color": "<color>",
        "-webkit-text-stroke-width": "<length>",
        "-webkit-touch-callout": "default|none",
        "-webkit-user-modify": "read-only|read-write|read-write-plaintext-only",
        "accent-color": "auto|<color>",
        "align-content": "normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>",
        "align-items": "normal|stretch|<baseline-position>|[<overflow-position>? <self-position>]",
        "align-self": "auto|normal|stretch|<baseline-position>|<overflow-position>? <self-position>",
        "align-tracks": "[normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>]#",
        "all": "initial|inherit|unset|revert|revert-layer",
        "animation": "<single-animation>#",
        "animation-composition": "<single-animation-composition>#",
        "animation-delay": "<time>#",
        "animation-direction": "<single-animation-direction>#",
        "animation-duration": "<time>#",
        "animation-fill-mode": "<single-animation-fill-mode>#",
        "animation-iteration-count": "<single-animation-iteration-count>#",
        "animation-name": "[none|<keyframes-name>]#",
        "animation-play-state": "<single-animation-play-state>#",
        "animation-timing-function": "<easing-function>#",
        "animation-timeline": "<single-animation-timeline>#",
        "appearance": "none|auto|textfield|menulist-button|<compat-auto>",
        "aspect-ratio": "auto|<ratio>",
        "azimuth": "<angle>|[[left-side|far-left|left|center-left|center|center-right|right|far-right|right-side]||behind]|leftwards|rightwards",
        "backdrop-filter": "none|<filter-function-list>",
        "backface-visibility": "visible|hidden",
        "background": "[<bg-layer> ,]* <final-bg-layer>",
        "background-attachment": "<attachment>#",
        "background-blend-mode": "<blend-mode>#",
        "background-clip": "<bg-clip>#",
        "background-color": "<color>",
        "background-image": "<bg-image>#",
        "background-origin": "<box>#",
        "background-position": "<bg-position>#",
        "background-position-x": "[center|[[left|right|x-start|x-end]? <length-percentage>?]!]#",
        "background-position-y": "[center|[[top|bottom|y-start|y-end]? <length-percentage>?]!]#",
        "background-repeat": "<repeat-style>#",
        "background-size": "<bg-size>#",
        "block-overflow": "clip|ellipsis|<string>",
        "block-size": "<'width'>",
        "border": "<line-width>||<line-style>||<color>",
        "border-block": "<'border-top-width'>||<'border-top-style'>||<color>",
        "border-block-color": "<'border-top-color'>{1,2}",
        "border-block-style": "<'border-top-style'>",
        "border-block-width": "<'border-top-width'>",
        "border-block-end": "<'border-top-width'>||<'border-top-style'>||<color>",
        "border-block-end-color": "<'border-top-color'>",
        "border-block-end-style": "<'border-top-style'>",
        "border-block-end-width": "<'border-top-width'>",
        "border-block-start": "<'border-top-width'>||<'border-top-style'>||<color>",
        "border-block-start-color": "<'border-top-color'>",
        "border-block-start-style": "<'border-top-style'>",
        "border-block-start-width": "<'border-top-width'>",
        "border-bottom": "<line-width>||<line-style>||<color>",
        "border-bottom-color": "<'border-top-color'>",
        "border-bottom-left-radius": "<length-percentage>{1,2}",
        "border-bottom-right-radius": "<length-percentage>{1,2}",
        "border-bottom-style": "<line-style>",
        "border-bottom-width": "<line-width>",
        "border-collapse": "collapse|separate",
        "border-color": "<color>{1,4}",
        "border-end-end-radius": "<length-percentage>{1,2}",
        "border-end-start-radius": "<length-percentage>{1,2}",
        "border-image": "<'border-image-source'>||<'border-image-slice'> [/ <'border-image-width'>|/ <'border-image-width'>? / <'border-image-outset'>]?||<'border-image-repeat'>",
        "border-image-outset": "[<length>|<number>]{1,4}",
        "border-image-repeat": "[stretch|repeat|round|space]{1,2}",
        "border-image-slice": "<number-percentage>{1,4}&&fill?",
        "border-image-source": "none|<image>",
        "border-image-width": "[<length-percentage>|<number>|auto]{1,4}",
        "border-inline": "<'border-top-width'>||<'border-top-style'>||<color>",
        "border-inline-end": "<'border-top-width'>||<'border-top-style'>||<color>",
        "border-inline-color": "<'border-top-color'>{1,2}",
        "border-inline-style": "<'border-top-style'>",
        "border-inline-width": "<'border-top-width'>",
        "border-inline-end-color": "<'border-top-color'>",
        "border-inline-end-style": "<'border-top-style'>",
        "border-inline-end-width": "<'border-top-width'>",
        "border-inline-start": "<'border-top-width'>||<'border-top-style'>||<color>",
        "border-inline-start-color": "<'border-top-color'>",
        "border-inline-start-style": "<'border-top-style'>",
        "border-inline-start-width": "<'border-top-width'>",
        "border-left": "<line-width>||<line-style>||<color>",
        "border-left-color": "<color>",
        "border-left-style": "<line-style>",
        "border-left-width": "<line-width>",
        "border-radius": "<length-percentage>{1,4} [/ <length-percentage>{1,4}]?",
        "border-right": "<line-width>||<line-style>||<color>",
        "border-right-color": "<color>",
        "border-right-style": "<line-style>",
        "border-right-width": "<line-width>",
        "border-spacing": "<length> <length>?",
        "border-start-end-radius": "<length-percentage>{1,2}",
        "border-start-start-radius": "<length-percentage>{1,2}",
        "border-style": "<line-style>{1,4}",
        "border-top": "<line-width>||<line-style>||<color>",
        "border-top-color": "<color>",
        "border-top-left-radius": "<length-percentage>{1,2}",
        "border-top-right-radius": "<length-percentage>{1,2}",
        "border-top-style": "<line-style>",
        "border-top-width": "<line-width>",
        "border-width": "<line-width>{1,4}",
        "bottom": "<length>|<percentage>|auto",
        "box-align": "start|center|end|baseline|stretch",
        "box-decoration-break": "slice|clone",
        "box-direction": "normal|reverse|inherit",
        "box-flex": "<number>",
        "box-flex-group": "<integer>",
        "box-lines": "single|multiple",
        "box-ordinal-group": "<integer>",
        "box-orient": "horizontal|vertical|inline-axis|block-axis|inherit",
        "box-pack": "start|center|end|justify",
        "box-shadow": "none|<shadow>#",
        "box-sizing": "content-box|border-box",
        "break-after": "auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region",
        "break-before": "auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region",
        "break-inside": "auto|avoid|avoid-page|avoid-column|avoid-region",
        "caption-side": "top|bottom|block-start|block-end|inline-start|inline-end",
        "caret": "<'caret-color'>||<'caret-shape'>",
        "caret-color": "auto|<color>",
        "caret-shape": "auto|bar|block|underscore",
        "clear": "none|left|right|both|inline-start|inline-end",
        "clip": "<shape>|auto",
        "clip-path": "<clip-source>|[<basic-shape>||<geometry-box>]|none",
        "color": "<color>",
        "print-color-adjust": "economy|exact",
        "color-scheme": "normal|[light|dark|<custom-ident>]+&&only?",
        "column-count": "<integer>|auto",
        "column-fill": "auto|balance|balance-all",
        "column-gap": "normal|<length-percentage>",
        "column-rule": "<'column-rule-width'>||<'column-rule-style'>||<'column-rule-color'>",
        "column-rule-color": "<color>",
        "column-rule-style": "<'border-style'>",
        "column-rule-width": "<'border-width'>",
        "column-span": "none|all",
        "column-width": "<length>|auto",
        "columns": "<'column-width'>||<'column-count'>",
        "contain": "none|strict|content|[[size||inline-size]||layout||style||paint]",
        "contain-intrinsic-size": "[none|<length>|auto <length>]{1,2}",
        "contain-intrinsic-block-size": "none|<length>|auto <length>",
        "contain-intrinsic-height": "none|<length>|auto <length>",
        "contain-intrinsic-inline-size": "none|<length>|auto <length>",
        "contain-intrinsic-width": "none|<length>|auto <length>",
        "content": "normal|none|[<content-replacement>|<content-list>] [/ [<string>|<counter>]+]?",
        "content-visibility": "visible|auto|hidden",
        "counter-increment": "[<counter-name> <integer>?]+|none",
        "counter-reset": "[<counter-name> <integer>?|<reversed-counter-name> <integer>?]+|none",
        "counter-set": "[<counter-name> <integer>?]+|none",
        "cursor": "[[<url> [<x> <y>]? ,]* [auto|default|none|context-menu|help|pointer|progress|wait|cell|crosshair|text|vertical-text|alias|copy|move|no-drop|not-allowed|e-resize|n-resize|ne-resize|nw-resize|s-resize|se-resize|sw-resize|w-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|col-resize|row-resize|all-scroll|zoom-in|zoom-out|grab|grabbing|hand|-webkit-grab|-webkit-grabbing|-webkit-zoom-in|-webkit-zoom-out|-moz-grab|-moz-grabbing|-moz-zoom-in|-moz-zoom-out]]",
        "direction": "ltr|rtl",
        "display": "[<display-outside>||<display-inside>]|<display-listitem>|<display-internal>|<display-box>|<display-legacy>|<-non-standard-display>",
        "empty-cells": "show|hide",
        "filter": "none|<filter-function-list>|<-ms-filter-function-list>",
        "flex": "none|[<'flex-grow'> <'flex-shrink'>?||<'flex-basis'>]",
        "flex-basis": "content|<'width'>",
        "flex-direction": "row|row-reverse|column|column-reverse",
        "flex-flow": "<'flex-direction'>||<'flex-wrap'>",
        "flex-grow": "<number>",
        "flex-shrink": "<number>",
        "flex-wrap": "nowrap|wrap|wrap-reverse",
        "float": "left|right|none|inline-start|inline-end",
        "font": "[[<'font-style'>||<font-variant-css21>||<'font-weight'>||<'font-stretch'>]? <'font-size'> [/ <'line-height'>]? <'font-family'>]|caption|icon|menu|message-box|small-caption|status-bar",
        "font-family": "[<family-name>|<generic-family>]#",
        "font-feature-settings": "normal|<feature-tag-value>#",
        "font-kerning": "auto|normal|none",
        "font-language-override": "normal|<string>",
        "font-optical-sizing": "auto|none",
        "font-variation-settings": "normal|[<string> <number>]#",
        "font-size": "<absolute-size>|<relative-size>|<length-percentage>",
        "font-size-adjust": "none|[ex-height|cap-height|ch-width|ic-width|ic-height]? [from-font|<number>]",
        "font-smooth": "auto|never|always|<absolute-size>|<length>",
        "font-stretch": "<font-stretch-absolute>",
        "font-style": "normal|italic|oblique <angle>?",
        "font-synthesis": "none|[weight||style||small-caps]",
        "font-variant": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>||stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )||[small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps]||<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero||<east-asian-variant-values>||<east-asian-width-values>||ruby]",
        "font-variant-alternates": "normal|[stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )]",
        "font-variant-caps": "normal|small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps",
        "font-variant-east-asian": "normal|[<east-asian-variant-values>||<east-asian-width-values>||ruby]",
        "font-variant-ligatures": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>]",
        "font-variant-numeric": "normal|[<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero]",
        "font-variant-position": "normal|sub|super",
        "font-weight": "<font-weight-absolute>|bolder|lighter",
        "forced-color-adjust": "auto|none",
        "gap": "<'row-gap'> <'column-gap'>?",
        "grid": "<'grid-template'>|<'grid-template-rows'> / [auto-flow&&dense?] <'grid-auto-columns'>?|[auto-flow&&dense?] <'grid-auto-rows'>? / <'grid-template-columns'>",
        "grid-area": "<grid-line> [/ <grid-line>]{0,3}",
        "grid-auto-columns": "<track-size>+",
        "grid-auto-flow": "[row|column]||dense",
        "grid-auto-rows": "<track-size>+",
        "grid-column": "<grid-line> [/ <grid-line>]?",
        "grid-column-end": "<grid-line>",
        "grid-column-gap": "<length-percentage>",
        "grid-column-start": "<grid-line>",
        "grid-gap": "<'grid-row-gap'> <'grid-column-gap'>?",
        "grid-row": "<grid-line> [/ <grid-line>]?",
        "grid-row-end": "<grid-line>",
        "grid-row-gap": "<length-percentage>",
        "grid-row-start": "<grid-line>",
        "grid-template": "none|[<'grid-template-rows'> / <'grid-template-columns'>]|[<line-names>? <string> <track-size>? <line-names>?]+ [/ <explicit-track-list>]?",
        "grid-template-areas": "none|<string>+",
        "grid-template-columns": "none|<track-list>|<auto-track-list>|subgrid <line-name-list>?",
        "grid-template-rows": "none|<track-list>|<auto-track-list>|subgrid <line-name-list>?",
        "hanging-punctuation": "none|[first||[force-end|allow-end]||last]",
        "height": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )",
        "hyphenate-character": "auto|<string>",
        "hyphens": "none|manual|auto",
        "image-orientation": "from-image|<angle>|[<angle>? flip]",
        "image-rendering": "auto|crisp-edges|pixelated|optimizeSpeed|optimizeQuality|<-non-standard-image-rendering>",
        "image-resolution": "[from-image||<resolution>]&&snap?",
        "ime-mode": "auto|normal|active|inactive|disabled",
        "initial-letter": "normal|[<number> <integer>?]",
        "initial-letter-align": "[auto|alphabetic|hanging|ideographic]",
        "inline-size": "<'width'>",
        "input-security": "auto|none",
        "inset": "<'top'>{1,4}",
        "inset-block": "<'top'>{1,2}",
        "inset-block-end": "<'top'>",
        "inset-block-start": "<'top'>",
        "inset-inline": "<'top'>{1,2}",
        "inset-inline-end": "<'top'>",
        "inset-inline-start": "<'top'>",
        "isolation": "auto|isolate",
        "justify-content": "normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]",
        "justify-items": "normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]|legacy|legacy&&[left|right|center]",
        "justify-self": "auto|normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]",
        "justify-tracks": "[normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]]#",
        "left": "<length>|<percentage>|auto",
        "letter-spacing": "normal|<length-percentage>",
        "line-break": "auto|loose|normal|strict|anywhere",
        "line-clamp": "none|<integer>",
        "line-height": "normal|<number>|<length>|<percentage>",
        "line-height-step": "<length>",
        "list-style": "<'list-style-type'>||<'list-style-position'>||<'list-style-image'>",
        "list-style-image": "<image>|none",
        "list-style-position": "inside|outside",
        "list-style-type": "<counter-style>|<string>|none",
        "margin": "[<length>|<percentage>|auto]{1,4}",
        "margin-block": "<'margin-left'>{1,2}",
        "margin-block-end": "<'margin-left'>",
        "margin-block-start": "<'margin-left'>",
        "margin-bottom": "<length>|<percentage>|auto",
        "margin-inline": "<'margin-left'>{1,2}",
        "margin-inline-end": "<'margin-left'>",
        "margin-inline-start": "<'margin-left'>",
        "margin-left": "<length>|<percentage>|auto",
        "margin-right": "<length>|<percentage>|auto",
        "margin-top": "<length>|<percentage>|auto",
        "margin-trim": "none|in-flow|all",
        "mask": "<mask-layer>#",
        "mask-border": "<'mask-border-source'>||<'mask-border-slice'> [/ <'mask-border-width'>? [/ <'mask-border-outset'>]?]?||<'mask-border-repeat'>||<'mask-border-mode'>",
        "mask-border-mode": "luminance|alpha",
        "mask-border-outset": "[<length>|<number>]{1,4}",
        "mask-border-repeat": "[stretch|repeat|round|space]{1,2}",
        "mask-border-slice": "<number-percentage>{1,4} fill?",
        "mask-border-source": "none|<image>",
        "mask-border-width": "[<length-percentage>|<number>|auto]{1,4}",
        "mask-clip": "[<geometry-box>|no-clip]#",
        "mask-composite": "<compositing-operator>#",
        "mask-image": "<mask-reference>#",
        "mask-mode": "<masking-mode>#",
        "mask-origin": "<geometry-box>#",
        "mask-position": "<position>#",
        "mask-repeat": "<repeat-style>#",
        "mask-size": "<bg-size>#",
        "mask-type": "luminance|alpha",
        "masonry-auto-flow": "[pack|next]||[definite-first|ordered]",
        "math-depth": "auto-add|add( <integer> )|<integer>",
        "math-shift": "normal|compact",
        "math-style": "normal|compact",
        "max-block-size": "<'max-width'>",
        "max-height": "none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )",
        "max-inline-size": "<'max-width'>",
        "max-lines": "none|<integer>",
        "max-width": "none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|<-non-standard-width>",
        "min-block-size": "<'min-width'>",
        "min-height": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )",
        "min-inline-size": "<'min-width'>",
        "min-width": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|<-non-standard-width>",
        "mix-blend-mode": "<blend-mode>|plus-lighter",
        "object-fit": "fill|contain|cover|none|scale-down",
        "object-position": "<position>",
        "offset": "[<'offset-position'>? [<'offset-path'> [<'offset-distance'>||<'offset-rotate'>]?]?]! [/ <'offset-anchor'>]?",
        "offset-anchor": "auto|<position>",
        "offset-distance": "<length-percentage>",
        "offset-path": "none|ray( [<angle>&&<size>&&contain?] )|<path()>|<url>|[<basic-shape>||<geometry-box>]",
        "offset-position": "auto|<position>",
        "offset-rotate": "[auto|reverse]||<angle>",
        "opacity": "<alpha-value>",
        "order": "<integer>",
        "orphans": "<integer>",
        "outline": "[<'outline-color'>||<'outline-style'>||<'outline-width'>]",
        "outline-color": "<color>|invert",
        "outline-offset": "<length>",
        "outline-style": "auto|<'border-style'>",
        "outline-width": "<line-width>",
        "overflow": "[visible|hidden|clip|scroll|auto]{1,2}|<-non-standard-overflow>",
        "overflow-anchor": "auto|none",
        "overflow-block": "visible|hidden|clip|scroll|auto",
        "overflow-clip-box": "padding-box|content-box",
        "overflow-clip-margin": "<visual-box>||<length [0,∞]>",
        "overflow-inline": "visible|hidden|clip|scroll|auto",
        "overflow-wrap": "normal|break-word|anywhere",
        "overflow-x": "visible|hidden|clip|scroll|auto",
        "overflow-y": "visible|hidden|clip|scroll|auto",
        "overscroll-behavior": "[contain|none|auto]{1,2}",
        "overscroll-behavior-block": "contain|none|auto",
        "overscroll-behavior-inline": "contain|none|auto",
        "overscroll-behavior-x": "contain|none|auto",
        "overscroll-behavior-y": "contain|none|auto",
        "padding": "[<length>|<percentage>]{1,4}",
        "padding-block": "<'padding-left'>{1,2}",
        "padding-block-end": "<'padding-left'>",
        "padding-block-start": "<'padding-left'>",
        "padding-bottom": "<length>|<percentage>",
        "padding-inline": "<'padding-left'>{1,2}",
        "padding-inline-end": "<'padding-left'>",
        "padding-inline-start": "<'padding-left'>",
        "padding-left": "<length>|<percentage>",
        "padding-right": "<length>|<percentage>",
        "padding-top": "<length>|<percentage>",
        "page-break-after": "auto|always|avoid|left|right|recto|verso",
        "page-break-before": "auto|always|avoid|left|right|recto|verso",
        "page-break-inside": "auto|avoid",
        "paint-order": "normal|[fill||stroke||markers]",
        "perspective": "none|<length>",
        "perspective-origin": "<position>",
        "place-content": "<'align-content'> <'justify-content'>?",
        "place-items": "<'align-items'> <'justify-items'>?",
        "place-self": "<'align-self'> <'justify-self'>?",
        "pointer-events": "auto|none|visiblePainted|visibleFill|visibleStroke|visible|painted|fill|stroke|all|inherit",
        "position": "static|relative|absolute|sticky|fixed|-webkit-sticky",
        "quotes": "none|auto|[<string> <string>]+",
        "resize": "none|both|horizontal|vertical|block|inline",
        "right": "<length>|<percentage>|auto",
        "rotate": "none|<angle>|[x|y|z|<number>{3}]&&<angle>",
        "row-gap": "normal|<length-percentage>",
        "ruby-align": "start|center|space-between|space-around",
        "ruby-merge": "separate|collapse|auto",
        "ruby-position": "[alternate||[over|under]]|inter-character",
        "scale": "none|<number>{1,3}",
        "scrollbar-color": "auto|<color>{2}",
        "scrollbar-gutter": "auto|stable&&both-edges?",
        "scrollbar-width": "auto|thin|none",
        "scroll-behavior": "auto|smooth",
        "scroll-margin": "<length>{1,4}",
        "scroll-margin-block": "<length>{1,2}",
        "scroll-margin-block-start": "<length>",
        "scroll-margin-block-end": "<length>",
        "scroll-margin-bottom": "<length>",
        "scroll-margin-inline": "<length>{1,2}",
        "scroll-margin-inline-start": "<length>",
        "scroll-margin-inline-end": "<length>",
        "scroll-margin-left": "<length>",
        "scroll-margin-right": "<length>",
        "scroll-margin-top": "<length>",
        "scroll-padding": "[auto|<length-percentage>]{1,4}",
        "scroll-padding-block": "[auto|<length-percentage>]{1,2}",
        "scroll-padding-block-start": "auto|<length-percentage>",
        "scroll-padding-block-end": "auto|<length-percentage>",
        "scroll-padding-bottom": "auto|<length-percentage>",
        "scroll-padding-inline": "[auto|<length-percentage>]{1,2}",
        "scroll-padding-inline-start": "auto|<length-percentage>",
        "scroll-padding-inline-end": "auto|<length-percentage>",
        "scroll-padding-left": "auto|<length-percentage>",
        "scroll-padding-right": "auto|<length-percentage>",
        "scroll-padding-top": "auto|<length-percentage>",
        "scroll-snap-align": "[none|start|end|center]{1,2}",
        "scroll-snap-coordinate": "none|<position>#",
        "scroll-snap-destination": "<position>",
        "scroll-snap-points-x": "none|repeat( <length-percentage> )",
        "scroll-snap-points-y": "none|repeat( <length-percentage> )",
        "scroll-snap-stop": "normal|always",
        "scroll-snap-type": "none|[x|y|block|inline|both] [mandatory|proximity]?",
        "scroll-snap-type-x": "none|mandatory|proximity",
        "scroll-snap-type-y": "none|mandatory|proximity",
        "scroll-timeline": "<scroll-timeline-name>||<scroll-timeline-axis>",
        "scroll-timeline-axis": "block|inline|vertical|horizontal",
        "scroll-timeline-name": "none|<custom-ident>",
        "shape-image-threshold": "<alpha-value>",
        "shape-margin": "<length-percentage>",
        "shape-outside": "none|[<shape-box>||<basic-shape>]|<image>",
        "tab-size": "<integer>|<length>",
        "table-layout": "auto|fixed",
        "text-align": "start|end|left|right|center|justify|match-parent",
        "text-align-last": "auto|start|end|left|right|center|justify",
        "text-combine-upright": "none|all|[digits <integer>?]",
        "text-decoration": "<'text-decoration-line'>||<'text-decoration-style'>||<'text-decoration-color'>||<'text-decoration-thickness'>",
        "text-decoration-color": "<color>",
        "text-decoration-line": "none|[underline||overline||line-through||blink]|spelling-error|grammar-error",
        "text-decoration-skip": "none|[objects||[spaces|[leading-spaces||trailing-spaces]]||edges||box-decoration]",
        "text-decoration-skip-ink": "auto|all|none",
        "text-decoration-style": "solid|double|dotted|dashed|wavy",
        "text-decoration-thickness": "auto|from-font|<length>|<percentage>",
        "text-emphasis": "<'text-emphasis-style'>||<'text-emphasis-color'>",
        "text-emphasis-color": "<color>",
        "text-emphasis-position": "[over|under]&&[right|left]",
        "text-emphasis-style": "none|[[filled|open]||[dot|circle|double-circle|triangle|sesame]]|<string>",
        "text-indent": "<length-percentage>&&hanging?&&each-line?",
        "text-justify": "auto|inter-character|inter-word|none",
        "text-orientation": "mixed|upright|sideways",
        "text-overflow": "[clip|ellipsis|<string>]{1,2}",
        "text-rendering": "auto|optimizeSpeed|optimizeLegibility|geometricPrecision",
        "text-shadow": "none|<shadow-t>#",
        "text-size-adjust": "none|auto|<percentage>",
        "text-transform": "none|capitalize|uppercase|lowercase|full-width|full-size-kana",
        "text-underline-offset": "auto|<length>|<percentage>",
        "text-underline-position": "auto|from-font|[under||[left|right]]",
        "top": "<length>|<percentage>|auto",
        "touch-action": "auto|none|[[pan-x|pan-left|pan-right]||[pan-y|pan-up|pan-down]||pinch-zoom]|manipulation",
        "transform": "none|<transform-list>",
        "transform-box": "content-box|border-box|fill-box|stroke-box|view-box",
        "transform-origin": "[<length-percentage>|left|center|right|top|bottom]|[[<length-percentage>|left|center|right]&&[<length-percentage>|top|center|bottom]] <length>?",
        "transform-style": "flat|preserve-3d",
        "transition": "<single-transition>#",
        "transition-delay": "<time>#",
        "transition-duration": "<time>#",
        "transition-property": "none|<single-transition-property>#",
        "transition-timing-function": "<easing-function>#",
        "translate": "none|<length-percentage> [<length-percentage> <length>?]?",
        "unicode-bidi": "normal|embed|isolate|bidi-override|isolate-override|plaintext|-moz-isolate|-moz-isolate-override|-moz-plaintext|-webkit-isolate|-webkit-isolate-override|-webkit-plaintext",
        "user-select": "auto|text|none|contain|all",
        "vertical-align": "baseline|sub|super|text-top|text-bottom|middle|top|bottom|<percentage>|<length>",
        "visibility": "visible|hidden|collapse",
        "white-space": "normal|pre|nowrap|pre-wrap|pre-line|break-spaces",
        "widows": "<integer>",
        "width": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|fill|stretch|intrinsic|-moz-max-content|-webkit-max-content|-moz-fit-content|-webkit-fit-content",
        "will-change": "auto|<animateable-feature>#",
        "word-break": "normal|break-all|keep-all|break-word",
        "word-spacing": "normal|<length>",
        "word-wrap": "normal|break-word",
        "writing-mode": "horizontal-tb|vertical-rl|vertical-lr|sideways-rl|sideways-lr|<svg-writing-mode>",
        "z-index": "auto|<integer>",
        "zoom": "normal|reset|<number>|<percentage>",
        "-moz-background-clip": "padding|border",
        "-moz-border-radius-bottomleft": "<'border-bottom-left-radius'>",
        "-moz-border-radius-bottomright": "<'border-bottom-right-radius'>",
        "-moz-border-radius-topleft": "<'border-top-left-radius'>",
        "-moz-border-radius-topright": "<'border-bottom-right-radius'>",
        "-moz-control-character-visibility": "visible|hidden",
        "-moz-osx-font-smoothing": "auto|grayscale",
        "-moz-user-select": "none|text|all|-moz-none",
        "-ms-flex-align": "start|end|center|baseline|stretch",
        "-ms-flex-item-align": "auto|start|end|center|baseline|stretch",
        "-ms-flex-line-pack": "start|end|center|justify|distribute|stretch",
        "-ms-flex-negative": "<'flex-shrink'>",
        "-ms-flex-pack": "start|end|center|justify|distribute",
        "-ms-flex-order": "<integer>",
        "-ms-flex-positive": "<'flex-grow'>",
        "-ms-flex-preferred-size": "<'flex-basis'>",
        "-ms-interpolation-mode": "nearest-neighbor|bicubic",
        "-ms-grid-column-align": "start|end|center|stretch",
        "-ms-grid-row-align": "start|end|center|stretch",
        "-ms-hyphenate-limit-last": "none|always|column|page|spread",
        "-webkit-background-clip": "[<box>|border|padding|content|text]#",
        "-webkit-column-break-after": "always|auto|avoid",
        "-webkit-column-break-before": "always|auto|avoid",
        "-webkit-column-break-inside": "always|auto|avoid",
        "-webkit-font-smoothing": "auto|none|antialiased|subpixel-antialiased",
        "-webkit-mask-box-image": "[<url>|<gradient>|none] [<length-percentage>{4} <-webkit-mask-box-repeat>{2}]?",
        "-webkit-print-color-adjust": "economy|exact",
        "-webkit-text-security": "none|circle|disc|square",
        "-webkit-user-drag": "none|element|auto",
        "-webkit-user-select": "auto|none|text|all",
        "alignment-baseline": "auto|baseline|before-edge|text-before-edge|middle|central|after-edge|text-after-edge|ideographic|alphabetic|hanging|mathematical",
        "baseline-shift": "baseline|sub|super|<svg-length>",
        "behavior": "<url>+",
        "clip-rule": "nonzero|evenodd",
        "cue": "<'cue-before'> <'cue-after'>?",
        "cue-after": "<url> <decibel>?|none",
        "cue-before": "<url> <decibel>?|none",
        "dominant-baseline": "auto|use-script|no-change|reset-size|ideographic|alphabetic|hanging|mathematical|central|middle|text-after-edge|text-before-edge",
        "fill": "<paint>",
        "fill-opacity": "<number-zero-one>",
        "fill-rule": "nonzero|evenodd",
        "glyph-orientation-horizontal": "<angle>",
        "glyph-orientation-vertical": "<angle>",
        "kerning": "auto|<svg-length>",
        "marker": "none|<url>",
        "marker-end": "none|<url>",
        "marker-mid": "none|<url>",
        "marker-start": "none|<url>",
        "pause": "<'pause-before'> <'pause-after'>?",
        "pause-after": "<time>|none|x-weak|weak|medium|strong|x-strong",
        "pause-before": "<time>|none|x-weak|weak|medium|strong|x-strong",
        "rest": "<'rest-before'> <'rest-after'>?",
        "rest-after": "<time>|none|x-weak|weak|medium|strong|x-strong",
        "rest-before": "<time>|none|x-weak|weak|medium|strong|x-strong",
        "shape-rendering": "auto|optimizeSpeed|crispEdges|geometricPrecision",
        "src": "[<url> [format( <string># )]?|local( <family-name> )]#",
        "speak": "auto|none|normal",
        "speak-as": "normal|spell-out||digits||[literal-punctuation|no-punctuation]",
        "stroke": "<paint>",
        "stroke-dasharray": "none|[<svg-length>+]#",
        "stroke-dashoffset": "<svg-length>",
        "stroke-linecap": "butt|round|square",
        "stroke-linejoin": "miter|round|bevel",
        "stroke-miterlimit": "<number-one-or-greater>",
        "stroke-opacity": "<number-zero-one>",
        "stroke-width": "<svg-length>",
        "text-anchor": "start|middle|end",
        "unicode-range": "<urange>#",
        "voice-balance": "<number>|left|center|right|leftwards|rightwards",
        "voice-duration": "auto|<time>",
        "voice-family": "[[<family-name>|<generic-voice>] ,]* [<family-name>|<generic-voice>]|preserve",
        "voice-pitch": "<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]",
        "voice-range": "<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]",
        "voice-rate": "[normal|x-slow|slow|medium|fast|x-fast]||<percentage>",
        "voice-stress": "normal|strong|moderate|none|reduced",
        "voice-volume": "silent|[[x-soft|soft|medium|loud|x-loud]||<decibel>]"
    },
    "atrules": {
        "charset": {
            "prelude": "<string>",
            "descriptors": null
        },
        "counter-style": {
            "prelude": "<counter-style-name>",
            "descriptors": {
                "additive-symbols": "[<integer>&&<symbol>]#",
                "fallback": "<counter-style-name>",
                "negative": "<symbol> <symbol>?",
                "pad": "<integer>&&<symbol>",
                "prefix": "<symbol>",
                "range": "[[<integer>|infinite]{2}]#|auto",
                "speak-as": "auto|bullets|numbers|words|spell-out|<counter-style-name>",
                "suffix": "<symbol>",
                "symbols": "<symbol>+",
                "system": "cyclic|numeric|alphabetic|symbolic|additive|[fixed <integer>?]|[extends <counter-style-name>]"
            }
        },
        "document": {
            "prelude": "[<url>|url-prefix( <string> )|domain( <string> )|media-document( <string> )|regexp( <string> )]#",
            "descriptors": null
        },
        "font-face": {
            "prelude": null,
            "descriptors": {
                "ascent-override": "normal|<percentage>",
                "descent-override": "normal|<percentage>",
                "font-display": "[auto|block|swap|fallback|optional]",
                "font-family": "<family-name>",
                "font-feature-settings": "normal|<feature-tag-value>#",
                "font-variation-settings": "normal|[<string> <number>]#",
                "font-stretch": "<font-stretch-absolute>{1,2}",
                "font-style": "normal|italic|oblique <angle>{0,2}",
                "font-weight": "<font-weight-absolute>{1,2}",
                "font-variant": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>||stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )||[small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps]||<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero||<east-asian-variant-values>||<east-asian-width-values>||ruby]",
                "line-gap-override": "normal|<percentage>",
                "size-adjust": "<percentage>",
                "src": "[<url> [format( <string># )]?|local( <family-name> )]#",
                "unicode-range": "<urange>#"
            }
        },
        "font-feature-values": {
            "prelude": "<family-name>#",
            "descriptors": null
        },
        "import": {
            "prelude": "[<string>|<url>] [layer|layer( <layer-name> )]? [supports( [<supports-condition>|<declaration>] )]? <media-query-list>?",
            "descriptors": null
        },
        "keyframes": {
            "prelude": "<keyframes-name>",
            "descriptors": null
        },
        "layer": {
            "prelude": "[<layer-name>#|<layer-name>?]",
            "descriptors": null
        },
        "media": {
            "prelude": "<media-query-list>",
            "descriptors": null
        },
        "namespace": {
            "prelude": "<namespace-prefix>? [<string>|<url>]",
            "descriptors": null
        },
        "page": {
            "prelude": "<page-selector-list>",
            "descriptors": {
                "bleed": "auto|<length>",
                "marks": "none|[crop||cross]",
                "size": "<length>{1,2}|auto|[<page-size>||[portrait|landscape]]"
            }
        },
        "property": {
            "prelude": "<custom-property-name>",
            "descriptors": {
                "syntax": "<string>",
                "inherits": "true|false",
                "initial-value": "<string>"
            }
        },
        "scroll-timeline": {
            "prelude": "<timeline-name>",
            "descriptors": null
        },
        "supports": {
            "prelude": "<supports-condition>",
            "descriptors": null
        },
        "viewport": {
            "prelude": null,
            "descriptors": {
                "height": "<viewport-length>{1,2}",
                "max-height": "<viewport-length>",
                "max-width": "<viewport-length>",
                "max-zoom": "auto|<number>|<percentage>",
                "min-height": "<viewport-length>",
                "min-width": "<viewport-length>",
                "min-zoom": "auto|<number>|<percentage>",
                "orientation": "auto|portrait|landscape",
                "user-zoom": "zoom|fixed",
                "viewport-fit": "auto|contain|cover",
                "width": "<viewport-length>{1,2}",
                "zoom": "auto|<number>|<percentage>"
            }
        },
        "nest": {
            "prelude": "<complex-selector-list>",
            "descriptors": null
        }
    }
};
},{}],111:[function(require,module,exports){
module.exports = "2.3.1";
},{}],112:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":113}],113:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],114:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

exports.ArraySet = ArraySet;

},{"./util":119}],115:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = require('./base64');

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

},{"./base64":116}],116:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
exports.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
exports.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

},{}],117:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

exports.MappingList = MappingList;

},{"./util":119}],118:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ = require('./base64-vlq');
var util = require('./util');
var ArraySet = require('./array-set').ArraySet;
var MappingList = require('./mapping-list').MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util.getArg(aArgs, 'file', null);
  this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet();
  this._names = new ArraySet();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util.getArg(aArgs, 'generated');
    var original = util.getArg(aArgs, 'original', null);
    var source = util.getArg(aArgs, 'source', null);
    var name = util.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet();
    var newNames = new ArraySet();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util.join(aSourceMapPath, mapping.source)
          }
          if (sourceRoot != null) {
            mapping.source = util.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = ''

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util.relative(aSourceRoot, source);
      }
      var key = util.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

exports.SourceMapGenerator = SourceMapGenerator;

},{"./array-set":114,"./base64-vlq":115,"./mapping-list":117,"./util":119}],119:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

var MAX_CACHED_INPUTS = 32;

/**
 * Takes some function `f(input) -> result` and returns a memoized version of
 * `f`.
 *
 * We keep at most `MAX_CACHED_INPUTS` memoized results of `f` alive. The
 * memoization is a dumb-simple, linear least-recently-used cache.
 */
function lruMemoize(f) {
  var cache = [];

  return function(input) {
    for (var i = 0; i < cache.length; i++) {
      if (cache[i].input === input) {
        var temp = cache[0];
        cache[0] = cache[i];
        cache[i] = temp;
        return cache[0].result;
      }
    }

    var result = f(input);

    cache.unshift({
      input,
      result,
    });

    if (cache.length > MAX_CACHED_INPUTS) {
      cache.pop();
    }

    return result;
  };
}

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
var normalize = lruMemoize(function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);
  // Split the path into parts between `/` characters. This is much faster than
  // using `.split(/\/+/g)`.
  var parts = [];
  var start = 0;
  var i = 0;
  while (true) {
    start = i;
    i = path.indexOf("/", start);
    if (i === -1) {
      parts.push(path.slice(start));
      break;
    } else {
      parts.push(path.slice(start, i));
      while (i < path.length && path[i] === "/") {
        i++;
      }
    }
  }

  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
});
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

function compareByOriginalPositionsNoSource(mappingA, mappingB, onlyCompareOriginal) {
  var cmp

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositionsNoSource = compareByOriginalPositionsNoSource;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function compareByGeneratedPositionsDeflatedNoLine(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflatedNoLine = compareByGeneratedPositionsDeflatedNoLine;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || '';

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
      sourceRoot += '/';
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    var parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      var index = parsed.path.lastIndexOf('/');
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;

},{}],120:[function(require,module,exports){

const {getLengthUnits} = require('./modules/css-meta.js');

function initDynamicElements() {
  const inputDiv = document.querySelector(".inner");
  const inputElem = document.querySelector("input");
  const resultsDiv = document.querySelector(".results");

  let lengthUnits = ["px", "em", "v"];
  lengthUnits = getLengthUnits();

  inputElem.addEventListener("change", () => {
    inputDiv.style.width = inputElem.value;

    const result = document.createElement("div");
    result.className = "result";
    result.style.width = inputElem.value;
    result.innerHTML = `<code>width: ${inputElem.value}</code>`;
    resultsDiv.appendChild(result);


    inputElem.value = "";
    inputElem.focus();
  });
}

window.addEventListener("DOMContentLoaded", initDynamicElements);

},{"./modules/css-meta.js":121}],121:[function(require,module,exports){
const css = require('@webref/css');
const { definitionSyntax } = require('css-tree');

const parsedFiles =  css.listAll();
for (const [shortname, data] of Object.entries(parsedFiles)) {
  // do something with the json object

}

for (const [shortname, data] of Object.entries(parsedFiles)) {
  for (const property of data.properties) {
    if (property.value) {
      try {
        const ast = definitionSyntax.parse(property.value);
        // do something with the ast
      }
      catch {
        // one of the few value definitions that cannot yet be parsed by CSSTree
      }
    }
  }
}

function getLengthUnits() {
  let allCssJson = Object.entries(parsedFiles);
  allCssJson[""];
}

// export {getLengthUnits};
module.exports = {getLengthUnits};

},{"@webref/css":1,"css-tree":13}]},{},[120]);