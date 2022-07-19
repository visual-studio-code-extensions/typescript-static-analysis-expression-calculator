import ts, { visitNodes } from "typescript";
import { createProgramFromFiles } from "./createProgramFromFiles";
import { VariableStatementAnalysis } from "./VariableStatementAnalysis";
import { arithmeticEvaluate } from "./evaluator";

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
    const detectedVariableStatements: VariableStatementAnalysis[] = [];

    //Collect text(or other information) from every node and add it to the array
    function visitVariableStatement(node: ts.Node) {
        // if (node.kind === ts.SyntaxKind.VariableStatement) {
        //     //getText() from the node and add it to the array.
        //     const text = node.getText();
        //     detectedVariableStatements.push({
        //         text,
        //     });
        // }

        //check if node is a binary expression
        if (ts.isBinaryExpression(node)) {
            //get the text for that node and push it to the array to be analyzed later
            const text = node.getText();
            detectedVariableStatements.push({
                text: text,
            });
        }
    }

    // iterate through source file searching for variable statements
    visitNodeRecursive(sourceFile, visitVariableStatement);

    // sourceFile.statements.forEach((node) => {
    //     visitNodeRecursive(node, visitVariableStatement);
    // });

    //Array to hold the calculations we just made
    const output: number[] = [];

    //For every expression in the expressions array
    for (const expression of detectedVariableStatements) {
        //calculate and add the result to the results array
        output.push(arithmeticEvaluate(expression.text));
    }

    if (output.length <= 0) {
        throw new Error("Cannot analyze this code");
    }

    return output;
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
