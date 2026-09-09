import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { advertiseRoomInLobby } from '@/services/rooms'
import type { Participant, RoomType, Thought, ThoughtType, WhiteboardStroke, Category } from '@/types'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

// Add optional TURN server from environment if configured
const turnUrl = import.meta.env.VITE_TURN_SERVER_URL
if (turnUrl) {
  ICE_SERVERS.push({
    urls: turnUrl,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  })
}

export type MediaPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

interface PeerConnectionData {
  peerId: string
  pc: RTCPeerConnection
  remoteStream: MediaStream
  iceCandidatesQueue: RTCIceCandidateInit[]
}

export interface FloatingReaction {
  id: string
  emoji: string
  authorName: string
  colorSeed: number
}

interface UseEphemeralRoomOptions {
  roomId: string | undefined
  roomType: RoomType
  roomTitle?: string
  roomCategory?: Category
  enabled?: boolean
}

export function useEphemeralRoom({
  roomId,
  roomType,
  roomTitle = 'Wavelength Space',
  roomCategory = 'Tech',
  enabled = true,
}: UseEphemeralRoomOptions) {
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isMuted, setIsMuted] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(roomType === 'video')
  const [micPermission, setMicPermission] = useState<MediaPermissionState>('idle')
  const [cameraPermission, setCameraPermission] = useState<MediaPermissionState>('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [handRaised, setHandRaised] = useState(false)

  // Participants & interactions (purely ephemeral, zero DB)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [hasEnded, setHasEnded] = useState(false)

  // Refs
  const peerConnectionsRef = useRef<Map<string, PeerConnectionData>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onWhiteboardStrokeRef = useRef<((stroke: WhiteboardStroke) => void) | null>(null)

  // ── 1. Acquire Local Media (Audio/Video) ──────────────────────────────────
  const initLocalMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission('unavailable')
      setCameraPermission('unavailable')
      return null
    }

    const wantVideo = roomType === 'video'
    setMicPermission('requesting')
    if (wantVideo) setCameraPermission('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: wantVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
      })

      localStreamRef.current = stream
      setLocalStream(stream)
      setMicPermission('granted')
      if (wantVideo) setCameraPermission('granted')

      // Initial track states
      // Mic starts muted by default for clean entry
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      setIsMuted(true)

      if (wantVideo) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = true
        })
        setIsCameraOn(true)
      }

      // Audio analysis for real speaking level
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.5
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        audioContextRef.current = audioCtx
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        speakingIntervalRef.current = setInterval(() => {
          if (!analyserRef.current || !localStreamRef.current) return
          const audioTrack = localStreamRef.current.getAudioTracks()[0]
          if (!audioTrack || !audioTrack.enabled) {
            setIsSpeaking(false)
            return
          }
          analyserRef.current.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
          setIsSpeaking(avg > 15)
        }, 150)
      } catch (e) {
        console.warn('[useEphemeralRoom] Audio analyser setup notice:', e)
      }

      // Attach tracks to existing peer connections if any
      for (const { pc } of peerConnectionsRef.current.values()) {
        stream.getTracks().forEach((track) => {
          const senders = pc.getSenders()
          const sender = senders.find((s) => s.track?.kind === track.kind)
          if (sender) {
            sender.replaceTrack(track).catch(console.error)
          } else {
            pc.addTrack(track, stream)
          }
        })
      }

      return stream
    } catch (err: unknown) {
      const error = err as Error
      console.warn('[useEphemeralRoom] getUserMedia failed:', error.name, error.message)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermission('denied')
        if (wantVideo) setCameraPermission('denied')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMicPermission('unavailable')
        if (wantVideo) setCameraPermission('unavailable')
      } else {
        setMicPermission('unavailable')
        if (wantVideo) setCameraPermission('unavailable')
      }
      return null
    }
  }, [roomType])

  // ── 2. Helper: Clean up a Single Peer Connection ───────────────────────────
  const cleanupPeer = useCallback((peerId: string) => {
    const peer = peerConnectionsRef.current.get(peerId)
    if (peer) {
      try {
        peer.pc.close()
      } catch {}
      peerConnectionsRef.current.delete(peerId)
    }
    setRemoteStreams((prev) => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  // ── 3. Helper: Create RTCPeerConnection for a Remote Peer ──────────────────
  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    const existing = peerConnectionsRef.current.get(remoteUserId)
    if (existing) {
      return existing.pc
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const remoteStream = new MediaStream()
    const peerData: PeerConnectionData = {
      peerId: remoteUserId,
      pc,
      remoteStream,
      iceCandidatesQueue: [],
    }

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // On remote track received
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
          remoteStream.addTrack(track)
        }
      })
      setRemoteStreams((prev) => {
        const next = new Map(prev)
        next.set(remoteUserId, remoteStream)
        return next
      })
    }

    // On ICE candidate discovered
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current && user) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-ice',
          payload: {
            fromUserId: user.id,
            toUserId: remoteUserId,
            candidate: event.candidate.toJSON(),
          },
        })
      }
    }

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(remoteUserId)
      }
    }

    peerConnectionsRef.current.set(remoteUserId, peerData)
    return pc
  }, [user, cleanupPeer])

  // ── 4. Main Realtime Channel (Presence + WebRTC Signaling + Ephemeral Bus) ─
  useEffect(() => {
    if (!roomId || !enabled || !user || !profile) return

    let isSubscribed = true
    const channelName = `samewave-room-${roomId}`

    // Ensure local media is initialized
    initLocalMedia().then(() => {
      if (!isSubscribed) return

      // Create SINGLE deterministic channel
      const channel = supabase.channel(channelName, {
        config: { presence: { key: user.id } },
      })
      channelRef.current = channel

      // ── PRESENCE SYNC ───────────────────────────────────────────────────────
      channel
        .on('presence', { event: 'sync' }, () => {
          if (!isSubscribed) return
          const state = channel.presenceState()
          const nextParticipants: Participant[] = []

          for (const [, presences] of Object.entries(state)) {
            const list = presences as unknown as Array<{
              userId: string
              name: string
              initials: string
              avatarUrl: string | null
              isMuted: boolean
              hasVideo: boolean
              handRaised: boolean
              colorSeed?: number
            }>
            if (list.length === 0) continue
            const latest = list[list.length - 1]
            nextParticipants.push({
              id: latest.userId,
              name: latest.name || 'Wavelength Explorer',
              initials: latest.initials || 'WE',
              avatarUrl: latest.avatarUrl ?? null,
              colorSeed: latest.colorSeed ?? Math.abs(latest.userId.charCodeAt(0)) % 12,
              isSelf: latest.userId === user.id,
              presenceState: 'active',
              isMuted: latest.isMuted,
              hasVideo: latest.hasVideo,
              handRaised: latest.handRaised,
            })
          }

          setParticipants(nextParticipants)

          // Check if peers need WebRTC offer:
          // Polite initiator: if our user ID is lexicographically greater, initiate offer to the other peer
          nextParticipants.forEach((p) => {
            if (p.id !== user.id && user.id > p.id) {
              if (!peerConnectionsRef.current.has(p.id)) {
                const pc = createPeerConnection(p.id)
                pc.createOffer()
                  .then((offer) => pc.setLocalDescription(offer).then(() => offer))
                  .then((offer) => {
                    channel.send({
                      type: 'broadcast',
                      event: 'webrtc-offer',
                      payload: {
                        fromUserId: user.id,
                        toUserId: p.id,
                        sdp: offer,
                      },
                    })
                  })
                  .catch(console.error)
              }
            }
          })
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          if (!isSubscribed) return
          for (const p of leftPresences as unknown as Array<{ userId: string }>) {
            if (p.userId && p.userId !== user.id) {
              cleanupPeer(p.userId)
            }
          }
        })

      // ── WEBRTC SIGNALING (BROADCAST) ────────────────────────────────────────
      channel
        .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
          if (!isSubscribed || payload.toUserId !== user.id) return
          const { fromUserId, sdp } = payload
          const pc = createPeerConnection(fromUserId)

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            // Process queued candidates if any
            const peerData = peerConnectionsRef.current.get(fromUserId)
            if (peerData?.iceCandidatesQueue.length) {
              for (const cand of peerData.iceCandidatesQueue) {
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
              }
              peerData.iceCandidatesQueue = []
            }

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            channel.send({
              type: 'broadcast',
              event: 'webrtc-answer',
              payload: {
                fromUserId: user.id,
                toUserId: fromUserId,
                sdp: answer,
              },
            })
          } catch (err) {
            console.error('[WebRTC] Error handling offer:', err)
          }
        })
        .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
          if (!isSubscribed || payload.toUserId !== user.id) return
          const { fromUserId, sdp } = payload
          const peer = peerConnectionsRef.current.get(fromUserId)
          if (!peer) return

          try {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp))
            if (peer.iceCandidatesQueue.length) {
              for (const cand of peer.iceCandidatesQueue) {
                await peer.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
              }
              peer.iceCandidatesQueue = []
            }
          } catch (err) {
            console.error('[WebRTC] Error handling answer:', err)
          }
        })
        .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
          if (!isSubscribed || payload.toUserId !== user.id) return
          const { fromUserId, candidate } = payload
          const peer = peerConnectionsRef.current.get(fromUserId)
          if (!peer) return

          try {
            if (peer.pc.remoteDescription) {
              await peer.pc.addIceCandidate(new RTCIceCandidate(candidate))
            } else {
              peer.iceCandidatesQueue.push(candidate)
            }
          } catch (err) {
            console.warn('[WebRTC] Failed to add ICE candidate:', err)
          }
        })

      // ── EPHEMERAL THOUGHTS & INTERACTIONS (BROADCAST) ──────────────────────
      channel
        .on('broadcast', { event: 'ephemeral-thought' }, ({ payload }) => {
          if (!isSubscribed || !payload) return
          setThoughts((prev) => {
            if (prev.some((t) => t.id === payload.id)) return prev
            return [...prev, payload as Thought]
          })
        })
        .on('broadcast', { event: 'ephemeral-reaction' }, ({ payload }) => {
          if (!isSubscribed || !payload) return
          const rx: FloatingReaction = {
            id: payload.id || `rx_${Date.now()}_${Math.random()}`,
            emoji: payload.emoji,
            authorName: payload.authorName || 'Peer',
            colorSeed: payload.colorSeed ?? 0,
          }
          setFloatingReactions((prev) => [...prev, rx])
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== rx.id))
          }, 3500)
        })
        .on('broadcast', { event: 'whiteboard-stroke' }, ({ payload }) => {
          if (!isSubscribed || !payload || payload.participantId === user.id) return
          onWhiteboardStrokeRef.current?.(payload as WhiteboardStroke)
        })
        .on('broadcast', { event: 'room-ended' }, () => {
          setHasEnded(true)
        })

      // ── SUBSCRIBE & INITIAL PRESENCE TRACK ──────────────────────────────────
      channel.subscribe(async (status) => {
        if (!isSubscribed) return
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          await channel.track({
            userId: user.id,
            name: profile.displayName || 'Wave Rider',
            initials: profile.initials || 'WR',
            avatarUrl: profile.avatarUrl ?? null,
            isMuted: true,
            hasVideo: roomType === 'video',
            handRaised: false,
            colorSeed: Math.abs(user.id.charCodeAt(0)) % 12,
            joinedAt: Date.now(),
          })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error')
        }
      })
    })

    // ── CLEANUP ON UNMOUNT ──────────────────────────────────────────────────
    return () => {
      isSubscribed = false

      // Clear audio analyser
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current)
        speakingIntervalRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }

      // Stop local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
        setLocalStream(null)
      }

      // Close all peer connections
      for (const { pc } of peerConnectionsRef.current.values()) {
        try {
          pc.close()
        } catch {}
      }
      peerConnectionsRef.current.clear()
      setRemoteStreams(new Map())

      // Untrack and completely remove channel from Supabase client
      if (channelRef.current) {
        channelRef.current.untrack().catch(() => {})
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [roomId, enabled, user?.id, roomType])

  // ── 5. Track State Helpers ────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      const nextMuted = audioTrack.enabled
      audioTrack.enabled = !nextMuted
      setIsMuted(nextMuted)

      // Update Presence
      if (channelRef.current && user && profile) {
        channelRef.current.track({
          userId: user.id,
          name: profile.displayName,
          initials: profile.initials,
          avatarUrl: profile.avatarUrl,
          isMuted: nextMuted,
          hasVideo: isCameraOn,
          handRaised,
          colorSeed: Math.abs(user.id.charCodeAt(0)) % 12,
        })
      }
    }
  }, [isCameraOn, handRaised, user, profile])

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return
    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      const nextCameraOn = !videoTrack.enabled
      videoTrack.enabled = nextCameraOn
      setIsCameraOn(nextCameraOn)

      // Update Presence
      if (channelRef.current && user && profile) {
        channelRef.current.track({
          userId: user.id,
          name: profile.displayName,
          initials: profile.initials,
          avatarUrl: profile.avatarUrl,
          isMuted,
          hasVideo: nextCameraOn,
          handRaised,
          colorSeed: Math.abs(user.id.charCodeAt(0)) % 12,
        })
      }
    }
  }, [isMuted, handRaised, user, profile])

  const toggleHand = useCallback(() => {
    const nextHand = !handRaised
    setHandRaised(nextHand)
    if (channelRef.current && user && profile) {
      channelRef.current.track({
        userId: user.id,
        name: profile.displayName,
        initials: profile.initials,
        avatarUrl: profile.avatarUrl,
        isMuted,
        hasVideo: isCameraOn,
        handRaised: nextHand,
        colorSeed: Math.abs(user.id.charCodeAt(0)) % 12,
      })
    }
  }, [handRaised, isMuted, isCameraOn, user, profile])

  // ── 6. Ephemeral Interaction Dispatches ────────────────────────────────────
  const sendThought = useCallback((text: string, type: ThoughtType = 'thought') => {
    if (!text.trim() || !user || !profile) return
    const newThought: Thought = {
      id: `thought_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      authorId: user.id,
      authorName: profile.displayName,
      authorInitials: profile.initials,
      authorAvatar: profile.avatarUrl,
      type,
      text: text.trim(),
      createdAt: Date.now(),
      reactions: [],
    }

    setThoughts((prev) => [...prev, newThought])

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'ephemeral-thought',
        payload: newThought,
      })
    }
  }, [user, profile])

  const sendReaction = useCallback((emoji: string) => {
    if (!user || !profile) return
    const rx: FloatingReaction = {
      id: `rx_${Date.now()}_${Math.random()}`,
      emoji,
      authorName: profile.displayName,
      colorSeed: Math.abs(user.id.charCodeAt(0)) % 12,
    }

    setFloatingReactions((prev) => [...prev, rx])
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== rx.id))
    }, 3500)

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'ephemeral-reaction',
        payload: rx,
      })
    }
  }, [user, profile])

  const broadcastWhiteboardStroke = useCallback((stroke: WhiteboardStroke) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard-stroke',
        payload: stroke,
      })
    }
  }, [])

  // ── 7. Lobby Room Advertisement ──────────────────────────────────────────
  const lobbyAdRef = useRef<ReturnType<typeof advertiseRoomInLobby> | null>(null)

  useEffect(() => {
    if (!roomId || !enabled || !user || !profile || hasEnded) return

    const ad = advertiseRoomInLobby({
      roomId,
      title: roomTitle || 'Wavelength Space',
      roomType,
      category: (roomCategory as Category) || 'Tech',
      creatorId: user.id,
      creatorName: profile.displayName || user.email?.split('@')[0] || 'Wave Rider',
      creatorAvatar: profile.avatarUrl ?? null,
      creatorInitials: profile.initials || 'WR',
      createdAt: new Date().toISOString(),
      capacity: 32,
      currentPresenceCount: Math.max(1, participants.length),
    })
    lobbyAdRef.current = ad

    return () => {
      ad.cleanup()
      lobbyAdRef.current = null
    }
  }, [roomId, enabled, user, profile, roomTitle, roomType, roomCategory, hasEnded])

  // Keep participant count synced in lobby advertisement
  useEffect(() => {
    if (lobbyAdRef.current) {
      lobbyAdRef.current.updateCount(Math.max(1, participants.length))
    }
  }, [participants.length])

  const endRoom = useCallback(() => {
    setHasEnded(true)
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'room-ended',
          payload: { roomId },
        })
      } catch {}
    }
    if (lobbyAdRef.current) {
      lobbyAdRef.current.cleanup()
      lobbyAdRef.current = null
    }
  }, [roomId])

  return {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOn,
    isSpeaking,
    handRaised,
    micPermission,
    cameraPermission,
    toggleMic,
    toggleCamera,
    toggleHand,
    participants,
    thoughts,
    floatingReactions,
    sendThought,
    sendReaction,
    broadcastWhiteboardStroke,
    setOnWhiteboardStroke: (fn: (stroke: WhiteboardStroke) => void) => {
      onWhiteboardStrokeRef.current = fn
    },
    connectionStatus,
    hasEnded,
    endRoom,
  }
}
