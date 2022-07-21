import exp from "constants";
import { analyzeCode, hello } from "../src/index";

test("basic", () => {
    const actual = hello();
    const expected = "hello";
    expect(actual).toBe(expected);
});

test("Arithmetic expression", () => {
    const code = "const x = 2 + 5 + 2;";

    const statements = analyzeCode(code);

    expect(statements).toStrictEqual([
        {
            variableName: "x",
            variableValue: 9,
        },
    ]);
});

test("Edit variable", () => {
    const code = `var y = 2 + 5 ;
                y = 2;`;

    const statements = analyzeCode(code);

    expect(statements).toStrictEqual([
        {
            variableName: "y",
            variableValue: 2,
        },
    ]);
});

test("Expression with multiple predefined variables", () => {
    const code = `const x = 2 + 5 ;
                const y = 6 + 1;
                const m = x + y;
                const z = 3;
                var f = m + 2;
                const j = 2 + z;
                const w = 6 + (5 + 2);
                w++;
                j--;`;

    const statements = analyzeCode(code);

    expect(statements).toStrictEqual([
        {
            variableName: "x",
            variableValue: 7,
        },
        {
            variableName: "y",
            variableValue: 7,
        },
        {
            variableName: "m",
            variableValue: 14,
        },
        {
            variableName: "z",
            variableValue: 3,
        },
        {
            variableName: "f",
            variableValue: 16,
        },
        {
            variableName: "j",
            variableValue: 4,
        },
        {
            variableName: "w",
            variableValue: 14,
        },
    ]);
});

// test("simple assignment", () => {
//     const code = "const x = 1 + 2";

//     const statements = analyzeCode(code);

//     expect(statements).toStrictEqual([
//         {
//             text: "const x = 1 + 2",
//         },
//     ]);
// });

// test("multi assignment", () => {
//     const code = `const x = 1 + 2;
//     if (x === 3) {
//         const y = 1;
//     }

//     `;

//     const statements = analyzeCode(code);

//     expect(statements).toStrictEqual([
//         {
//             text: "const x = 1 + 2;",
//         },
//         {
//             text: "const y = 1;",
//         },
//     ]);
// });
