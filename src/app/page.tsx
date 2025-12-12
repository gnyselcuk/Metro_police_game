'use client';

import GameLayout from "@/components/game/GameLayout";
import MainMenu from "@/components/game/MainMenu";
import { useGameStore } from "@/lib/store";

export default function Home() {
  const scenario = useGameStore((state) => state.scenario);

  return (
    <main className="min-h-screen bg-black text-gray-100 overflow-hidden">
      {scenario ? <GameLayout /> : <MainMenu />}
    </main>
  );
}
