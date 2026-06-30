import { Button } from "@/components/ui/button";

interface Props {
  join: () => void;
  leave: () => void;
  ready: () => void;
  switchTeam: () => void;
  startMatch?: () => void; //TODO: FUNCAO
  isLoading?: boolean;
}

export function LobbyActions({
  join,
  leave,
  ready,
  switchTeam,
  startMatch,
  isLoading,
}: Props) {

  return (

    <div
      className="
        rounded-xl
        border
        p-5
        flex
        gap-3
        flex-wrap
      "
    >

      <Button
        onClick={join}
      >
        Join
      </Button>

      <Button
        variant="secondary"
        onClick={ready}
      >
        Ready
      </Button>

      <Button
        variant="outline"
        onClick={switchTeam}
      >
        Switch Team
      </Button>

      <Button
        variant="outline"
        onClick={leave}
      >
        Leave
      </Button>

      <Button
        disabled={isLoading}
        onClick={startMatch}
      >
        Start Match
      </Button>

    </div>

  );

}