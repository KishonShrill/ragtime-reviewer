import { describe, it, expect } from "vitest";
import { isValidPassword } from "@/utils/verify";

describe("isValidPassword", () => {
    it("should allow valid passwords", () => {
        expect(isValidPassword("password1")).toBe(true);
        expect(isValidPassword("pass1234")).toBe(true);
    });

    it("should reject invalid usernames", () => {
        expect(isValidPassword("PASSWORD1")).toBe(false); // no lowercase
        expect(isValidPassword("password")).toBe(false);  // no number
        expect(isValidPassword("pass1")).toBe(false);     // too short    
    });
});
