import type { LeagueMember } from "../types/member";
import { canManageRole } from "../utils/permissions";

type Props = { 
  members: LeagueMember[];
  role: | "owner" | "admin" | "player" | "spec" | null;
  isAdmin: boolean; 
};

export function LeagueMembers({ members, role, isAdmin }: Props) {
  return (
    <div
      className="
        rounded-xl
        border
        p-6
      "
    >
      <h2
        className="
          mb-4
          text-xl
          font-semibold
        "
      >
        Members
      </h2>

      <div className="space-y-3">
        {members.map((member) => {
          const canManage = role && canManageRole(role, member.role);
          return (
            <div
              key={member.id}
              className="
                flex
                items-center
                justify-between
                rounded-lg
                border
                p-3
              "
            >
              <div>
                <p
                  className="
                    font-medium
                  "
                >
                  {member.nickname}
                </p>
              </div>

              <span
                className="
                  rounded-md
                  border
                  px-2
                  py-1
                  text-xs
                "
              >
                {member.role}
              </span>

              {isAdmin && canManage && (
                <div
                  className="
                    flex
                    gap-2
                  "
                >
                  <button
                    className="
                      rounded-md
                      border
                      px-2
                      py-1
                      text-xs
                    "
                  >
                    Change Role
                  </button>

                  <button
                    className="
                      rounded-md
                      border
                      px-2
                      py-1
                      text-xs
                      text-red-500
                    "
                  >
                    Kick
                  </button>
                </div>
              )}
            </div>
        )})}
      </div>
    </div>
  );
}