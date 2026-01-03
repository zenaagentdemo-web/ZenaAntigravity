# QA Automation Report - Headless Flow Test

## 1) Summary

- **Total pages discovered**: 6
- **Total clickable elements tested**: 156
- **Pass**: 56
- **Fail**: 19
- **Skipped**: 81

## 2) Failures Table

| Page/Route | Element | Expected | Actual | Errors | Screenshots |
| --- | --- | --- | --- | --- | --- |
| /ask-zena | 🎯Practice a tough client call | Stable UI transition or state change | Action triggered but reported errors | [RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection | [Before](qa-report/_ask-zena_🎯Practice_a_tough_client_call_before.png) / [After](qa-report/_ask-zena_🎯Practice_a_tough_client_call_after.png) |
| /ask-zena | Home | Stable UI transition or state change | Action triggered but reported errors | THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.post (http://localhost:5173/src/utils/apiClient.ts:196:38)
    at submitQuery (http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:772:34)<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>Failed to start recording: NotSupportedError: Not supported<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>Failed to start recording: NotSupportedError: Not supported<br>WebSocket connection to 'ws://localhost:5173/ws?token=dev-token-for-testing' failed: Connection closed before receiving a handshake response<br>WebSocket error: Event<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/hooks/useThreadsState.ts:24:34
    at http://localhost:5173/src/hooks/useThreadsState.ts:39:36
    at http://localhost:5173/src/hooks/useThreadsState.ts:107:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/hooks/useThreadsState.ts:24:34
    at http://localhost:5173/src/hooks/useThreadsState.ts:39:36
    at http://localhost:5173/src/hooks/useThreadsState.ts:107:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load conversations: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load conversations: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>WebSocket connection to 'ws://localhost:5173/ws?token=dev-token-for-testing' failed: Connection closed before receiving a handshake response<br>Failed to start recording: NotSupportedError: Not supported<br>WebSocket error: Event<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>Failed to start recording: NotSupportedError: Not supported<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.post (http://localhost:5173/src/utils/apiClient.ts:196:38)
    at submitQuery (http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:772:34)<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>Failed to start recording: NotSupportedError: Not supported<br>Failed to start recording: NotSupportedError: Not supported<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event | [Before](qa-report/_ask-zena_Home_before.png) / [After](qa-report/_ask-zena_Home_after.png) |
| / | LIVE | Stable UI transition or state change | Action triggered but reported errors | Failed to start recording: NotSupportedError: Not supported<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection | [Before](qa-report/__LIVE_before.png) / [After](qa-report/__LIVE_after.png) |
| / | Inbox | Stable UI transition or state change | Action triggered but reported errors | WebSocket connection to 'ws://localhost:5173/ws?token=dev-token-for-testing' failed: Connection closed before receiving a handshake response<br>WebSocket error: Event<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/hooks/useThreadsState.ts:24:34
    at http://localhost:5173/src/hooks/useThreadsState.ts:39:36
    at http://localhost:5173/src/hooks/useThreadsState.ts:107:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/hooks/useThreadsState.ts:24:34
    at http://localhost:5173/src/hooks/useThreadsState.ts:39:36
    at http://localhost:5173/src/hooks/useThreadsState.ts:107:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load conversations: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load conversations: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>WebSocket connection to 'ws://localhost:5173/ws?token=dev-token-for-testing' failed: Connection closed before receiving a handshake response<br>Failed to start recording: NotSupportedError: Not supported<br>WebSocket error: Event<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>Failed to start recording: NotSupportedError: Not supported<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.post (http://localhost:5173/src/utils/apiClient.ts:196:38)
    at submitQuery (http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:772:34)<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>[RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>Failed to start recording: NotSupportedError: Not supported<br>Failed to start recording: NotSupportedError: Not supported<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event | [Before](qa-report/__Inbox_before.png) / [After](qa-report/__Inbox_after.png) |
| /inbox | LIVE | Stable UI transition or state change | Action triggered but reported errors | Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load conversations: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load conversations: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:177:34
    at http://localhost:5173/src/pages/AskZenaPage/AskZenaPage.tsx:539:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22) | [Before](qa-report/_inbox_LIVE_before.png) / [After](qa-report/_inbox_LIVE_after.png) |
| /inbox | Home | Stable UI transition or state change | Action triggered but reported errors | THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry | [Before](qa-report/_inbox_Home_before.png) / [After](qa-report/_inbox_Home_after.png) |
| /deal-flow | Home | Stable UI transition or state change | Action triggered but reported errors | [RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry | [Before](qa-report/_deal-flow_Home_before.png) / [After](qa-report/_deal-flow_Home_after.png) |
| /deal-flow | Inbox | Stable UI transition or state change | Action triggered but reported errors | THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry | [Before](qa-report/_deal-flow_Inbox_before.png) / [After](qa-report/_deal-flow_Inbox_after.png) |
| /properties | LIVE | Stable UI transition or state change | Action triggered but reported errors | [RealTimeDataService] Connection failed - not connecting<br>[AskZena] Failed to establish WebSocket connection | [Before](qa-report/_properties_LIVE_before.png) / [After](qa-report/_properties_LIVE_after.png) |
| /properties | Home | Stable UI transition or state change | Action triggered but reported errors | Failed to start recording: NotSupportedError: Not supported<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry | [Before](qa-report/_properties_Home_before.png) / [After](qa-report/_properties_Home_after.png) |
| /properties | Contacts | Stable UI transition or state change | Action triggered but reported errors | [ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event | [Before](qa-report/_properties_Contacts_before.png) / [After](qa-report/_properties_Contacts_after.png) |
| /inbox | Contacts | Stable UI transition or state change | Action triggered but reported errors | [ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event | [Before](qa-report/_inbox_Contacts_before.png) / [After](qa-report/_inbox_Contacts_after.png) |
| / | Contacts | Stable UI transition or state change | Action triggered but reported errors | [ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event | [Before](qa-report/__Contacts_before.png) / [After](qa-report/__Contacts_after.png) |
| /ask-zena | Contacts | Stable UI transition or state change | Action triggered but reported errors | [ZenaBrain] Neural network error: Event<br>[ZenaBrain] Neural network error: Event | [Before](qa-report/_ask-zena_Contacts_before.png) / [After](qa-report/_ask-zena_Contacts_after.png) |
| /contacts | Select | Stable UI transition or state change | Action triggered but reported errors | Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load resource: net::ERR_CONNECTION_REFUSED<br>[API] Request failed: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load properties: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load properties: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load properties: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load properties: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>Failed to load properties: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19543:11)<br>Failed to load properties: TypeError: Failed to fetch
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:84:26)
    at Object.get (http://localhost:5173/src/utils/apiClient.ts:195:31)
    at loadProperties (http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:181:34)
    at http://localhost:5173/src/pages/PropertiesPage/PropertiesPage.tsx:175:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-QFMFQ3UP.js?v=ebe622c4:19500:22)<br>WebSocket connection to 'ws://localhost:5173/ws?token=dev-token-for-testing' failed: Connection closed before receiving a handshake response<br>WebSocket error: Event | [Before](qa-report/_contacts_Select_before.png) / [After](qa-report/_contacts_Select_after.png) |
| /contacts | 🔥 Hot Leads | Stable UI transition or state change | Action triggered but reported errors | Failed to load resource: the server responded with a status of 500 (Internal Server Error)<br>[API] Request failed: Error: HTTP 500: Internal Server Error
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:104:13)
    at async loadContacts (http://localhost:5173/src/pages/ContactsPage/ContactsPage.tsx:420:24)<br>GET http://localhost:3001/api/contacts?role=other&category=hot -> 500 | [Before](qa-report/_contacts_🔥_Hot_Leads_before.png) / [After](qa-report/_contacts_🔥_Hot_Leads_after.png) |
| /contacts | ❄️ Cold Nurture | Stable UI transition or state change | Action triggered but reported errors | Failed to load resource: the server responded with a status of 500 (Internal Server Error)<br>[API] Request failed: Error: HTTP 500: Internal Server Error
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:104:13)
    at async loadContacts (http://localhost:5173/src/pages/ContactsPage/ContactsPage.tsx:420:24)<br>GET http://localhost:3001/api/contacts?role=other&category=cold -> 500 | [Before](qa-report/_contacts_❄️_Cold_Nurture_before.png) / [After](qa-report/_contacts_❄️_Cold_Nurture_after.png) |
| /contacts | 🎯 High Intent | Stable UI transition or state change | Action triggered but reported errors | Failed to load resource: the server responded with a status of 500 (Internal Server Error)<br>[API] Request failed: Error: HTTP 500: Internal Server Error
    at apiRequest (http://localhost:5173/src/utils/apiClient.ts:104:13)
    at async loadContacts (http://localhost:5173/src/pages/ContactsPage/ContactsPage.tsx:420:24)<br>GET http://localhost:3001/api/contacts?role=other&category=intent -> 500 | [Before](qa-report/_contacts_🎯_High_Intent_before.png) / [After](qa-report/_contacts_🎯_High_Intent_after.png) |
| /contacts | Home | Stable UI transition or state change | Action triggered but reported errors | THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry<br>THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _BufferGeometry | [Before](qa-report/_contacts_Home_before.png) / [After](qa-report/_contacts_Home_after.png) |

## 3) Skipped (Destructive / Auth Required)

- **📞Who should I call right now?** (/ask-zena): Element not visible and not a skip link
- **📊Give me your daily debrief.** (/ask-zena): Element not visible and not a skip link
- **🌉Solve a deal roadblock.** (/ask-zena): Element not visible and not a skip link
- **Zena AI Avatar - Idle** (/): Element not visible and not a skip link
- **Start Zena Live** (/): Element not visible and not a skip link
- **Triage Emails** (/): Element not visible and not a skip link
- **Morning Brief** (/): Element not visible and not a skip link
- **Today's Tasks** (/): Element not visible and not a skip link
- **3NEW MESSAGES** (/): Element not visible and not a skip link
- **2DEAL FLOW** (/): Element not visible and not a skip link
- **7FOLLOW UP** (/): Element not visible and not a skip link
- **0Tasks** (/): Element not visible and not a skip link
- **Voice Note** (/): Element not visible and not a skip link
- **Search** (/): Element not visible and not a skip link
- **Calendar** (/): Element not visible and not a skip link
- **Add Deal** (/): Element not visible and not a skip link
- **Schedule Meeting** (/): Element not visible and not a skip link
- **07:36 AMin 44m🏠Property Viewing - Luxury Penthouse📍42 Harbour View(Penthouse)🗺️** (/): Element not visible and not a skip link
- **🗺️** (/): Element not visible and not a skip link
- **09:51 AMin 2h 59m👥Client Meeting - Sarah Chen📍Zena HQ, Level 12🗺️** (/): Element not visible and not a skip link
- **11:51 AMin 4h 59m🏠Open Home - Remuera Estate📍88 Victoria Ave(Estate)🗺️** (/): Element not visible and not a skip link
- **View all 4 appointments** (/): Element not visible and not a skip link
- **📧New inquiry from James Wilson about 42 Harbour View penthouse • 42 Harbour View12 min ago** (/): Element not visible and not a skip link
- **💼Offer accepted! $2.4M for 88 Victoria Ave - Awaiting conditions • 88 Victoria Ave • Victoria Ave Sale45 min ago** (/): Element not visible and not a skip link
- **🎤Voice note transcribed: "Follow up with Chen family about..."2 hours ago** (/): Element not visible and not a skip link
- **📅Viewing confirmed: Sarah Chen for Ponsonby townhouse tomorrow 2pm • 15 Ponsonby Rd3 hours ago** (/): Element not visible and not a skip link
- **🏠Price reduced: 23 Mission Bay Rd now listed at $1.85M (-$100K) • 23 Mission Bay Rd5 hours ago** (/): Element not visible and not a skip link
- **Home** (/): Element not visible and not a skip link
- **New3** (/inbox): Element not visible and not a skip link
- **Awaiting10** (/inbox): Element not visible and not a skip link
- **All** (/inbox): Element not visible and not a skip link
- **Go back to Home** (/inbox): Element not visible and not a skip link
- **Open search** (/inbox): Element not visible and not a skip link
- **Select** (/inbox): Element not visible and not a skip link
- **Create new folder** (/inbox): Element not visible and not a skip link
- **Refresh threads** (/inbox): Element not visible and not a skip link
- **More options** (/inbox): Element not visible and not a skip link
- **All** (/inbox): Element not visible and not a skip link
- **Buyers3** (/inbox): Element not visible and not a skip link
- **Vendors6** (/inbox): Element not visible and not a skip link
- **Normal7** (/inbox): Element not visible and not a skip link
- **High Risk3** (/inbox): Element not visible and not a skip link
- **Quick Reply** (/inbox): Element not visible and not a skip link
- **Archive thread** (/inbox): Element not visible and not a skip link
- **Forward thread** (/inbox): Element not visible and not a skip link
- **Delete thread** (/inbox): Destructive action detected by keyword
- **View Thread** (/inbox): Element not visible and not a skip link
- **Expand thread details** (/inbox): Element not visible and not a skip link
- **Inbox** (/inbox): Element not visible and not a skip link
- **Settled1** (/deal-flow): Element not visible and not a skip link
- **Finance Status Check** (/deal-flow): Element not visible and not a skip link
- **🧠NEEDS ZENA PREMIUM** (/deal-flow): Element not visible and not a skip link
- **Quick Check-In Call** (/deal-flow): Element not visible and not a skip link
- **Conditional Status Deep-Dive** (/deal-flow): Element not visible and not a skip link
- **Start Strategy Session** (/deal-flow): Element not visible and not a skip link
- **Go to Deal Flow** (/deal-flow): Element not visible and not a skip link
- **Selection Mode** (/properties): Element not visible and not a skip link
- **Grid View** (/properties): Element not visible and not a skip link
- **List View** (/properties): Element not visible and not a skip link
- **Add Property** (/properties): Element not visible and not a skip link
- **Sync** (/properties): Element not visible and not a skip link
- **Ask Zena** (/properties): Element not visible and not a skip link
- **All Properties** (/properties): Element not visible and not a skip link
- **Active** (/properties): Element not visible and not a skip link
- **Under Contract** (/properties): Element not visible and not a skip link
- **Sold** (/properties): Element not visible and not a skip link
- **Withdrawn** (/properties): Element not visible and not a skip link
- **All Types** (/properties): Element not visible and not a skip link
- **Residential** (/properties): Element not visible and not a skip link
- **Commercial** (/properties): Element not visible and not a skip link
- **Land** (/properties): Element not visible and not a skip link
- **Call Vendor** (/properties): Element not visible and not a skip link
- **Schedule Open Home** (/properties): Element not visible and not a skip link
- **Properties** (/properties): Element not visible and not a skip link
- **Compose** (/inbox): Element not visible and not a skip link
- **List View** (/contacts): Element not visible and not a skip link
- **Reset Filters** (/contacts): Destructive action detected by keyword
- **What does this score mean?** (/contacts): Element not visible and not a skip link
- **Compose Email** (/contacts): Element not visible and not a skip link
- **Call** (/contacts): Element not visible and not a skip link
- **Contacts** (/contacts): Element not visible and not a skip link

## 4) Recommendations

- **Data-TestId Coverage**: Suggest adding explicit `data-testid` to elements labelled as "Element X" to improve test stability.
- **Loading States**: Some interactions had slow network responses without visible indicators. Recommend adding spinners.
- **Error Handling**: Identified 19 interactions that produced console errors.
