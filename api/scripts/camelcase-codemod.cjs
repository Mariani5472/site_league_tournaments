const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(process.argv[2] || "src");
const names = new Map(Object.entries({
  league_id: "leagueId", user_id: "userId", lobby_id: "lobbyId", match_id: "matchId",
  owner_id: "ownerId", requester_id: "requesterId", request_id: "requestId", member_id: "memberId",
  candidate_id: "candidateId", voter_id: "voterId", created_by: "createdBy",
  max_players: "maxPlayers", team_number: "teamNumber", is_ready: "isReady",
  avatar_url: "avatarUrl", banner_url: "bannerUrl", join_policy: "joinPolicy",
  created_at: "createdAt", updated_at: "updatedAt", started_at: "startedAt", finished_at: "finishedAt",
  linked_at: "linkedAt", game_name: "gameName", tag_line: "tagLine",
  player_count: "playerCount", players_count: "playersCount", ready_count: "readyCount",
  available_slots: "availableSlots", is_full: "isFull", is_balanced: "isBalanced",
  everyone_ready: "everyoneReady", can_start: "canStart", can_join: "canJoin", can_vote: "canVote",
  team_selection: "teamSelection", team_selection_mode: "teamSelectionMode",
  team_selection_completed: "teamSelectionCompleted", team_selection_round: "teamSelectionRound",
  draft_captain_1: "draftCaptain1", draft_captain_2: "draftCaptain2", draft_pick_index: "draftPickIndex",
  captain_vote_ends_at: "captainVoteEndsAt", captain_vote: "captainVote",
  captain_1: "captain1", captain_2: "captain2", pick_number: "pickNumber", pick_index: "pickIndex",
  next_team: "nextTeam", available_players: "availablePlayers", ends_at: "endsAt",
  current_player: "currentPlayer", my_vote: "myVote", majority_required: "majorityRequired",
  winner_team: "winnerTeam", winner_team_number: "winnerTeamNumber", vote_count: "voteCount",
  resolution_type: "resolutionType", resolution_reason: "resolutionReason", resolved_by: "resolvedBy",
  nickname_snapshot: "nicknameSnapshot", games_played: "gamesPlayed", win_rate: "winRate",
  team_1: "team1", team_2: "team2"
}));

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : /\.tsx?$/.test(entry.name) ? [target] : [];
  });
}

const transformer = context => rootNode => {
  const visit = node => {
    if ((ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) && names.has(node.text)) {
      return ts.factory.createIdentifier(names.get(node.text));
    }
    return ts.visitEachChild(node, visit, context);
  };
  return ts.visitNode(rootNode, visit);
};

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
for (const file of files(root)) {
  const original = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const transformed = ts.transform(source, [transformer]).transformed[0];
  const output = printer.printFile(transformed);
  fs.writeFileSync(file, output);
}
