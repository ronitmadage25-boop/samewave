import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

// Add TURN server if configured
const turnUrl = import.meta.env.VITE_TURN_SERVER_URL
if (turnUrl) {
  ICE_SERVERS.push({
    urls: turnUrl,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  })
}

export type MediaPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

interface PeerConnection {
  peerId: string
  pc: RTCPeerConnection
  remoteStream: MediaStream
}

interface UseWebRTCOptions {
  roomId: string | undefined
  mode: 'audio' | 'video'
  enabled: boolean
}

interface UseWebRTCReturn {
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  isMuted: boolean
  isCameraOn: boolean
  micPermission: MediaPermissionState
  cameraPermission: MediaPermissionState
  toggleMic: () => void
  toggleCamera: () => void
  cleanup: () => void
  isSpeaking: boolean
}

/**
 * useWebRTC
 *
 * Manages real WebRTC audio/video between participants in a room.
 * Uses Supabase Realtime as the signaling channel.
 *
 * Architecture: Full mesh (each peer connects to every other peer).
 * Works best for rooms up to ~8 participants.
 *
 * Signaling flow:
 * 1. New peer joins → sends 'offer' to all existing peers
 * 2. Existing peers respond with 'answer'
 * 3. ICE candidates exchanged via 'ice-candidate' events
 * 4. Peers connect directly via WebRTC data channels
 */
export function useWebRTC({ roomId, mode, enabled }: UseWebRTCOptions): UseWebRTCReturn {
  const user = useAppStore((s) => s.user)
  const toggleMuteSelf = useAppStore((s) => s.toggleMuteSelf)
  const toggleVideoSelf = useAppStore((s) => s.toggleVideoSelf)
  const setParticipantSpeaking = useAppStore((s) => s.setParticipantSpeaking)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isMuted, setIsMuted] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [micPermission, setMicPermission] = useState<MediaPermissionState>('idle')
  const [cameraPermission, setCameraPermission] = useState<MediaPermissionState>('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)

  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = useCallback(async () => {
    if (!enabled || !roomId) return

    const constraints: MediaStreamConstraints = mode === 'video'
      ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } }
      : { audio: true, video: false }

    setMicPermission('requesting')
    if (mode === 'video') setCameraPermission('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      setMicPermission('granted')
      if (mode === 'video') setCameraPermission('granted')

      // Start muted by default
      stream.getAudioTracks().forEach(track => { track.enabled = false })
      setIsMuted(true)

      if (mode === 'video') {
        stream.getVideoTracks().forEach(track => { track.enabled = false })
        setIsCameraOn(false)
      }

      // Set up speaking detection
      setupSpeakingDetection(stream)

      // Add tracks to existing peer connections
      for (const { pc } of peerConnectionsRef.current.values()) {
        stream.getTracks().forEach(track => {
          const senders = pc.getSenders()
          const existingSender = senders.find(s => s.track?.kind === track.kind)
          if (existingSender) {
            existingSender.replaceTrack(track)
          } else {
            pc.addTrack(track, stream)
          }
        })
      }

      return stream
    } catch (err) {
      const error = err as Error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermission('denied')
        if (mode === 'video') setCameraPermission('denied')
      } else if (error.name === 'NotFoundError') {
        setMicPermission('unavailable')
        if (mode === 'video') setCameraPermission('unavailable')
      } else {
        setMicPermission('unavailable')
        if (mode === 'video') setCameraPermission('unavailable')
      }
      console.error('[WebRTC] getUserMedia failed:', error)
      return null
    }
  }, [enabled, roomId, mode])

  // ── Speaking detection via Web Audio API ─────────────────────────────────
  const setupSpeakingDetection = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      speakingIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const speaking = avg > 20

        setIsSpeaking(speaking)
        if (user) {
          setParticipantSpeaking(user.id, speaking)
        }
      }, 200)
    } catch (e) {
      console.warn('[WebRTC] speaking detection unavailable:', e)
    }
  }

  // ── Create peer connection ────────────────────────────────────────────────
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const remoteStream = new MediaStream()

    // Add local tracks if we have them
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track)
      })
      setRemoteStreams(prev => {
        const next = new Map(prev)
        next.set(peerId, remoteStream)
        return next
      })
    }

    // Send ICE candidates via signaling channel
    pc.onicecandidate = (event) => {
      if (!event.candidate || !signalingChannelRef.current) return
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          fromId: user?.id,
          toId: peerId,
          candidate: event.candidate.toJSON(),
        },
      })
    }

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection with ${peerId}: ${pc.connectionState}`)
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Remove disconnected peer
        cleanupPeer(peerId)
      }
    }

    peerConnectionsRef.current.set(peerId, { peerId, pc, remoteStream })
    return pc
  }, [user?.id])

  // ── Clean up a single peer ────────────────────────────────────────────────
  const cleanupPeer = useCallback((peerId: string) => {
    const peer = peerConnectionsRef.current.get(peerId)
    if (peer) {
      peer.pc.close()
      peerConnectionsRef.current.delete(peerId)
    }
    setRemoteStreams(prev => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  // ── Signaling setup ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !user || !enabled) return

    const channel = supabase.channel(`room:${roomId}:webrtc`)

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.toId !== user.id) return

        const peerId = payload.fromId
        let pc = peerConnectionsRef.current.get(peerId)?.pc
        if (!pc) {
          pc = createPeerConnection(peerId)
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            fromId: user.id,
            toId: peerId,
            sdp: answer,
          },
        })
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.toId !== user.id) return

        const peer = peerConnectionsRef.current.get(payload.fromId)
        if (!peer) return

        await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.toId !== user.id) return

        const peer = peerConnectionsRef.current.get(payload.fromId)
        if (!peer) return

        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } catch (e) {
          console.warn('[WebRTC] Failed to add ICE candidate:', e)
        }
      })
      .on('broadcast', { event: 'peer-joined' }, async ({ payload }) => {
        if (payload.peerId === user.id) return

        // New peer joined — initiate offer
        const pc = createPeerConnection(payload.peerId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            fromId: user.id,
            toId: payload.peerId,
            sdp: offer,
          },
        })
      })
      .on('broadcast', { event: 'peer-left' }, ({ payload }) => {
        if (payload.peerId !== user.id) {
          cleanupPeer(payload.peerId)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Get media first
          await getMedia()

          // Announce our presence to trigger offers from existing peers
          channel.send({
            type: 'broadcast',
            event: 'peer-joined',
            payload: { peerId: user.id },
          })
        }
      })

    signalingChannelRef.current = channel

    return () => {
      // Announce departure
      channel.send({
        type: 'broadcast',
        event: 'peer-left',
        payload: { peerId: user.id },
      })
      channel.unsubscribe()
      signalingChannelRef.current = null
    }
  }, [roomId, user?.id, enabled])

  // ── Cleanup all on unmount ────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    // Close all peer connections
    for (const { pc } of peerConnectionsRef.current.values()) {
      pc.close()
    }
    peerConnectionsRef.current.clear()
    setRemoteStreams(new Map())

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current)
      speakingIntervalRef.current = null
    }

    setMicPermission('idle')
    setCameraPermission('idle')
    setIsMuted(true)
    setIsCameraOn(false)
    setIsSpeaking(false)
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      // Try to get mic access if not yet granted
      getMedia()
      return
    }

    const newMuted = !isMuted
    audioTracks.forEach(track => {
      track.enabled = !newMuted
    })
    setIsMuted(newMuted)
    toggleMuteSelf()
  }, [isMuted, getMedia, toggleMuteSelf])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return

    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length === 0) return

    const newCameraOn = !isCameraOn
    videoTracks.forEach(track => {
      track.enabled = newCameraOn
    })
    setIsCameraOn(newCameraOn)
    toggleVideoSelf()
  }, [isCameraOn, toggleVideoSelf])

  return {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOn,
    micPermission,
    cameraPermission,
    toggleMic,
    toggleCamera,
    cleanup,
    isSpeaking,
  }
}
