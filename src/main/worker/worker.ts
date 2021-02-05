/* eslint-disable no-restricted-globals */
import { render } from 'react-nil';
import { PhysicsProps, WorkerMessageType } from './shared/types';
import { createElement } from 'react';
import {PHYSICS_UPDATE_RATE} from "./planckjs/config";

// because of some weird react/dev/webpack/something quirk
(self as any).$RefreshReg$ = () => {};
(self as any).$RefreshSig$ = () => () => {};

const selfWorker = (self as unknown) as Worker;

selfWorker.onmessage = (event: MessageEvent) => {
  const { type, props = {} } = event.data as {
    type: WorkerMessageType;
    props: any;
  };
  switch (type) {
    case WorkerMessageType.INIT:
      const { worldParams = {}, config = {} } = props as PhysicsProps;
      const {
        maxNumberOfDynamicObjects = 100,
        updateRate = PHYSICS_UPDATE_RATE,
      } = config;
      render(
        createElement(
          require('./app/index').App,
          {
            worker: selfWorker,
            config: {
              maxNumberOfDynamicObjects,
              updateRate,
            },
            worldParams,
          },
          null
        )
      );
      break;
  }
};
