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

export function analyzeCode(code: string): number[] {
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
    const output: number[] = [];
    var variables = new Map();

    //Collect text(or other information) from every node and add it to the array
    function visitVariableStatement(node: ts.Node) {
        
        //check if node is a binary expression
        if (ts.isVariableDeclaration(node)) {
            var variableName : ts.Identifier | ts.BindingName = node.name;
            var variableValue : number = calculateBinaryExpression(node.initializer);

            variables.set(variableName, variableValue);
        }
    }
    // iterate through source file searching for variable statements
    visitNodeRecursive(sourceFile, visitVariableStatement);

    return output;
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

function calculateBinaryExpression(node: ts.Expression | undefined): number {
    if (node === undefined) {
        throw new Error("Expression is undefined");
    }

    if(ts.isBinaryExpression(node))
    {
        if (ts.isBinaryExpression(node.left)) {
            //calculatebinary on left
            return Operations[node.operatorToken.kind](
                calculateBinaryExpression(node.left),
                parseFloat(node.right.getText())
            );
        } else {
            //calculate normally
            return Operations[node.operatorToken.kind](
                parseFloat(node.left.getText()),
                parseFloat(node.right.getText())
            );
        }
    }
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
