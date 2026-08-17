import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { voiceController } from '../../utils/voiceController';
import { Volume2, VolumeX, Mic, Gauge } from 'lucide-react';

export interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const { voiceEnabled, soundVolume, voiceRate, setVoiceEnabled, setSoundVolume, setVoiceRate } =
    useGameStore();

  const handleTestVoice = () => {
    voiceController.speakCustom(`Welcome to Bingo Arena! Number G 42 called.`, soundVolume);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audio & Voice Announcer" description="Customize voice calling and in-game audio options">
      <div className="space-y-6 pt-2">
        {/* Toggle Voice Calling */}
        <div className="flex items-center justify-between p-3.5 bg-arena-elevated rounded-xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-arena-surface text-arena-primary">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Voice Number Calling</div>
              <div className="text-xs text-arena-muted">Speaks out called balls e.g. "B 12", "G 42"</div>
            </div>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              voiceEnabled ? 'bg-arena-primary justify-end' : 'bg-arena-border justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-arena-muted">
            <span className="flex items-center gap-1.5">
              {soundVolume > 0 ? <Volume2 className="w-4 h-4 text-arena-primary" /> : <VolumeX className="w-4 h-4 text-arena-danger" />}
              Announcement Volume
            </span>
            <span className="text-white font-mono">{Math.round(soundVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundVolume}
            onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-arena-elevated rounded-lg appearance-none cursor-pointer accent-arena-primary"
          />
        </div>

        {/* Voice Rate / Speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-arena-muted">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-arena-primary" />
              Speech Speed
            </span>
            <span className="text-white font-mono">{voiceRate}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={voiceRate}
            onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-arena-elevated rounded-lg appearance-none cursor-pointer accent-arena-primary"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-arena-border">
          <Button variant="outline" size="sm" onClick={handleTestVoice}>
            Test Voice
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Save & Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
