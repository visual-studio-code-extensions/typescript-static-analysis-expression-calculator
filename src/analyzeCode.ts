import ts, {
    Identifier,
    nodeModuleNameResolver,
    tokenToString,
    visitNodes,
} from "typescript";
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
        //check if node is a binary expression
        if (ts.isVariableDeclaration(node)) {
            detectedVariableStatements.push({
                variableName: node.name.getText(),
                //TODO: can we reference detectedvariablestatements without passing it around?
                variableValue: processExpression(
                    node.initializer,
                    detectedVariableStatements
                ),
            });
        }
    }
    // iterate through source file searching for variable statements
    visitNodeRecursive(sourceFile, visitVariableStatement);

    return detectedVariableStatements;
}

const Operations: Record<number, (a: number, b: number) => number> = {
    39: (a: number, b: number): number => a + b,
    40: (a: number, b: number): number => a - b,
    41: (a: number, b: number): number => a * b,
    43: (a: number, b: number): number => a / b,
    44: (a: number, b: number): number => a % b,

    //424: (a: number, b: number): number => Math.pow(a, b),
    //23: (a: number, b: number): number => Math.floor(a / b),
};

function getValue(
    node: ts.NumericLiteral | ts.Identifier,
    detectedVariableStatements: VariableStatementAnalysis[]
): number {
    if (ts.isNumericLiteral(node)) {
        return parseFloat(node.getText());
    } else {
        const identifiervalue = detectedVariableStatements.find((variables) => {
            return variables.variableName === node.getText();
        });
        if (identifiervalue === undefined) {
            throw new Error(
                "Identifier cannot be found or undefined, please define a variable before using it"
            );
        }

        return identifiervalue.variableValue;
    }
}

function processExpression(
    node: ts.Expression | ts.NumericLiteral | undefined,
    detectedVariableStatements: VariableStatementAnalysis[]
): number {
    if (node === undefined) {
        throw new Error("Expression is undefined");
    }

    if (ts.isNumericLiteral(node)) {
        //in case variables were defined just with one numeric literal for example: const x = 2;
        return getValue(node, detectedVariableStatements);
    } else if (ts.isBinaryExpression(node)) {
        if (
            ts.isBinaryExpression(node.left) &&
            ts.isBinaryExpression(node.right)
        ) {
            //calculatebinary on left and right
            return Operations[node.operatorToken.kind](
                processExpression(node.left, detectedVariableStatements),
                processExpression(node.right, detectedVariableStatements)
            );
        } else if (
            ts.isBinaryExpression(node.left) &&
            (ts.isIdentifier(node.right) || ts.isNumericLiteral(node.right))
        ) {
            //calculatebinary on left only
            return Operations[node.operatorToken.kind](
                processExpression(node.left, detectedVariableStatements),
                getValue(node.right, detectedVariableStatements)
            );
        } else if (
            (ts.isIdentifier(node.left) || ts.isNumericLiteral(node.left)) &&
            (ts.isIdentifier(node.right) || ts.isNumericLiteral(node.right))
        ) {
            //base case, return after calculating numeric literals on left and right.
            return Operations[node.operatorToken.kind](
                getValue(node.left, detectedVariableStatements),
                getValue(node.right, detectedVariableStatements)
            );
        }
    } else {
        throw new Error("Cannot process this expression");
    }
    //TODO: can we get rid of this return statement?
    return -99999;
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
