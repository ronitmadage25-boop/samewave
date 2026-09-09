import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function useSimulation(active: boolean = true) {
  const activeRoom = useAppStore((s) => s.activeRoom)
  const startSimulation = useAppStore((s) => s.startSimulation)
  const stopSimulation = useAppStore((s) => s.stopSimulation)

  useEffect(() => {
    if (!active || !activeRoom) {
      stopSimulation()
      return
    }

    startSimulation()

    return () => {
      stopSimulation()
    }
  }, [active, activeRoom?.topicId, startSimulation, stopSimulation])
}
