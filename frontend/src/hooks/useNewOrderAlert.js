import { useCallback, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import orderNotificationUrl from "../sound/order_notification.mp3";

const STORAGE_KEY = "hidden_oven_notified_order_ids";
const PENDING_STORAGE_KEY = "hidden_oven_pending_order_alert_ids";

function readKnownOrderIds() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function persistKnownOrderIds(orderIds) {
  const recentIds = [...orderIds].slice(-300);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentIds));
}

function readPendingOrderIds() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistPendingOrderIds(orderIds) {
  sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(orderIds));
}

export function useNewOrderAlert() {
  const audioRef = useRef(null);
  const knownOrderIdsRef = useRef(readKnownOrderIds());
  const initializedRef = useRef(
    sessionStorage.getItem(STORAGE_KEY) !== null ||
      sessionStorage.getItem(PENDING_STORAGE_KEY) !== null,
  );
  const pendingOrderIdsRef = useRef(readPendingOrderIds());
  const playingRef = useRef(false);
  const unlockedRef = useRef(false);
  const drainRef = useRef(() => {});

  const drain = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current || playingRef.current || pendingOrderIdsRef.current.length < 1) return;

    playingRef.current = true;
    audio.muted = false;
    audio.volume = 1;
    audio.currentTime = 0;
    audio.onended = () => {
      const playedOrderId = pendingOrderIdsRef.current.shift();
      if (playedOrderId) knownOrderIdsRef.current.add(playedOrderId);
      persistKnownOrderIds(knownOrderIdsRef.current);
      persistPendingOrderIds(pendingOrderIdsRef.current);
      playingRef.current = false;
      window.setTimeout(() => drainRef.current(), 150);
    };
    audio.play().catch(() => {
      playingRef.current = false;
      unlockedRef.current = false;
    });
  }, []);

  useEffect(() => {
    drainRef.current = drain;
  }, [drain]);

  useEffect(() => {
    const audio = new Audio(orderNotificationUrl);
    audio.preload = "auto";
    audio.load();
    audioRef.current = audio;

    const unlockAudio = async () => {
      if (unlockedRef.current || !audioRef.current) {
        drainRef.current();
        return;
      }
      try {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        unlockedRef.current = true;
        drainRef.current();
      } catch {
        unlockedRef.current = false;
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    const newOrdersQuery = query(
      collection(db, "orders"),
      where("status", "==", "NEW"),
    );
    const unsubscribe = onSnapshot(newOrdersQuery, (snapshot) => {
      const currentIds = snapshot.docs.map((doc) => doc.id);
      if (!initializedRef.current) {
        currentIds.forEach((orderId) => knownOrderIdsRef.current.add(orderId));
        persistKnownOrderIds(knownOrderIdsRef.current);
        initializedRef.current = true;
        return;
      }

      const incomingIds = currentIds.filter(
        (orderId) =>
          !knownOrderIdsRef.current.has(orderId) &&
          !pendingOrderIdsRef.current.includes(orderId),
      );
      if (!incomingIds.length) return;

      pendingOrderIdsRef.current.push(...incomingIds);
      persistPendingOrderIds(pendingOrderIdsRef.current);
      drainRef.current();
    }, (error) => {
      console.error("New-order alert listener error:", error);
    });

    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      audio.pause();
      audio.onended = null;
      audioRef.current = null;
    };
  }, []);
}
