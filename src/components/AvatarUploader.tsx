import { useRef, type ChangeEvent } from 'react';
import { Camera } from 'lucide-react';

interface AvatarUploaderProps {
  value: string;
  onChange: (dataUrl: string) => void;
  size?: number;
}

export function AvatarUploader({ value, onChange, size = 120 }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative rounded-full overflow-hidden border-2 border-lime-400/30 transition-all active:scale-95"
        style={{ width: size, height: size }}
      >
        {value ? (
          <img src={value} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-ink-700 flex items-center justify-center">
            <Camera size={size * 0.25} className="text-lime-400/50" />
          </div>
        )}
        <div className="absolute inset-0 ring-2 ring-lime-400/20 rounded-full" />
      </button>
      <span className="text-xs text-white/40 font-medium">Tap to upload photo</span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
