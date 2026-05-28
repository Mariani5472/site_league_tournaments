import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "../hooks/useMyProfile";
import { updateProfile } from "../services/profile.service";
import { toast } from "sonner";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const {
    data: profile,
    isLoading
  } = useMyProfile();

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url ?? '');

  const mutation = useMutation({
    mutationFn: updateProfile,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-profile"]
      });

      toast.success("Profile updated");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  function handleSubmit() {
    mutation.mutate({
      nickname,
      avatar_url: avatarUrl || null,
      banner_url: bannerUrl || null
    });
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Profile
        </h1>

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
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? "Saving..."
            : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}