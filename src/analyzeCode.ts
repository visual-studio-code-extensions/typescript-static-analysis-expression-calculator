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
        if (ts.isVariableDeclaration(node)) {
            //calculate the value of that variable and add it to the variables array
            detectedVariableStatements.push({
                variableName: node.name.getText(),

                //TODO: can we reference detectedvariablestatements without passing it around?
                variableValue: processExpression(
                    node.initializer,
                    detectedVariableStatements
                ),
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
                //since right would always be binary expression we want to process that and update the variable value
                detectedVariableStatements[elementIndex].variableValue =
                    processExpression(
                        nodeExpression.right,
                        detectedVariableStatements
                    );

                //else if we encounter a i++ or i-- case
            } else if (ts.isPostfixUnaryExpression(nodeExpression)) {
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
                    PostfixUnaryExpressionOp[nodeExpression.operator](
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
const Operations: Record<number, (a: number, b: number) => number> = {
    39: (a: number, b: number): number => a + b,
    40: (a: number, b: number): number => a - b,
    41: (a: number, b: number): number => a * b,
    42: (a: number, b: number): number => a ** b,
    43: (a: number, b: number): number => a / b,
    44: (a: number, b: number): number => a % b,
};

const BoolOperations: Record<number, (a: number, b: number) => boolean> = {
    36: (a: number, b: number): boolean => a === b,
    37: (a: number, b: number): boolean => a !== b,
    //  : (a:number, b:number): boolean => a == b,
    //  : (a:number, b:number): boolean => a != b
};

const PostfixUnaryExpressionOp: Record<number, (a: number) => number> = {
    45: (a: number): number => a + 1,
    46: (a: number): number => a - 1,
};

function processExpression(
    node:
        | ts.Expression
        | ts.NumericLiteral
        | ts.Identifier
        | ts.ParenthesizedExpression
        | undefined,
    detectedVariableStatements: VariableStatementAnalysis[]
): number {
    if (node === undefined) {
        throw new Error("Expression is undefined");
    }

    if (ts.isBinaryExpression(node)) {
        return Operations[node.operatorToken.kind](
            processExpression(node.left, detectedVariableStatements),
            processExpression(node.right, detectedVariableStatements)
        );
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
    } else {
        throw new Error("Cannot process this expression");
    }
    //TODO: can we get rid of this return statement?
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
