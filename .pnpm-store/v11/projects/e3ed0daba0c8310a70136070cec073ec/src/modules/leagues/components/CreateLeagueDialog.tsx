import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLeague } from "../services/leagues.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
export function CreateLeagueDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [joinPolicy, setJoinPolicy] = useState<"open" | "request" | "invite_only">("request");
  const [maxPlayers, setMaxPlayers] = useState(10);

  const mutation = useMutation({
      mutationFn: createLeague,

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.leagues.all
        });

        toast.success("League created successfully");
        setOpen(false);

        setName("");
        setDescription("");
        setVisibility("public");
        setJoinPolicy("request");
        setMaxPlayers(10);
      },

      onError: (error) => toast.error(error.message || "Failed to create league")
    });

  async function handleSubmit() {
    mutation.mutate({
      name,
      description,
      visibility,
      join_policy: joinPolicy,
      max_players: maxPlayers
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button>
          Create League
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create League
          </DialogTitle>
        </DialogHeader>

        <div
          className="
            space-y-4
          "
        >
          <Input
            placeholder="League name"
            value={name}
            onChange={(e) => setName(e.target.value)
            }
          />

          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)
            }
          />

          <Select
            value={visibility}
            onValueChange={(value) =>
              setVisibility(
                value as "public" | "private"
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="public">
                Public
              </SelectItem>

              <SelectItem value="private">
                Private
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={joinPolicy}
            onValueChange={(value) =>
              setJoinPolicy(
                value as
                  | "open"
                  | "request"
                  | "invite_only"
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Join Policy" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="open">
                Open
              </SelectItem>

              <SelectItem value="request">
                Request Approval
              </SelectItem>

              <SelectItem value="invite_only">
                Invite Only
              </SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            min={2}
            max={100}
            value={maxPlayers}
            onChange={(e) =>
              setMaxPlayers(
                Number(e.target.value)
              )
            }
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              mutation.isPending
            }
          >
            {mutation.isPending
              ? "Creating..."
              : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
