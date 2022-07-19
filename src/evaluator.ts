const operators: Record<string, string[]> = {
    "+": ["+"],
    "-": ["-"],
    "*": ["*", "**"],
    "/": ["/", "//"],
};

const OPERATIONS: Record<string, (a: number, b: number) => number> = {
    "+": (a: number, b: number): number => a + b,
    "-": (a: number, b: number): number => a - b,
    "*": (a: number, b: number): number => a * b,
    "/": (a: number, b: number): number => a / b,
    "**": (a: number, b: number): number => Math.pow(a, b),
    "//": (a: number, b: number): number => Math.floor(a / b),
};

/**
 * evaluate string expressions to arithmetic and return their value
 * @param expression : string
 */
export function arithmeticEvaluate(expression: string): number {
    // tokenize
    let i = -1;
    const tokens: string[] = [];
    let token = "";
    while (++i < expression.length) {
        const ch = expression[i];
        if (ch === " ") continue;

        if (ch === "(") {
            let innerExpression = "";
            let innerBrackets = 0;
            while (expression[++i] !== ")" || innerBrackets !== 0) {
                innerExpression += expression[i];

                if (expression[i] === "(") innerBrackets++;
                if (expression[i] === ")") innerBrackets--;

                if (i >= expression.length) {
                    throw Error("Closing brackets are missing");
                }
            }

            if (innerExpression.length) {
                const value = arithmeticEvaluate(innerExpression);
                token = String(value);
            }
        } else if (operators[ch] && token.length) {
            const ops = operators[ch];
            tokens.push(token);
            token = "";
            if (ops.length > 1) {
                // process longer operators
                let op = ch;
                while (ops.includes(op + expression[i + 1])) {
                    op += expression[++i];
                }
                tokens.push(op);
            } else {
                tokens.push(ch);
            }
        } else {
            token += ch;
        }
    }
    tokens.push(token);

    // calculate
    let result = 0;

    const calculate = (tokens: string[], predicate: (s: string) => boolean) => {
        i = 0;
        while (i + 1 < tokens.length) {
            const value1 = tokens[i];
            const op = tokens[i + 1];
            const value2 = tokens[i + 2];

            if (predicate(op)) {
                result = OPERATIONS[op](parseFloat(value1), parseFloat(value2));
                tokens.splice(i, 3, String(result));
            } else {
                i += 2;
            }
        }
    };

    // calculate top priority operations
    calculate(tokens, (op) => op !== "-" && op !== "+");
    calculate(tokens, (op) => op === "-" || op === "+");

    return result;
}
