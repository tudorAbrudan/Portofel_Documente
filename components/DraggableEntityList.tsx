import React, { useCallback, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Componentă de listă reorderabilă prin drag & drop.
 *
 * Interacțiune: long-press pe un rând → se activează modul drag; rândul urmărește
 * degetul, celelalte se dau la o parte pentru a arăta slotul de drop. La eliberare,
 * rândul aterizează în noul slot și `onReorder` primește lista reordonată.
 *
 * Detalii:
 * - Fiecare rând își raportează înălțimea (suport pentru înălțimi variabile).
 * - Auto-scroll când dragul e aproape de marginile verticale.
 * - Taps/scroll normal funcționează ca înainte — PanResponder preia gestul doar
 *   după ce long-press-ul activează modul drag.
 */

const EDGE_SCROLL_ZONE = 80;
const EDGE_SCROLL_SPEED = 6;
const LONG_PRESS_DELAY_MS = 380;

export interface DraggableEntityListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, info: { isActive: boolean; onLongPress: () => void }) => React.ReactNode;
  onReorder: (newOrder: T[]) => void;
  headerComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  contentContainerStyle?: React.ComponentProps<typeof ScrollView>['contentContainerStyle'];
  refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: React.ComponentProps<typeof ScrollView>['keyboardShouldPersistTaps'];
  keyboardDismissMode?: React.ComponentProps<typeof ScrollView>['keyboardDismissMode'];
  showsVerticalScrollIndicator?: boolean;
  disabled?: boolean;
  /** Ref extern la ScrollView-ul intern, pentru controale precum scrollTo. */
  scrollRef?: React.RefObject<ScrollView | null>;
}

function DraggableEntityListInner<T>(props: DraggableEntityListProps<T>) {
  const {
    data,
    keyExtractor,
    renderItem,
    onReorder,
    headerComponent,
    emptyComponent,
    contentContainerStyle,
    refreshControl,
    keyboardShouldPersistTaps,
    keyboardDismissMode,
    showsVerticalScrollIndicator = false,
    disabled = false,
    scrollRef: externalScrollRef,
  } = props;

  const internalScrollRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;
  const containerRef = useRef<View>(null);
  const itemHeightsRef = useRef<number[]>([]);
  const itemOffsetsRef = useRef<number[]>([]);
  const listPageYRef = useRef<number>(0);
  const listHeightRef = useRef<number>(0);
  const scrollYRef = useRef<number>(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);

  const dragTranslateY = useSharedValue(0);
  const draggedItemHeight = useSharedValue(0);

  // Refs sincronizate pentru citiri din handlere.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const hoverIndexRef = useRef(hoverIndex);
  hoverIndexRef.current = hoverIndex;
  const dataRef = useRef(data);
  dataRef.current = data;
  const dragStartPageYRef = useRef<number>(0);

  const recomputeOffsets = useCallback(() => {
    const offsets: number[] = [];
    let cum = 0;
    for (let i = 0; i < itemHeightsRef.current.length; i++) {
      offsets.push(cum);
      cum += itemHeightsRef.current[i] ?? 0;
    }
    itemOffsetsRef.current = offsets;
  }, []);

  const onItemLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (itemHeightsRef.current[index] !== h) {
        itemHeightsRef.current[index] = h;
        recomputeOffsets();
      }
    },
    [recomputeOffsets]
  );

  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    listHeightRef.current = e.nativeEvent.layout.height;
    // Poziția pe ecran (pageY) se măsoară la grant în handler, așa că nu avem nevoie aici.
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const computeHoverIndex = useCallback((fingerYInContent: number, dragIdx: number): number => {
    const offsets = itemOffsetsRef.current;
    const heights = itemHeightsRef.current;
    const n = heights.length;
    if (n === 0) return dragIdx;
    for (let i = 0; i < n; i++) {
      const top = offsets[i] ?? 0;
      const h = heights[i] ?? 0;
      const mid = top + h / 2;
      if (fingerYInContent < mid) return i;
    }
    return n - 1;
  }, []);

  const startAutoScroll = useCallback(
    (direction: 'up' | 'down') => {
      if (autoScrollTimerRef.current) return;
      autoScrollTimerRef.current = setInterval(() => {
        const current = scrollYRef.current;
        const target =
          direction === 'up' ? current - EDGE_SCROLL_SPEED : current + EDGE_SCROLL_SPEED;
        scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: false });
      }, 16);
    },
    [scrollRef]
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    setActiveIndex(-1);
    setHoverIndex(-1);
    dragTranslateY.value = 0;
    draggedItemHeight.value = 0;
    stopAutoScroll();
  }, [dragTranslateY, draggedItemHeight, stopAutoScroll]);

  const activateDragAt = useCallback(
    (index: number) => {
      if (disabled) return;
      draggedItemHeight.value = itemHeightsRef.current[index] ?? 0;
      dragTranslateY.value = 0;
      setActiveIndex(index);
      setHoverIndex(index);
    },
    [disabled, dragTranslateY, draggedItemHeight]
  );

  // Container PanResponder: preia gestul doar când o linie e activă (după long-press).
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => activeIndexRef.current !== -1,
      onMoveShouldSetPanResponderCapture: () => activeIndexRef.current !== -1,
      onPanResponderGrant: evt => {
        dragStartPageYRef.current = evt.nativeEvent.pageY;
        // Măsoară y-ul listei pe ecran — evităm să facem asta la mount (poate fi inexact
        // înainte ca layout-ul să se stabilizeze).
        containerRef.current?.measureInWindow((_x: number, y: number) => {
          listPageYRef.current = y;
        });
      },
      onPanResponderMove: (_evt, gesture) => {
        const active = activeIndexRef.current;
        if (active < 0) return;
        dragTranslateY.value = gesture.dy;

        const itemOriginalTop = itemOffsetsRef.current[active] ?? 0;
        const itemH = itemHeightsRef.current[active] ?? 0;
        const fingerYInContent = itemOriginalTop + itemH / 2 + gesture.dy;
        const newHoverIndex = computeHoverIndex(fingerYInContent, active);
        if (newHoverIndex !== hoverIndexRef.current) {
          setHoverIndex(newHoverIndex);
        }

        // Auto-scroll la margine.
        const absoluteY = dragStartPageYRef.current + gesture.dy;
        const distanceFromTop = absoluteY - listPageYRef.current;
        const distanceFromBottom = listPageYRef.current + listHeightRef.current - absoluteY;
        if (distanceFromTop < EDGE_SCROLL_ZONE && distanceFromTop >= 0) {
          startAutoScroll('up');
        } else if (distanceFromBottom < EDGE_SCROLL_ZONE && distanceFromBottom >= 0) {
          startAutoScroll('down');
        } else {
          stopAutoScroll();
        }
      },
      onPanResponderRelease: () => {
        const from = activeIndexRef.current;
        const to = hoverIndexRef.current;
        if (from < 0) {
          resetDragState();
          return;
        }
        if (to >= 0 && to !== from) {
          const newArr = dataRef.current.slice();
          const [moved] = newArr.splice(from, 1);
          newArr.splice(to, 0, moved);
          dragTranslateY.value = withTiming(0, { duration: 120 }, () => {
            runOnJS(onReorder)(newArr);
            runOnJS(resetDragState)();
          });
        } else {
          dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          resetDragState();
        }
      },
      onPanResponderTerminate: () => {
        dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        resetDragState();
      },
      onPanResponderTerminationRequest: () => activeIndexRef.current === -1,
    })
  ).current;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={onListLayout}
      {...panResponder.panHandlers}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        scrollEnabled={activeIndex === -1}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {headerComponent}
        {data.length === 0
          ? emptyComponent
          : data.map((item, index) => {
              const key = keyExtractor(item);
              const onLongPress = () => activateDragAt(index);
              return (
                <DraggableRow
                  key={key}
                  index={index}
                  activeIndex={activeIndex}
                  hoverIndex={hoverIndex}
                  dragTranslateY={dragTranslateY}
                  draggedItemHeight={draggedItemHeight}
                  onLayout={onItemLayout}
                >
                  {renderItem(item, { isActive: activeIndex === index, onLongPress })}
                </DraggableRow>
              );
            })}
      </ScrollView>
    </View>
  );
}

interface DraggableRowProps {
  index: number;
  activeIndex: number;
  hoverIndex: number;
  dragTranslateY: ReturnType<typeof useSharedValue<number>>;
  draggedItemHeight: ReturnType<typeof useSharedValue<number>>;
  onLayout: (index: number, e: LayoutChangeEvent) => void;
  children: React.ReactNode;
}

function DraggableRow({
  index,
  activeIndex,
  hoverIndex,
  dragTranslateY,
  draggedItemHeight,
  onLayout,
  children,
}: DraggableRowProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (index === activeIndex) {
      return {
        transform: [{ translateY: dragTranslateY.value }, { scale: 1.03 }],
        zIndex: 10,
        elevation: 10,
        shadowOpacity: 0.25,
        shadowRadius: 8,
      };
    }
    if (activeIndex < 0) {
      return {
        transform: [{ translateY: 0 }],
        zIndex: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
      };
    }
    const h = draggedItemHeight.value;
    let shift = 0;
    if (activeIndex < hoverIndex) {
      if (index > activeIndex && index <= hoverIndex) shift = -h;
    } else if (activeIndex > hoverIndex) {
      if (index >= hoverIndex && index < activeIndex) shift = h;
    }
    return {
      transform: [{ translateY: withTiming(shift, { duration: 150 }) }],
      zIndex: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
    };
  }, [index, activeIndex, hoverIndex]);

  return (
    <Animated.View style={animatedStyle} onLayout={e => onLayout(index, e)}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
});

export const DraggableEntityList = DraggableEntityListInner as <T>(
  props: DraggableEntityListProps<T>
) => React.ReactElement;

export { LONG_PRESS_DELAY_MS };
