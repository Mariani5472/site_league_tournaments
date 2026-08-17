import type { RiotAccount } from "@/modules/riot/types/riotAccount";
import { t } from "@/i18n";
type Props = {
    riotAccount: RiotAccount | null;
};
export function RiotAccountCard({ riotAccount }: Props) {
    return (<div className="
        rounded-xl
        border
        p-6
        space-y-4
      ">
      <h2 className="
          text-xl
          font-semibold
        ">
        {t("profile.riot")}
      </h2>

      {!riotAccount && (<div className="
            text-muted-foreground
          ">
          {t("profile.notLinked")}
        </div>)}

      {riotAccount && (<>
          <div>
            {riotAccount.gameName}
            #
            {riotAccount.tagLine}
          </div>

          <div className="
              text-sm
              text-muted-foreground
            ">
            {t("profile.linkedStatus")}
          </div>
        </>)}
    </div>);
}
