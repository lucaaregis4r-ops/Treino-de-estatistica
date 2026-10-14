import { pressureFromResponse } from '../../scout/entities/ContactQuality';
import type { PathStateDescriptor, RallyPathContact, RallyPathRally } from './RallyPathAnalyzer';

export interface RallyPathModelOptions {
  readonly unit?: 'exchange' | 'contact';
  readonly spatial?: 'zones' | 'none';
}

function contactState(contact: RallyPathContact, spatial: boolean): PathStateDescriptor {
  const originRegionId = spatial ? contact.spatial.originRegionId : undefined;
  const targetRegionId = spatial ? contact.spatial.targetRegionId : undefined;
  const base = [contact.teamId, contact.skill, contact.quality ?? null];
  return {
    key: JSON.stringify(originRegionId || targetRegionId
      ? [...base, contact.spatial.coordinateSystemVersion, originRegionId ?? null, targetRegionId ?? null] : base),
    teamId: contact.teamId, skill: contact.skill,
    ...(contact.quality !== undefined ? { quality: contact.quality } : {}),
    ...(spatial ? { originRegionId, targetRegionId } : {}),
  };
}

function canPair(sender: RallyPathContact, response?: RallyPathContact): response is RallyPathContact {
  if (!response || sender.teamId === response.teamId || sender.setNumber !== response.setNumber) return false;
  if (['point', 'ace', 'error', 'blocked'].includes(sender.event?.outcome ?? '')) return false;
  return (sender.skill === 'serve' && response.skill === 'reception') ||
    (sender.skill === 'attack' && (response.skill === 'dig' || response.skill === 'defense'));
}

/** Changes only the analytical projection. Raw events and capture order stay intact.
 * Both contacts share one step id, so their grading relationship never becomes a transition.
 */
export function projectRallyPathStates(rallies: readonly RallyPathRally[], options: RallyPathModelOptions): readonly RallyPathRally[] {
  const spatial = options.spatial !== 'none';
  return rallies.map(rally => {
    const contacts: RallyPathContact[] = [];
    for (let i = 0; i < rally.contacts.length; i++) {
      const sender = rally.contacts[i];
      const response = rally.contacts[i + 1];
      const stepId = sender.sourceEventId;
      if (options.unit !== 'contact' && canPair(sender, response)) {
        const sendingState = contactState(sender, spatial);
        const receivingState = contactState(response, spatial);
        const pressureQuality = pressureFromResponse(response.quality);
        const exchange = {
          teamId: sender.teamId, skill: sender.skill,
          pressureQuality,
          originRegionId: sendingState.originRegionId,
          targetRegionId: sendingState.targetRegionId,
        };
        // Sender grade is deliberately excluded: the observed response defines the exchange.
        const state: PathStateDescriptor = {
          ...receivingState,
          key: JSON.stringify(['exchange', sender.teamId, sender.skill, receivingState.key,
            spatial ? sender.spatial.coordinateSystemVersion : null,
            sendingState.originRegionId ?? null, sendingState.targetRegionId ?? null]),
          exchange,
        };
        contacts.push({ ...sender, state, analyticalStepId: stepId,
          ...((sender.quality === undefined || sender.quality === 'neutral') && pressureQuality
            ? { quality: pressureQuality, qualitySource: 'response' as const, recordedQuality: sender.quality }
            : { qualitySource: 'recorded' as const }),
          ...(pressureQuality ? { responsePressure: { quality: pressureQuality, sourceEventId: response.sourceEventId } } : {}) });
        contacts.push({ ...response, state, analyticalStepId: stepId });
        i++;
      } else {
        contacts.push({ ...sender, state: contactState(sender, spatial), analyticalStepId: stepId });
      }
    }
    return { ...rally, contacts: Object.freeze(contacts) };
  });
}

/** Consecutive exchanges with the same state remain separate observed steps. */
export function analyticalContacts(contacts: readonly RallyPathContact[]): readonly RallyPathContact[] {
  return contacts.filter((contact, index) => index === 0 || !contact.analyticalStepId ||
    contact.analyticalStepId !== contacts[index - 1].analyticalStepId);
}
