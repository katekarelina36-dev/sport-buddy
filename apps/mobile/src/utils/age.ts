export function calculateAge(dateOfBirth: string | Date): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export const MIN_ONBOARDING_AGE = 16;

// Bug fix batch (Round 6), Bug 2: the three-column DOB picker's default open
// state is "25 years ago, January 1st" — not today's month/day.
export function defaultDateOfBirth(): Date {
  return new Date(new Date().getFullYear() - 25, 0, 1);
}
