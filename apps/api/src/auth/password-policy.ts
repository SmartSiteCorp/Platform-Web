export const passwordMinLength = 12;
export const passwordMaxLength = 128;
export const passwordComplexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function isPasswordCompliant(password: string): boolean {
  return (
    password.length >= passwordMinLength &&
    password.length <= passwordMaxLength &&
    passwordComplexityPattern.test(password)
  );
}
