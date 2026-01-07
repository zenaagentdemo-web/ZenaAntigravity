import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
    threshold?: number;
    onStart?: () => void;
    onFinish?: () => void;
    onCancel?: () => void;
}

export const useLongPress = (
    callback: () => void,
    { threshold = 500, onStart, onFinish, onCancel }: LongPressOptions = {}
) => {
    const [isPressing, setIsPressing] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isCanceled = useRef(false);

    const start = useCallback(() => {
        isCanceled.current = false;
        setIsPressing(true);
        onStart?.();

        timerRef.current = setTimeout(() => {
            if (!isCanceled.current) {
                callback();
                onFinish?.();
                setIsPressing(false);
            }
        }, threshold);
    }, [callback, threshold, onStart, onFinish]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (isPressing) {
            isCanceled.current = true;
            setIsPressing(false);
            onCancel?.();
        }
    }, [isPressing, onCancel]);

    return {
        handlers: {
            onMouseDown: start,
            onMouseUp: cancel,
            onMouseLeave: cancel,
            onTouchStart: start,
            onTouchEnd: cancel,
        },
        isPressing,
    };
};

export default useLongPress;
