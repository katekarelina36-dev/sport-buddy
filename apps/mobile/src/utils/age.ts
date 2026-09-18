export function calculateAge(dateOfBirth: string | Date): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export const MIN_ONBOARDING_AGE = 16;

export function defaultDateOfBirth(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 25);
  return d;
}
