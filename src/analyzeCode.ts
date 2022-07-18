import ts, { visitNodes } from "typescript";
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

    const detectedVariableStatements: VariableStatementAnalysis[] = [];

    function visitVariableStatement(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.VariableStatement) {
            const text = node.getText();
            detectedVariableStatements.push({
                text,
            });
        }
    }

    // iterate through source file searching for variable statements
    visitNodeRecursive(sourceFile, visitVariableStatement);
    // sourceFile.statements.forEach((node) => {
    //     visitNodeRecursive(node, visitVariableStatement);
    // });

    return detectedVariableStatements;
}

/**
 * recursively visits nodes and children
 * @param node
 * @param visit - visit is called for every node.
 */
function visitNodeRecursive(node: ts.Node, visit: (node: ts.Node) => void) {
    visit(node);
    node.getChildren().forEach((child) => visitNodeRecursive(child, visit));
}
