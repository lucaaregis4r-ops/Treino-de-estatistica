export interface CourtOrientation {
  readonly leftTeamId: string;
  readonly rightTeamId: string;
}

export function initialCourtOrientation(teamAId: string, teamBId: string): CourtOrientation {
  return { leftTeamId: teamAId, rightTeamId: teamBId };
}

export function swapCourtOrientation(orientation: CourtOrientation): CourtOrientation {
  return {
    leftTeamId: orientation.rightTeamId,
    rightTeamId: orientation.leftTeamId,
  };
}
