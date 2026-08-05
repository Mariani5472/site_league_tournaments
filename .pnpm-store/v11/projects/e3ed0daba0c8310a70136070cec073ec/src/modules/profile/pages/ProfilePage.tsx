import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "../hooks/useMyProfile";
import { updateProfile } from "../services/profile.service";
import { toast } from "sonner";
import { useMyRiotAccount } from "@/modules/riot/hooks/useMyRiotAccount";
import { RiotAccountCard } from "../components/riotAccount";
import { linkRiotAccount, unlinkAccount } from "@/modules/riot/services/riot.service";
import { queryKeys } from "@/lib/queryKeys";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useMyProfile();
  const riotQuery = useMyRiotAccount();
  const { data: profile, isLoading: accountLoading } = profileQuery;
  const { data: riotAccount, isLoading: riotLoading } = riotQuery;

  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || "");
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");

  const profileUpdateMutation = useMutation({
    mutationFn: updateProfile,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.me
      });

      toast.success("Profile updated");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const riotLinkMutation = useMutation({
    mutationFn: linkRiotAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.riot.me
      });

      toast.success("Riot account linked!");

      setGameName("");
      setTagLine("");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const riotUnlinkMutation = useMutation({
    mutationFn: unlinkAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.riot.me
      });

      toast.success("Riot account unlinked!");

      setGameName("");
      setTagLine("");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    (() => {
      setNickname(profile.nickname || "");
      setAvatarUrl(profile.avatar_url || "");
      setBannerUrl(profile.banner_url || "");
    })()

  }, [profile]);

  if (riotLoading || accountLoading) {
    return <p className="text-muted-foreground">Carregando perfil...</p>;
  }

  if (profileQuery.isError) return <div className="rounded-xl border p-6 space-y-3"><p className="text-destructive" role="alert">Não foi possível carregar seu perfil.</p><Button variant="outline" onClick={() => profileQuery.refetch()}>Tentar novamente</Button></div>;

  function handleSubmit() {
    profileUpdateMutation.mutate({
      nickname,
      avatar_url: avatarUrl || null,
      banner_url: bannerUrl || null
    });
  }

  function handleLinkRiot() {
    if (!gameName.trim()) {
      toast.error("Game Name required");
      return;
    }

    if (!tagLine.trim()) {
      toast.error("Tag Line required");
      return;
    }

    riotLinkMutation.mutate({
      gameName,
      tagLine
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Profile
        </h1>

        {bannerUrl && (
            <img
              src={bannerUrl}
              alt="Banner"
              className="
                w-full
                h-40
                rounded-lg
              "
            />
        )}

        {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="
                w-20
                h-20
                rounded-lg
                object-cover
              "
            />
        )}

        <p className="text-muted-foreground">
          Manage your account.
        </p>
      </div>

      <div className="rounded-xl border p-6 space-y-4">
        <div className="space-y-2">
          <label>Nickname</label>

          <Input
            value={nickname}
            onChange={(e) =>
              setNickname(e.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <label>Avatar URL</label>

          <Input
            value={avatarUrl}
            onChange={(e) =>
              setAvatarUrl(e.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <label>Banner URL</label>

          <Input
            value={bannerUrl}
            onChange={(e) =>
              setBannerUrl(e.target.value)
            }
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={profileUpdateMutation.isPending}
        >
          {profileUpdateMutation.isPending
            ? "Saving..."
            : "Save Changes"}
        </Button>

        {!riotAccount && (
          <div className="rounded-xl border p-6 space-y-4">
            <h2 className="text-xl font-semibold">
              Riot Account
            </h2>

            <Input
              placeholder="Game Name"
              value={gameName}
              onChange={(e) =>
                setGameName(e.target.value)
              }
            />

            <Input
              placeholder="Tag Line"
              value={tagLine}
              onChange={(e) =>
                setTagLine(e.target.value)
              }
            />

            <Button
              onClick={handleLinkRiot}
              disabled={riotLinkMutation.isPending}
            >
              {riotLinkMutation.isPending
                ? "Linking..."
                : "Link Riot Account"}
            </Button>
          </div>
        )}

        {riotAccount && (
          <>
          <RiotAccountCard
            riotAccount={riotAccount}
          />
          <Button
            onClick={() => riotUnlinkMutation.mutate()}
            disabled={riotUnlinkMutation.isPending}
          >
            {riotUnlinkMutation.isPending
              ? "Unlinking..."
              : "Unlink Riot Account"}
          </Button>
        </>
        )}
      </div>
    </div>
  );
}
