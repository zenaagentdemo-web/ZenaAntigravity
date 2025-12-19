// ZenaAvatar components barrel export
export { ZenaAvatar } from './ZenaAvatar';
export type { ZenaAvatarProps, ZenaAvatarState, ZenaAvatarSize } from './ZenaAvatar';
export { ZenaAvatarFullScreen } from './ZenaAvatarFullScreen';
export type { ZenaAvatarFullScreenProps } from './ZenaAvatarFullScreen';

// Godot-based avatar
export { GodotAvatar } from './GodotAvatar';
export type { GodotAvatarHandle } from './GodotAvatar';

// Types for Godot communication
export type {
    VisemeCue,
    AnimationBeat,
    AnimationPlan,
    AvatarState,
    GodotMessage,
    GodotEvent,
    UseGodotBridgeOptions,
    VisemeDataFile,
} from './types';

// Hook for custom integrations
export { useGodotBridge } from './useGodotBridge';
