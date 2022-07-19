import exp from "constants";
import { analyzeCode, hello } from "../src/index";

test("basic", () => {
    const actual = hello();
    const expected = "hello";
    expect(actual).toBe(expected);
});

test("Arithmetic expression", () => {
    const code = "const x = 2 + 5";

    const statements = analyzeCode(code);

    expect(statements).toStrictEqual([7]);
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
