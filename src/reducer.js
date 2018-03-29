/* @flow */

import { get, isEqual } from 'lodash';
import { Map, List } from 'immutable';
import actionTypes from './actionTypes';
import type {
  FluxAction,
  FluxActionWithPreviousIntent,
  FluxActionForRemoval,
  NetworkState,
} from './types';

export const initialState = Map({
  isConnected: true,
  actionQueue: List(),
});

function handleOfflineAction(
  state: NetworkState,
  {
    payload: { prevAction, prevThunk } = {},
    meta,
  }: FluxActionWithPreviousIntent,
): NetworkState {
  const isActionToRetry =
    typeof prevAction === 'object' && get(meta, 'retry') === true;

  const isThunkToRetry =
    typeof prevThunk === 'function' && get(prevThunk, 'meta.retry') === true;

  if (isActionToRetry || isThunkToRetry) {
    // If a similar action already existed on the queue, we remove it and push it again to the end of the queue
    const actionToLookUp = prevAction || prevThunk;
    const actionWithMetaData = typeof actionToLookUp === 'object'
      ? { ...actionToLookUp, meta }
      : actionToLookUp;

    return state.withMutations((map: *) =>
      map.update('actionQueue', (x: List<*>) =>
        x
          .filter((action: *) => isEqual(action, actionWithMetaData))
          .push(actionWithMetaData),
      ),
    );
  }
  return state;
}

function handleRemoveActionFromQueue(
  state: NetworkState,
  action: FluxActionForRemoval,
): NetworkState {
  return state.withMutations((map: *) =>
    map.update('actionQueue', (x: List<*>) =>
      x.filter((a: *) => isEqual(action, a)),
    ),
  );
}

function handleDismissActionsFromQueue(
  state: NetworkState,
  triggerActionToDismiss: string,
): NetworkState {
  const newActionQueue = List(
    state.actionQueue.filter((action: FluxAction) => {
      const dismissArray = get(action, 'meta.dismiss', []);
      return !dismissArray.includes(triggerActionToDismiss);
    }),
  );

  return state.withMutations((map: *) =>
    map.set('actionQueue', newActionQueue),
  );
}

export default function(
  state: NetworkState = initialState,
  action: *,
): NetworkState {
  switch (action.type) {
    case actionTypes.CONNECTION_CHANGE:
      return {
        ...state,
        isConnected: action.payload,
      };
    case actionTypes.FETCH_OFFLINE_MODE:
      return handleOfflineAction(state, action);
    case actionTypes.REMOVE_FROM_ACTION_QUEUE:
      return handleRemoveActionFromQueue(state, action.payload);
    case actionTypes.DISMISS_ACTIONS_FROM_QUEUE:
      return handleDismissActionsFromQueue(state, action.payload);
    default:
      return state;
  }
}
