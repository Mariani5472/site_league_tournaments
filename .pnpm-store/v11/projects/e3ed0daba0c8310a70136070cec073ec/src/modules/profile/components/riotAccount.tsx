import type { RiotAccount } from "@/modules/riot/types/riotAccount";

type Props = { riotAccount: RiotAccount | null; };

export function RiotAccountCard({
  riotAccount
}: Props) {
  
  return (
    <div
      className="
        rounded-xl
        border
        p-6
        space-y-4
      "
    >
      <h2
        className="
          text-xl
          font-semibold
        "
      >
        Riot Account
      </h2>

      {!riotAccount && (
        <div
          className="
            text-muted-foreground
          "
        >
          No Riot account linked
        </div>
      )}

      {riotAccount && (
        <>
          <div>
            {riotAccount.game_name}
            #
            {
              riotAccount.tag_line
            }
          </div>

          <div
            className="
              text-sm
              text-muted-foreground
            "
          >
            Linked
          </div>
        </>
      )}
    </div>
  );
}