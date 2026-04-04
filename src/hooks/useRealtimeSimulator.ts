import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSimulatorStore, Vitals, EmergencyState } from '@/stores/simulatorStore';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeSimulator() {
  const { roomCode, role, vitals, emergencies, updateVitals, updateEmergencies } = useSimulatorStore();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    if (!roomCode || !role) return;

    // Clean up any existing channel with the same name to prevent React StrictMode duplicate presence errors
    const channelName = `room:${roomCode}`;
    const existing = supabase.getChannels().find(c => c.topic === channelName);
    if (existing) {
       supabase.removeChannel(existing);
    }

    // Create a unique channel for this room
    const roomChannel = supabase.channel(channelName, {
      config: {
        presence: { key: role },
        broadcast: { self: false }
      }
    });

    setChannel(roomChannel);

    // Listen for Presence state (who is in the room)
    roomChannel.on('presence', { event: 'sync' }, () => {
      const state = roomChannel.presenceState();
      // Count how many users are present (excluding ourselves if we want, or total)
      const count = Object.keys(state).length;
      setPeers(count);
    });

    // Listen for Broadcast messages
    roomChannel.on('broadcast', { event: 'state_sync' }, (payload) => {
      if (role === 'trainee') {
        // Instructor sent updated vitals/emergencies
        if (payload.payload.vitals) updateVitals(payload.payload.vitals);
        if (payload.payload.emergencies) updateEmergencies(payload.payload.emergencies);
      }
    });

    roomChannel.on('broadcast', { event: 'instructor_action' }, (payload) => {
      if (role === 'trainee') {
        if (payload.payload.actionType === 'show_imaging') {
           useSimulatorStore.getState().setRemoteImagingUrl(payload.payload.url);
        }
      }
    });

    roomChannel.on('broadcast', { event: 'trainee_action' }, (payload) => {
      if (role === 'instructor') {
        const { actionType, payload: actionData } = payload.payload;
        const state = useSimulatorStore.getState();
        
        switch (actionType) {
           case 'shock_delivered':
              state.addSystemLog(`DEFIB: Shock delivered at ${actionData.joules}J (Sync: ${actionData.syncOn ? 'ON' : 'OFF'})`);
              if (state.emergencies.isVF || state.emergencies.isVT) {
                  state.updateEmergencies({ isVF: false, isVT: false });
                  state.addSystemLog(`SYSTEM: Shock corrected VF/VT rhythm.`);
              }
              break;
           case 'charge_started':
              state.addSystemLog(`DEFIB: Charging to ${actionData.joules}J...`);
              break;
           case 'charge_ready':
              state.addSystemLog(`DEFIB: Charged and ready at ${actionData.joules}J`);
              break;
           case 'nibp_started':
              state.addSystemLog(`NIBP: Manual measurement started`);
              break;
           case 'pacer_started':
              state.addSystemLog(`PACER: Activated at ${actionData.rate} BPM, ${actionData.output}mA`);
              break;
           case 'pacer_stopped':
              state.addSystemLog(`PACER: Deactivated`);
              break;
           case 'cpr_started':
              state.addSystemLog(`CPR: Chest compressions started`);
              break;
           case 'cpr_stopped':
              state.addSystemLog(`CPR: Chest compressions stopped`);
              break;
           default:
              state.addSystemLog(`TRAINEE ACT: ${actionType}`);
        }
      }
    });

    // Subscribe to the channel
    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        // Track presence so others know we're here
        roomChannel.track({ role, joinedAt: new Date().toISOString() });
      } else {
        setIsConnected(false);
      }
    });

    return () => {
      supabase.removeChannel(roomChannel);
      setChannel(null);
      setIsConnected(false);
    };
  }, [roomCode, role, updateVitals, updateEmergencies]);

  // Helper to broadcast state to the trainee
  const broadcastState = (newVitals?: Partial<Vitals>, newEmergencies?: Partial<EmergencyState>) => {
    if (channel && role === 'instructor') {
      channel.send({
        type: 'broadcast',
        event: 'state_sync',
        payload: {
          vitals: newVitals,
          emergencies: newEmergencies
        }
      });
    }
  };

  // Helper to broadcast actions from trainee to instructor (for logs)
  const sendTraineeAction = (actionType: string, details: any) => {
    if (channel && role === 'trainee') {
      channel.send({
        type: 'broadcast',
        event: 'trainee_action',
        payload: { actionType, details, timestamp: new Date().toISOString() }
      });
    }
  };

  // Helper to broadcast generic actions from instructor to trainee
  const broadcastAction = (actionType: string, payload: any) => {
    if (channel && role === 'instructor') {
      channel.send({
        type: 'broadcast',
        event: 'instructor_action',
        payload: { actionType, ...payload, timestamp: new Date().toISOString() }
      });
    }
  };

  return { isConnected, peers, broadcastState, sendTraineeAction, broadcastAction };
}
