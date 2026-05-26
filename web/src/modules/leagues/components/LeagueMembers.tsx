import type { LeagueMember } from "../types/member";

type Props = { members: LeagueMember[]; };

export function LeagueMembers({ members }: Props) {
  console.log(members)
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
        {members.map((member) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}