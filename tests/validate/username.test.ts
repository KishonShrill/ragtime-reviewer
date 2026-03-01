import { describe, it, expect } from "vitest";
import { isValidUsername } from "@/utils/verify";

describe("isValidUsername", () => {
    it("should allow valid usernames", () => {
        expect(isValidUsername("cj123")).toBe(true);
        expect(isValidUsername("cj_pingol")).toBe(true);
        expect(isValidUsername("CJ_2026")).toBe(true);
    });

    it("should reject invalid usernames", () => {
        expect(isValidUsername("")).toBe(false);
        expect(isValidUsername("cj")).toBe(false); // too little
        expect(isValidUsername("cj pingol")).toBe(false); // space
        expect(isValidUsername("cj@123")).toBe(false); // special char
        expect(isValidUsername("cj-123")).toBe(false); // dash not allowed
        expect(isValidUsername("cj!")).toBe(false);
    });
});
