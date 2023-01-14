/**
 * To generate tests for ESM:
 * $> npm run build:test
 */
const {expect} = require("chai");

describe("On cjs/index.cjs", () =>
{
    it("should work", function ()
    {
        const result = true;
        expect(result).to.equal(true);
    });

});