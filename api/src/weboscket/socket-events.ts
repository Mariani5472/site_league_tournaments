export const SOCKET_EVENTS = {
  LEAGUE_JOIN: "league:join",
  LEAGUE_LEAVE: "league:leave",
  LEAGUE_UPDATE: "league:update",
  LEAGUE_MEMBERS_UPDATE: "league_members:update",
  LEAGUE_REQUESTS_UPDATED: "league_members:update",

  LOBBY_JOIN: "lobby:join",
  LOBBY_LEAVE: "lobby:leave",
  LOBBY_READY: "lobby:ready",
  LOBBY_UPDATE: "lobby:update",
  LOBBY_DELETE: "lobby:delete",
  LOBBY_TEAM_CHANGE: "lobby:team-change",

  MATCH_CREATED: "match:created",
  MATCH_STARTED: "match:started",
  MATCH_VOTE: "match:vote",
  MATCH_FINISHED: "match:finished",

  CHAT_MESSAGE: "chat:message",
  CHAT_TYPING: "chat:typing"
};