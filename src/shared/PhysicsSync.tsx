import React, {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { PHYSICS_UPDATE_RATE } from '../main/worker/planckjs/config';
import { useWorkerOnMessage } from './WorkerOnMessageProvider';
import {
  WorkerMessageType,
  WorkerOwnerMessageType,
} from '../main/worker/shared/types';
import { useStoredData } from './StoredPhysicsData';
import { useUpdateMeshes } from './MeshSubscriptions';

type State = {
  onFixedUpdate: (callback: (delta: number) => void) => () => void;
  getPhysicsStepTimeRemainingRatio: (time: number) => number;
};

const Context = createContext((null as unknown) as State);

export const useGetPhysicsStepTimeRemainingRatio = () => {
  return useContext(Context).getPhysicsStepTimeRemainingRatio;
};

export const useFixedUpdate = (callback: (delta: number) => void) => {
  const onFixedUpdate = useContext(Context).onFixedUpdate;

  useEffect(() => {
    const unsubscribe = onFixedUpdate(callback);

    return () => {
      unsubscribe();
    };
  }, [onFixedUpdate, callback]);
};

const PhysicsSync: FC<{
  physicsUpdateRate: number,
  worker: Worker | MessagePort;
  noLerping?: boolean;
}> = ({ children, physicsUpdateRate, worker, noLerping = false }) => {
  const lastUpdateRef = useRef(Date.now());
  const countRef = useRef(0);
  const callbacksRef = useRef<{
    [key: string]: (delta: number) => void;
  }>({});
  const updateMeshes = useUpdateMeshes();

  const getPhysicsStepTimeRemainingRatio = useCallback(
    (previousTime: number) => {
      const nextExpectedUpdate =
        lastUpdateRef.current + physicsUpdateRate + 2.5;
      const time = Date.now();
      let ratio = (time - previousTime) / (nextExpectedUpdate - previousTime);
      ratio = ratio > 1 ? 1 : ratio;
      ratio = ratio < 0 ? 0 : ratio;
      return ratio;
    },
    [lastUpdateRef]
  );

  const onFixedUpdate = useCallback(
    (callback: (delta: number) => void) => {
      const key = countRef.current;
      countRef.current += 1;

      callbacksRef.current[key] = callback;

      const unsubscribe = () => {
        delete callbacksRef.current[key];
      };

      return unsubscribe;
    },
    [callbacksRef]
  );

  const onMessage = useWorkerOnMessage();
  const storedData = useStoredData();

  const debugRefs = useRef<{
    timer: any;
    hasReceived: boolean;
  }>({
    timer: null,
    hasReceived: false,
  });

  useEffect(() => {
    debugRefs.current.timer = setTimeout(() => {
      console.warn('over 1 second since last physics step...');
    }, 1000);

    const onPhysicsStep = () => {
      const lastUpdate = lastUpdateRef.current;
      const now = Date.now();
      const delta = !lastUpdate ? 1 / 60 : (now - lastUpdate) / 1000;
      lastUpdateRef.current = now;

      const callbacks = callbacksRef.current;

      Object.values(callbacks).forEach(callback => {
        callback(delta);
      });
    };

    let lastUpdate = Date.now()

    const unsubscribe = onMessage((event: MessageEvent) => {
      const type = event.data.type;

      if (type === WorkerOwnerMessageType.PHYSICS_STEP) {
        if (!noLerping) {
          const diff = Date.now() - lastUpdate
          if (diff > physicsUpdateRate) {
            // console.log('exceeds update rate', diff)
          }
        }
        lastUpdate = Date.now()
        debugRefs.current.hasReceived = true;
        if (debugRefs.current.timer) {
          clearInterval(debugRefs.current.timer);
        }
        debugRefs.current.timer = setTimeout(() => {
          console.warn('over 1 second since last physics step...');
        }, 1000);
        const positions = event.data.positions as Float32Array;
        const angles = event.data.angles as Float32Array;
        updateMeshes(positions, angles, noLerping);
        worker.postMessage(
          {
            type: WorkerMessageType.PHYSICS_STEP_PROCESSED,
            positions,
            angles,
            physicsTick: event.data.physicsTick as number,
          },
          [positions.buffer, angles.buffer]
        );

        if (event.data.bodies) {
          storedData.bodies = event.data.bodies.reduce(
            (acc: { [key: string]: number }, id: string) => ({
              ...acc,
              [id]: (event.data as any).bodies.indexOf(id),
            }),
            {}
          );
        }
        onPhysicsStep();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    onMessage,
    callbacksRef,
    lastUpdateRef,
    worker,
    updateMeshes,
    noLerping,
    storedData,
  ]);

  return (
    <Context.Provider
      value={{
        onFixedUpdate,
        getPhysicsStepTimeRemainingRatio,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default PhysicsSync;
