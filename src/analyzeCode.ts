import ts from "typescript";
import { createProgramFromFiles } from "./createProgramFromFiles";
import { VariableStatementAnalysis } from "./VariableStatementAnalysis";

/**
 * visit top level nodes and retrieve all VariableStatements.
 * @param code
 */
export function analyzeCode(code: string): VariableStatementAnalysis[] {
    const sourceFileName = "code.ts";

    const program = createProgramFromFiles(
        [
            {
                name: sourceFileName,
                data: code,
            },
        ],
        {}
    );

    const sourceFile = program.getSourceFile(sourceFileName);

    if (sourceFile === undefined) {
        throw new Error("sourceFile is undefined");
    }

    //Create array that will hold the variables that we want to work with.
    const detectedVariableStatements: VariableStatementAnalysis[] = [];

    //Collect text(or other information) from every node and add it to the array
    function visitVariableStatement(node: ts.Node) {
        //check if node is a variable declaration
        if (ts.isVariableDeclarationList(node)) {
            const variableType = node.getChildAt(0);
            //calculate the value of that variable and add it to the variables array
            const expression = node.declarations[0];
            const variableValue = processExpression(
                //variable declartion will be most of the time after the equal sign so we are only working with one and can refer it with [0]
                //get the expression of the variable declaration
                expression.initializer,
                detectedVariableStatements
            );

            if (variableValue === undefined) {
                throw Error("Value is undefined");
            }
            detectedVariableStatements.push({
                variableName: expression.name.getText(),

                variableValue: variableValue,

                variableText: node.getText(),

                variableType: variableType.getText(),
            });
            //else if its an expression statement for example defining a variable and changing its value later
            //TODO: should check if its a const or a var
        } else if (ts.isExpressionStatement(node)) {
            const nodeExpression = node.expression;
            //calculate binary expression and update its value
            if (ts.isBinaryExpression(nodeExpression)) {
                const elementIndex = detectedVariableStatements.findIndex(
                    (variables) => {
                        return (
                            variables.variableName ===
                            nodeExpression.left.getText()
                        );
                    }
                );
                //variable not found in the array
                if (elementIndex === -1) {
                    throw new Error("Variable not defined");
                }

                const variableValue = processExpression(
                    nodeExpression.right,
                    detectedVariableStatements
                );

                if (variableValue === undefined) {
                    throw Error("Value is undefined");
                }

                //since right would always be binary expression we want to process that and update the variable value
                detectedVariableStatements[elementIndex].variableValue =
                    variableValue;

                //else if we encounter a i++ or i-- case
            } else if (ts.isPostfixUnaryExpression(nodeExpression)) {
                //Work in progress
                const elementIndex = detectedVariableStatements.findIndex(
                    (variables) => {
                        return (
                            variables.variableName ===
                            nodeExpression.operand.getText()
                        );
                    }
                );

                //variable not found
                if (elementIndex === -1) {
                    throw new Error("Variable not defined");
                }

                //Apply the correct operation
                detectedVariableStatements[elementIndex].variableValue =
                    postFixUnaryExpression[nodeExpression.operator](
                        detectedVariableStatements[elementIndex].variableValue
                    );
            }
        }
    }
    // iterate through source file searching for variable statements
    visitNodeRecursive(sourceFile, visitVariableStatement);

    return detectedVariableStatements;
}

//TODO: can we merge from a record to something else that supports boolean
const operations: Record<number, (a: number, b: number) => number> = {
    39: (a, b) => a + b,
    40: (a, b) => a - b,
    41: (a, b) => a * b,
    42: (a, b) => a ** b,
    43: (a, b) => a / b,
    44: (a, b) => a % b,
};

const boolOperations: Record<number, (a: number, b: number) => boolean> = {
    //build throws an error for the below two lines, must find a workaround
    // 34: (a, b) => a == b,
    // 35: (a, b) => a != b,
    36: (a, b) => a === b,
    37: (a, b) => a !== b,
};

const postFixUnaryExpression: Record<number, (a: number) => number> = {
    45: (a) => a + 1,
    46: (a) => a - 1,
    // 39: (a) => +a,
    // 40: (a) => -a,
};

const preFixUnaryExpression: Record<number, (a: number) => number> = {
    45: (a) => a + 1,
    46: (a) => a - 1,
    39: (a) => +a,
    40: (a) => -a,
};

function processExpression(
    node:
        | ts.Expression
        | ts.NumericLiteral
        | ts.Identifier
        | ts.ParenthesizedExpression
        | ts.PrefixUnaryExpression
        | undefined,
    detectedVariableStatements: VariableStatementAnalysis[]
): number | undefined {
    if (node === undefined) {
        throw new Error("Expression is undefined");
    }

    if (ts.isBinaryExpression(node)) {
        const left = processExpression(node.left, detectedVariableStatements);
        const right = processExpression(node.right, detectedVariableStatements);
        if (left !== undefined && right !== undefined) {
            return operations[node.operatorToken.kind](left, right);
        } else {
            return undefined;
        }
    } else if (ts.isNumericLiteral(node)) {
        //in case variables were defined just with one numeric literal for example: const x = 2;
        return parseFloat(node.getText());
    } else if (ts.isIdentifier(node)) {
        const identifiervalue = detectedVariableStatements.find((variables) => {
            return variables.variableName === node.getText();
        });
        if (identifiervalue === undefined) {
            throw new Error(
                "Identifier cannot be found or undefined, please define a variable before using it"
            );
        }

        return identifiervalue.variableValue;
    } else if (ts.isParenthesizedExpression(node)) {
        //in case we encounter a (...) situation, for example const a = 2 + (2 + 4)
        return processExpression(node.expression, detectedVariableStatements);
    } else if (ts.isPrefixUnaryExpression(node)) {
        if (ts.isIdentifier(node.operand)) {
            //Case where we are doing ++i or --i
            const elementIndex = detectedVariableStatements.findIndex(
                (variables) => {
                    return variables.variableName === node.operand.getText();
                }
            );
            //variable not found
            if (elementIndex === -1) {
                throw new Error("Variable not defined");
            }
            //Apply the correct operation
            return preFixUnaryExpression[node.operator](
                detectedVariableStatements[elementIndex].variableValue
            );
        } else {
            if (
                node.operator === ts.SyntaxKind.PlusPlusToken ||
                node.operator === ts.SyntaxKind.MinusMinusToken
            ) {
                //Can't do --4 or ++3 when defining a variable
                throw new Error(
                    "The operand of an increment or decrement operator must be a variable or a propert"
                );
            }
            const value = processExpression(
                node.operand,
                detectedVariableStatements
            );
            if (value !== undefined) {
                return preFixUnaryExpression[node.operator](value);
            } else {
                return undefined;
            }
        }
    } else {
        throw new Error("Cannot process this expression");
    }
}

/**
 * recursively visits nodes and children
 * @param node
 * @param visit - visit is called for every node.
 */
function visitNodeRecursive(node: ts.Node, visit: (node: ts.Node) => void) {
    //Call method on every node
    visit(node);
    node.getChildren().forEach((child) => visitNodeRecursive(child, visit));
}

//For future parse and reparse whenever file changes
//return full line text
//ts.getLineAndCharacter
