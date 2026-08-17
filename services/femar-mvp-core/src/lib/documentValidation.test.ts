import { validateNationalDocument } from "./documentValidation";

describe("document validation", () => {
  it("accepts a valid Ecuadorian cedula only when the country and type require it", () => {
    expect(validateNationalDocument({ value: "0914832423", country: "EC", documentType: "cedula" }).ok).toBe(true);
    expect(validateNationalDocument({ value: "1111111111", country: "EC", documentType: "cedula" }).ok).toBe(false);
  });

  it("accepts non-Ecuador employee IDs and passports", () => {
    expect(validateNationalDocument({ value: "EMP-XP-001", country: "OTHER", documentType: "employee_id" }).ok).toBe(true);
    expect(validateNationalDocument({ value: "A1234567", country: "OTHER", documentType: "passport" }).ok).toBe(true);
  });

  it("keeps the Devpost judge sandbox identifier available", () => {
    expect(validateNationalDocument({ value: "DEVPOST-JUDGE", country: "OTHER", documentType: "employee_id" }).ok).toBe(true);
  });
});
