# ADR-011: Separate player identity, tactical slot, and rotation position

## Status

Accepted — 2026-08-09.

## Decision

`Player` stores identity and registration data without a permanent tactical role. A set lineup owns
stable tactical slots; each slot has a role and current player occupant. The lineup maps these slots
to P1–P6, and rotation moves slot IDs between positions without changing role or occupant.

Jersey resolution follows `teamId + jerseyNumber → playerId → occupied slot → role and current
position`. Substitution replaces only the occupant of a slot. Líbero designation belongs to match
metadata, not permanent player identity.

## Consequences

- The same athlete may play different roles in different sets or formations.
- Tactical role and P1–P6 context are snapshotted on scout events for historical accuracy.
- Competition-specific roster, substitution, and libero limits can be layered later without changing
  player identity.
