import type { PracticeRole } from "./types";

const ROTATING_ROLES = ["coach", "client", "observer"] as const;
type RotatingRole = (typeof ROTATING_ROLES)[number];

export type RoleAssignment = {
  memberId: string;
  role: PracticeRole;
};

export function assignPracticeRoles(memberIds: string[]): RoleAssignment[] {
  return memberIds.map((memberId, index) => ({
    memberId,
    role: ROTATING_ROLES[index] ?? "observer",
  }));
}

export function rotatePracticeRoles(
  assignments: RoleAssignment[],
): RoleAssignment[] {
  const next: Record<RotatingRole, RotatingRole> = {
    coach: "observer",
    client: "coach",
    observer: "client",
  };

  return assignments.map((assignment) => {
    if (!isRotatingRole(assignment.role)) return assignment;
    return { ...assignment, role: next[assignment.role] };
  });
}

function isRotatingRole(role: PracticeRole): role is RotatingRole {
  return role === "coach" || role === "client" || role === "observer";
}
