import { Fixture } from 'planck-js';
import { FixtureUserData } from './types';
import { activeCollisionListeners } from './data';
import {
  sendCollisionBeginEvent,
  sendCollisionEndEvent,
} from '../../functions';

export const getFixtureData = (fixture: Fixture): FixtureUserData | null => {
  const userData = fixture.getUserData() as null | FixtureUserData;
  return userData || null;
};

export const getFixtureUuid = (data: FixtureUserData | null): string => {
  if (data && data['uuid']) {
    return data.uuid;
  }
  return '';
};

export const getFixtureIndex = (data: FixtureUserData | null): number => {
  if (data) {
    return data.fixtureIndex;
  }
  return -1;
};

export const handleBeginCollision = (fixtureA: Fixture, fixtureB: Fixture) => {
  const aData = getFixtureData(fixtureA);
  const bData = getFixtureData(fixtureB);
  const aUUID = getFixtureUuid(aData);
  const bUUID = getFixtureUuid(bData);

  if (aUUID && activeCollisionListeners[aUUID]) {
    sendCollisionBeginEvent(
      aUUID,
      bData,
      getFixtureIndex(aData),
      fixtureB.isSensor()
    );
  }

  if (bUUID && activeCollisionListeners[bUUID]) {
    sendCollisionBeginEvent(
      bUUID,
      aData,
      getFixtureIndex(bData),
      fixtureA.isSensor()
    );
  }
};

export const handleEndCollision = (fixtureA: Fixture, fixtureB: Fixture) => {
  const aData = getFixtureData(fixtureA);
  const bData = getFixtureData(fixtureB);
  const aUUID = getFixtureUuid(aData);
  const bUUID = getFixtureUuid(bData);

  if (aUUID && activeCollisionListeners[aUUID]) {
    sendCollisionEndEvent(
      aUUID,
      bData,
      getFixtureIndex(aData),
      fixtureB.isSensor()
    );
  }

  if (bUUID && activeCollisionListeners[bUUID]) {
    sendCollisionEndEvent(
      bUUID,
      aData,
      getFixtureIndex(bData),
      fixtureA.isSensor()
    );
  }
};
